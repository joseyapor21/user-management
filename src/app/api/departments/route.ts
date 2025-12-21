import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const COLLECTION_NAME = 'v5departments';
const USERS_COLLECTION = 'v5users';

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
      isSuperUser: user.isSuperUser || false,
      isAdmin: user.isAdmin || false,
    };
  } catch {
    return null;
  }
}

// GET - List departments (filtered by user access)
export async function GET(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDatabase();
    let query = {};

    // SuperUsers see all departments, others only see departments they're admin or member of
    if (!userInfo.isSuperUser) {
      query = {
        $or: [
          { adminIds: userInfo.userId },
          { memberIds: userInfo.userId }
        ]
      };
    }

    const departments = await db
      .collection(COLLECTION_NAME)
      .find(query)
      .sort({ name: 1 })
      .toArray();

    const normalizedDepartments = departments.map((d) => ({
      ...d,
      id: d._id.toString(),
    }));

    return NextResponse.json({ success: true, data: normalizedDepartments });
  } catch (error) {
    console.error('Fetch departments error:', error);
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
  }
}

// POST - Create department (SuperUser only)
export async function POST(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo?.isSuperUser) {
    return NextResponse.json({ error: 'Unauthorized - SuperUser access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
    }

    const db = await getDatabase();

    // Check for existing department
    const existing = await db.collection(COLLECTION_NAME).findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });
    if (existing) {
      return NextResponse.json({ error: 'Department with this name already exists' }, { status: 400 });
    }

    const newDepartment = {
      name: name.trim(),
      adminIds: [],
      memberIds: [],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const result = await db.collection(COLLECTION_NAME).insertOne(newDepartment);

    return NextResponse.json({
      success: true,
      message: 'Department created successfully',
      id: result.insertedId.toString(),
    });
  } catch (error) {
    console.error('Create department error:', error);
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 });
  }
}

// PUT - Update department name (SuperUser only)
export async function PUT(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo?.isSuperUser) {
    return NextResponse.json({ error: 'Unauthorized - SuperUser access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, name } = body;

    if (!id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
    }

    const db = await getDatabase();

    await db.collection(COLLECTION_NAME).updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name: name.trim(),
          'metadata.updatedAt': new Date().toISOString(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Department updated successfully',
    });
  } catch (error) {
    console.error('Update department error:', error);
    return NextResponse.json({ error: 'Failed to update department' }, { status: 500 });
  }
}

// DELETE - Delete department (SuperUser only)
export async function DELETE(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo?.isSuperUser) {
    return NextResponse.json({ error: 'Unauthorized - SuperUser access required' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 });
    }

    const db = await getDatabase();
    await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      success: true,
      message: 'Department deleted successfully',
    });
  } catch (error) {
    console.error('Delete department error:', error);
    return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 });
  }
}
