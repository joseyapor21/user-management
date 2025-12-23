import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const COLLECTION_NAME = 'v5projects';

function calculateNextDueDate(currentDueDate: string, recurrenceType: string): string {
  const date = new Date(currentDueDate);

  switch (recurrenceType) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      return currentDueDate;
  }

  return date.toISOString();
}

// POST - Generate recurring task instances
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET);

    const db = await getDatabase();
    const now = new Date();

    // Find all recurring tasks that need new instances
    const recurringTasks = await db.collection(COLLECTION_NAME).find({
      'recurrence.type': { $ne: 'none', $exists: true },
      status: 'done', // Only generate new instances when current one is completed
      $or: [
        { 'recurrence.endDate': null },
        { 'recurrence.endDate': { $gte: now.toISOString() } },
      ],
    }).toArray();

    const createdTasks = [];

    for (const task of recurringTasks) {
      // Calculate the next due date
      const nextDueDate = calculateNextDueDate(
        task.dueDate || now.toISOString(),
        task.recurrence.type
      );

      // Check if end date has passed
      if (task.recurrence.endDate && new Date(nextDueDate) > new Date(task.recurrence.endDate)) {
        continue;
      }

      // Get max order for the status
      const maxOrderResult = await db.collection(COLLECTION_NAME)
        .find({ departmentId: task.departmentId, status: 'todo' })
        .sort({ order: -1 })
        .limit(1)
        .toArray();

      const nextOrder = maxOrderResult.length > 0 ? (maxOrderResult[0].order || 0) + 1 : 0;

      // Create new task instance
      const newTask = {
        departmentId: task.departmentId,
        title: task.title,
        description: task.description,
        status: 'todo', // Reset to todo
        priority: task.priority,
        assigneeId: task.assigneeId,
        assigneeIds: task.assigneeIds || [],
        createdBy: task.createdBy,
        dueDate: nextDueDate,
        labels: task.labels || [],
        subtasks: (task.subtasks || []).map((s: { id: string; title: string }) => ({
          id: new ObjectId().toString(),
          title: s.title,
          completed: false,
        })),
        attachments: [],
        comments: [],
        activityLog: [{
          id: new ObjectId().toString(),
          userId: 'system',
          userName: 'System',
          action: 'created',
          details: `Recurring task auto-generated from "${task.title}"`,
          timestamp: now.toISOString(),
        }],
        estimatedHours: task.estimatedHours,
        loggedHours: 0,
        blockedBy: task.blockedBy || [],
        recurrence: task.recurrence,
        parentRecurringId: task._id.toString(),
        order: nextOrder,
        metadata: {
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      };

      const result = await db.collection(COLLECTION_NAME).insertOne(newTask);

      // Update original task's recurrence lastGenerated
      await db.collection(COLLECTION_NAME).updateOne(
        { _id: task._id },
        {
          $set: {
            'recurrence.lastGenerated': now.toISOString(),
            'metadata.updatedAt': now.toISOString(),
          }
        }
      );

      createdTasks.push({
        id: result.insertedId.toString(),
        title: newTask.title,
        dueDate: newTask.dueDate,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${createdTasks.length} recurring task(s)`,
      data: createdTasks,
    });
  } catch (error) {
    console.error('Process recurring tasks error:', error);
    return NextResponse.json({ error: 'Failed to process recurring tasks' }, { status: 500 });
  }
}
