import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const COLUMNS_COLLECTION = 'v5department_columns';
const PROJECTS_COLLECTION = 'v5projects';
const DEPARTMENTS_COLLECTION = 'v5departments';

// Built-in templates
const BUILTIN_TEMPLATES: Record<string, { columns: { id: string; name: string; order: number; color: string }[]; sampleTasks: { title: string; description: string; priority: string; status: string }[] }> = {
  'software-development': {
    columns: [
      { id: 'backlog', name: 'Backlog', order: 0, color: '#6b7280' },
      { id: 'todo', name: 'To Do', order: 1, color: '#fbbf24' },
      { id: 'in_progress', name: 'In Progress', order: 2, color: '#8b5cf6' },
      { id: 'review', name: 'Review', order: 3, color: '#3b82f6' },
      { id: 'done', name: 'Done', order: 4, color: '#22c55e' },
    ],
    sampleTasks: [
      { title: 'Set up project repository', description: 'Initialize Git repo and project structure', priority: 'high', status: 'backlog' },
      { title: 'Define project requirements', description: 'Document initial requirements and scope', priority: 'urgent', status: 'backlog' },
      { title: 'Design system architecture', description: 'Create architecture diagrams and tech stack decisions', priority: 'high', status: 'todo' },
    ],
  },
  'content-creation': {
    columns: [
      { id: 'ideas', name: 'Ideas', order: 0, color: '#fbbf24' },
      { id: 'writing', name: 'Writing', order: 1, color: '#f97316' },
      { id: 'editing', name: 'Editing', order: 2, color: '#8b5cf6' },
      { id: 'ready', name: 'Ready to Publish', order: 3, color: '#3b82f6' },
      { id: 'published', name: 'Published', order: 4, color: '#22c55e' },
    ],
    sampleTasks: [],
  },
  'marketing-campaign': {
    columns: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6b7280' },
      { id: 'creating', name: 'Creating', order: 1, color: '#f97316' },
      { id: 'approval', name: 'Approval', order: 2, color: '#fbbf24' },
      { id: 'live', name: 'Live', order: 3, color: '#22c55e' },
      { id: 'complete', name: 'Complete', order: 4, color: '#3b82f6' },
    ],
    sampleTasks: [],
  },
  'simple-kanban': {
    columns: [
      { id: 'todo', name: 'To Do', order: 0, color: '#fbbf24' },
      { id: 'doing', name: 'Doing', order: 1, color: '#8b5cf6' },
      { id: 'done', name: 'Done', order: 2, color: '#22c55e' },
    ],
    sampleTasks: [],
  },
  'bug-tracking': {
    columns: [
      { id: 'new', name: 'New', order: 0, color: '#ef4444' },
      { id: 'investigating', name: 'Investigating', order: 1, color: '#f97316' },
      { id: 'fixing', name: 'Fixing', order: 2, color: '#fbbf24' },
      { id: 'testing', name: 'Testing', order: 3, color: '#3b82f6' },
      { id: 'resolved', name: 'Resolved', order: 4, color: '#22c55e' },
    ],
    sampleTasks: [],
  },
};

async function getUserFromRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { _id: string; isSuperUser?: boolean };
    return decoded;
  } catch {
    return null;
  }
}

// POST - Apply a template to a department
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { templateId, departmentId, includeSampleTasks } = body;

    if (!templateId || !departmentId) {
      return NextResponse.json({ error: 'Template ID and Department ID are required' }, { status: 400 });
    }

    const db = await getDatabase();

    // Check if user is admin of this department
    const department = await db.collection(DEPARTMENTS_COLLECTION).findOne({
      _id: new ObjectId(departmentId),
    });

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    if (!user.isSuperUser && !department.adminIds.includes(user._id)) {
      return NextResponse.json({ error: 'Not authorized to modify this department' }, { status: 403 });
    }

    // Get template (check built-in first, then database)
    let template = BUILTIN_TEMPLATES[templateId];

    if (!template) {
      const dbTemplate = await db.collection('v5board_templates').findOne({
        $or: [
          { id: templateId },
          { _id: new ObjectId(templateId) },
        ],
      });

      if (!dbTemplate) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      template = {
        columns: dbTemplate.columns,
        sampleTasks: dbTemplate.sampleTasks || [],
      };
    }

    // Apply columns to department
    await db.collection(COLUMNS_COLLECTION).updateOne(
      { departmentId },
      {
        $set: {
          departmentId,
          columns: template.columns,
          updatedAt: new Date().toISOString(),
        },
        $setOnInsert: {
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );

    // Create sample tasks if requested
    let createdTasks = 0;
    if (includeSampleTasks && template.sampleTasks.length > 0) {
      const now = new Date().toISOString();

      for (const sampleTask of template.sampleTasks) {
        // Get max order for the status
        const maxOrderResult = await db.collection(PROJECTS_COLLECTION)
          .find({ departmentId, status: sampleTask.status })
          .sort({ order: -1 })
          .limit(1)
          .toArray();

        const nextOrder = maxOrderResult.length > 0 ? (maxOrderResult[0].order || 0) + 1 : 0;

        await db.collection(PROJECTS_COLLECTION).insertOne({
          departmentId,
          title: sampleTask.title,
          description: sampleTask.description,
          status: sampleTask.status,
          priority: sampleTask.priority,
          assigneeId: null,
          assigneeIds: [],
          createdBy: user._id,
          dueDate: null,
          labels: [],
          subtasks: [],
          attachments: [],
          comments: [],
          activityLog: [{
            id: new ObjectId().toString(),
            userId: 'system',
            userName: 'System',
            action: 'created',
            details: 'Created from template',
            timestamp: now,
          }],
          order: nextOrder,
          metadata: {
            createdAt: now,
            updatedAt: now,
          },
        });

        createdTasks++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Template applied successfully${createdTasks > 0 ? `. Created ${createdTasks} sample tasks.` : ''}`,
      data: {
        columns: template.columns,
        tasksCreated: createdTasks,
      },
    });
  } catch (error) {
    console.error('Apply template error:', error);
    return NextResponse.json({ error: 'Failed to apply template' }, { status: 500 });
  }
}
