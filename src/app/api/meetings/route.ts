import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const COLLECTION_NAME = 'v5meetings';
const USERS_COLLECTION = 'v5users';
const DEPARTMENTS_COLLECTION = 'v5departments';

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

// Get user's department IDs
async function getUserDepartmentIds(userId: string): Promise<string[]> {
  const db = await getDatabase();
  const departments = await db.collection(DEPARTMENTS_COLLECTION).find({
    $or: [
      { adminIds: userId },
      { memberIds: userId }
    ]
  }).toArray();

  return departments.map(d => d._id.toString());
}

// GET - List meetings (filtered by user's departments, superuser sees all)
export async function GET(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');

    const query: Record<string, unknown> = {};

    // If specific department requested
    if (departmentId) {
      // Check if user has access to this department (or is superuser)
      if (!userInfo.isSuperUser) {
        const userDepartmentIds = await getUserDepartmentIds(userInfo.userId);
        if (!userDepartmentIds.includes(departmentId)) {
          return NextResponse.json({ error: 'Access denied to this department' }, { status: 403 });
        }
      }
      query.departmentId = departmentId;
    } else {
      // SuperUsers see all meetings, others only see meetings for their departments
      if (!userInfo.isSuperUser) {
        const userDepartmentIds = await getUserDepartmentIds(userInfo.userId);
        query.departmentId = { $in: userDepartmentIds };
      }
    }

    const meetings = await db
      .collection(COLLECTION_NAME)
      .find(query)
      .sort({ dateTime: 1 })
      .toArray();

    // Fetch department names for display
    const departmentIds = Array.from(new Set(meetings.map(m => m.departmentId)));
    const departments = await db.collection(DEPARTMENTS_COLLECTION).find({
      _id: { $in: departmentIds.map(id => new ObjectId(id)) }
    }).toArray();

    const departmentMap = new Map(departments.map(d => [d._id.toString(), d.name]));

    // Fetch creator names
    const creatorIds = Array.from(new Set(meetings.map(m => m.createdBy)));
    const creators = await db.collection(USERS_COLLECTION).find({
      _id: { $in: creatorIds.map(id => new ObjectId(id)) }
    }).toArray();

    const creatorMap = new Map(creators.map(c => [c._id.toString(), c.name]));

    const normalizedMeetings = meetings.map((m) => ({
      ...m,
      id: m._id.toString(),
      departmentName: departmentMap.get(m.departmentId) || 'Unknown',
      creatorName: creatorMap.get(m.createdBy) || 'Unknown',
    }));

    return NextResponse.json({ success: true, data: normalizedMeetings });
  } catch (error) {
    console.error('Fetch meetings error:', error);
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 });
  }
}

// POST - Create meeting (SuperUser only)
export async function POST(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo?.isSuperUser) {
    return NextResponse.json({ error: 'Unauthorized - SuperUser access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, description, dateTime, departmentId, location } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Meeting title is required' }, { status: 400 });
    }

    if (!dateTime) {
      return NextResponse.json({ error: 'Meeting date and time is required' }, { status: 400 });
    }

    if (!departmentId) {
      return NextResponse.json({ error: 'Department is required' }, { status: 400 });
    }

    const db = await getDatabase();

    // Verify department exists
    const department = await db.collection(DEPARTMENTS_COLLECTION).findOne({
      _id: new ObjectId(departmentId)
    });
    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const newMeeting = {
      title: title.trim(),
      description: description?.trim() || '',
      dateTime: new Date(dateTime).toISOString(),
      departmentId,
      location: location?.trim() || '',
      createdBy: userInfo.userId,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const result = await db.collection(COLLECTION_NAME).insertOne(newMeeting);

    return NextResponse.json({
      success: true,
      message: 'Meeting created successfully',
      id: result.insertedId.toString(),
    });
  } catch (error) {
    console.error('Create meeting error:', error);
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
  }
}

// PUT - Update meeting (SuperUser only)
export async function PUT(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo?.isSuperUser) {
    return NextResponse.json({ error: 'Unauthorized - SuperUser access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, title, description, dateTime, departmentId, location } = body;

    if (!id) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 });
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Meeting title is required' }, { status: 400 });
    }

    if (!dateTime) {
      return NextResponse.json({ error: 'Meeting date and time is required' }, { status: 400 });
    }

    if (!departmentId) {
      return NextResponse.json({ error: 'Department is required' }, { status: 400 });
    }

    const db = await getDatabase();

    // Verify department exists
    const department = await db.collection(DEPARTMENTS_COLLECTION).findOne({
      _id: new ObjectId(departmentId)
    });
    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    await db.collection(COLLECTION_NAME).updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          title: title.trim(),
          description: description?.trim() || '',
          dateTime: new Date(dateTime).toISOString(),
          departmentId,
          location: location?.trim() || '',
          'metadata.updatedAt': new Date().toISOString(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Meeting updated successfully',
    });
  } catch (error) {
    console.error('Update meeting error:', error);
    return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 });
  }
}

// DELETE - Delete meeting (SuperUser only)
export async function DELETE(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo?.isSuperUser) {
    return NextResponse.json({ error: 'Unauthorized - SuperUser access required' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 });
    }

    const db = await getDatabase();
    await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      success: true,
      message: 'Meeting deleted successfully',
    });
  } catch (error) {
    console.error('Delete meeting error:', error);
    return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 });
  }
}
