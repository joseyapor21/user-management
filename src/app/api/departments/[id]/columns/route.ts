import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const COLLECTION_NAME = 'v5department_columns';
const DEPARTMENTS_COLLECTION = 'v5departments';

// Default columns if none are configured
const DEFAULT_COLUMNS = [
  { id: 'backlog', name: 'Backlog', order: 0, color: '#6b7280' },
  { id: 'todo', name: 'To Do', order: 1, color: '#fbbf24' },
  { id: 'in_progress', name: 'In Progress', order: 2, color: '#8b5cf6' },
  { id: 'done', name: 'Done', order: 3, color: '#22c55e' },
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

// GET - Get custom columns for a department
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const db = await getDatabase();

    // Get custom columns or return defaults
    const columnsDoc = await db.collection(COLLECTION_NAME).findOne({
      departmentId: id,
    });

    const columns = columnsDoc?.columns || DEFAULT_COLUMNS;

    return NextResponse.json({
      success: true,
      data: columns,
      isCustom: !!columnsDoc,
    });
  } catch (error) {
    console.error('Get columns error:', error);
    return NextResponse.json({ error: 'Failed to get columns' }, { status: 500 });
  }
}

// PUT - Update custom columns for a department
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const db = await getDatabase();

    // Check if user is admin of this department or superuser
    const department = await db.collection(DEPARTMENTS_COLLECTION).findOne({
      _id: new ObjectId(id),
    });

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    if (!user.isSuperUser && !department.adminIds.includes(user._id)) {
      return NextResponse.json({ error: 'Not authorized to modify columns' }, { status: 403 });
    }

    const body = await request.json();
    const { columns } = body;

    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      return NextResponse.json({ error: 'Columns array is required' }, { status: 400 });
    }

    // Validate columns structure
    for (const col of columns) {
      if (!col.id || !col.name || typeof col.order !== 'number') {
        return NextResponse.json({ error: 'Invalid column structure' }, { status: 400 });
      }
    }

    // Sort by order
    columns.sort((a: { order: number }, b: { order: number }) => a.order - b.order);

    // Upsert custom columns
    await db.collection(COLLECTION_NAME).updateOne(
      { departmentId: id },
      {
        $set: {
          departmentId: id,
          columns,
          updatedAt: new Date().toISOString(),
        },
        $setOnInsert: {
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Columns updated',
      data: columns,
    });
  } catch (error) {
    console.error('Update columns error:', error);
    return NextResponse.json({ error: 'Failed to update columns' }, { status: 500 });
  }
}

// DELETE - Reset to default columns
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const db = await getDatabase();

    // Check if user is admin of this department or superuser
    const department = await db.collection(DEPARTMENTS_COLLECTION).findOne({
      _id: new ObjectId(id),
    });

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    if (!user.isSuperUser && !department.adminIds.includes(user._id)) {
      return NextResponse.json({ error: 'Not authorized to modify columns' }, { status: 403 });
    }

    // Delete custom columns
    await db.collection(COLLECTION_NAME).deleteOne({ departmentId: id });

    return NextResponse.json({
      success: true,
      message: 'Columns reset to defaults',
      data: DEFAULT_COLUMNS,
    });
  } catch (error) {
    console.error('Delete columns error:', error);
    return NextResponse.json({ error: 'Failed to reset columns' }, { status: 500 });
  }
}
