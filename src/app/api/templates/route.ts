import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const COLLECTION_NAME = 'v5board_templates';

// Default templates
const DEFAULT_TEMPLATES = [
  {
    id: 'software-development',
    name: 'Software Development',
    description: 'Standard columns for software projects: Backlog, To Do, In Progress, Review, Done',
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
    isGlobal: true,
    createdBy: 'system',
  },
  {
    id: 'content-creation',
    name: 'Content Creation',
    description: 'Pipeline for content: Ideas, Writing, Editing, Ready to Publish, Published',
    columns: [
      { id: 'ideas', name: 'Ideas', order: 0, color: '#fbbf24' },
      { id: 'writing', name: 'Writing', order: 1, color: '#f97316' },
      { id: 'editing', name: 'Editing', order: 2, color: '#8b5cf6' },
      { id: 'ready', name: 'Ready to Publish', order: 3, color: '#3b82f6' },
      { id: 'published', name: 'Published', order: 4, color: '#22c55e' },
    ],
    sampleTasks: [],
    isGlobal: true,
    createdBy: 'system',
  },
  {
    id: 'marketing-campaign',
    name: 'Marketing Campaign',
    description: 'Campaign workflow: Planning, Creating, Approval, Live, Complete',
    columns: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6b7280' },
      { id: 'creating', name: 'Creating', order: 1, color: '#f97316' },
      { id: 'approval', name: 'Approval', order: 2, color: '#fbbf24' },
      { id: 'live', name: 'Live', order: 3, color: '#22c55e' },
      { id: 'complete', name: 'Complete', order: 4, color: '#3b82f6' },
    ],
    sampleTasks: [],
    isGlobal: true,
    createdBy: 'system',
  },
  {
    id: 'simple-kanban',
    name: 'Simple Kanban',
    description: 'Basic three-column board: To Do, Doing, Done',
    columns: [
      { id: 'todo', name: 'To Do', order: 0, color: '#fbbf24' },
      { id: 'doing', name: 'Doing', order: 1, color: '#8b5cf6' },
      { id: 'done', name: 'Done', order: 2, color: '#22c55e' },
    ],
    sampleTasks: [],
    isGlobal: true,
    createdBy: 'system',
  },
  {
    id: 'bug-tracking',
    name: 'Bug Tracking',
    description: 'Track bugs: New, Investigating, Fixing, Testing, Resolved',
    columns: [
      { id: 'new', name: 'New', order: 0, color: '#ef4444' },
      { id: 'investigating', name: 'Investigating', order: 1, color: '#f97316' },
      { id: 'fixing', name: 'Fixing', order: 2, color: '#fbbf24' },
      { id: 'testing', name: 'Testing', order: 3, color: '#3b82f6' },
      { id: 'resolved', name: 'Resolved', order: 4, color: '#22c55e' },
    ],
    sampleTasks: [],
    isGlobal: true,
    createdBy: 'system',
  },
];

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

// GET - Get all templates (global + user's custom)
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDatabase();

    // Get custom templates created by this user
    const customTemplates = await db.collection(COLLECTION_NAME).find({
      $or: [
        { isGlobal: true },
        { createdBy: user._id },
      ],
    }).toArray();

    // Merge with default templates (custom ones override defaults with same id)
    const customIds = new Set(customTemplates.map(t => t.id || t._id?.toString()));
    const allTemplates = [
      ...DEFAULT_TEMPLATES.filter(t => !customIds.has(t.id)),
      ...customTemplates.map(t => ({
        id: t.id || t._id?.toString(),
        name: t.name,
        description: t.description,
        columns: t.columns,
        sampleTasks: t.sampleTasks || [],
        isGlobal: t.isGlobal,
        createdBy: t.createdBy,
      })),
    ];

    return NextResponse.json({
      success: true,
      data: allTemplates,
    });
  } catch (error) {
    console.error('Get templates error:', error);
    return NextResponse.json({ error: 'Failed to get templates' }, { status: 500 });
  }
}

// POST - Create a custom template
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, columns, sampleTasks, isGlobal } = body;

    if (!name || !columns || !Array.isArray(columns) || columns.length < 2) {
      return NextResponse.json({ error: 'Name and at least 2 columns are required' }, { status: 400 });
    }

    const db = await getDatabase();

    const template = {
      id: new ObjectId().toString(),
      name,
      description: description || '',
      columns,
      sampleTasks: sampleTasks || [],
      isGlobal: user.isSuperUser ? (isGlobal || false) : false, // Only superusers can create global templates
      createdBy: user._id,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    await db.collection(COLLECTION_NAME).insertOne(template);

    return NextResponse.json({
      success: true,
      message: 'Template created',
      data: template,
    });
  } catch (error) {
    console.error('Create template error:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

// DELETE - Delete a custom template
export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    const db = await getDatabase();

    // Can only delete own templates or global templates if superuser
    const template = await db.collection(COLLECTION_NAME).findOne({
      $or: [
        { id: templateId },
        { _id: new ObjectId(templateId) },
      ],
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (template.createdBy !== user._id && !user.isSuperUser) {
      return NextResponse.json({ error: 'Not authorized to delete this template' }, { status: 403 });
    }

    await db.collection(COLLECTION_NAME).deleteOne({
      $or: [
        { id: templateId },
        { _id: new ObjectId(templateId) },
      ],
    });

    return NextResponse.json({
      success: true,
      message: 'Template deleted',
    });
  } catch (error) {
    console.error('Delete template error:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
