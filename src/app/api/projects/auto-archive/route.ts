import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const COLLECTION_NAME = 'v5projects';
const USERS_COLLECTION = 'v5users';

// Auto-archive tasks that have been in "done" status for more than 2 days

// Get user info from token
async function getUserFromRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { _id: string };

    const db = await getDatabase();
    const user = await db.collection(USERS_COLLECTION).findOne({ _id: new ObjectId(decoded._id) });

    if (!user) return null;

    return {
      userId: user._id.toString(),
      userName: user.name || user.email,
    };
  } catch {
    return null;
  }
}

// POST - Auto-archive old done tasks
export async function POST(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDatabase();
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    // Find all tasks that:
    // 1. Are in "done" status
    // 2. Have completedAt set and it's more than 2 days ago
    // OR
    // 3. Are in "done" status with no completedAt but updatedAt is more than 2 days ago (legacy tasks)
    const tasksToArchive = await db.collection(COLLECTION_NAME).find({
      status: 'done',
      $or: [
        // Tasks with completedAt timestamp
        { completedAt: { $lt: twoDaysAgo.toISOString() } },
        // Legacy tasks without completedAt - use updatedAt
        {
          completedAt: { $exists: false },
          'metadata.updatedAt': { $lt: twoDaysAgo.toISOString() }
        },
        {
          completedAt: null,
          'metadata.updatedAt': { $lt: twoDaysAgo.toISOString() }
        }
      ]
    }).toArray();

    if (tasksToArchive.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tasks to archive',
        archived: 0,
      });
    }

    const nowIso = now.toISOString();

    // Archive each task
    const archivePromises = tasksToArchive.map(task => {
      const activityEntry = {
        id: new ObjectId().toString(),
        userId: 'system',
        userName: 'System',
        action: 'auto-archived',
        details: 'Automatically archived after 2 days in Done',
        timestamp: nowIso,
      };

      return db.collection(COLLECTION_NAME).updateOne(
        { _id: task._id },
        {
          $set: {
            status: 'archived',
            previousStatus: 'done',
            archivedAt: nowIso,
            archivedBy: 'system',
            'metadata.updatedAt': nowIso,
          },
          $push: {
            activityLog: activityEntry as never
          }
        }
      );
    });

    await Promise.all(archivePromises);

    return NextResponse.json({
      success: true,
      message: `Archived ${tasksToArchive.length} task(s)`,
      archived: tasksToArchive.length,
    });
  } catch (error) {
    console.error('Auto-archive error:', error);
    return NextResponse.json({ error: 'Failed to auto-archive tasks' }, { status: 500 });
  }
}
