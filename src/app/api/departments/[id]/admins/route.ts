import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const DEPARTMENTS_COLLECTION = 'v5departments';
const USERS_COLLECTION = 'v5users';

interface RouteContext {
  params: Promise<{ id: string }>;
}

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
    };
  } catch {
    return null;
  }
}

// Check if user can manage this department (SuperUser or existing admin)
async function canManageDepartment(userId: string, isSuperUser: boolean, departmentId: string): Promise<boolean> {
  if (isSuperUser) return true;

  const db = await getDatabase();
  const department = await db.collection(DEPARTMENTS_COLLECTION).findOne({
    _id: new ObjectId(departmentId),
    adminIds: userId,
  });

  return !!department;
}

// GET - List admins of a department
export async function GET(request: NextRequest, context: RouteContext) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const db = await getDatabase();
    const department = await db.collection(DEPARTMENTS_COLLECTION).findOne({
      _id: new ObjectId(id),
    });

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    // Check access
    if (!userInfo.isSuperUser && !department.adminIds?.includes(userInfo.userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get admin user details
    const adminIds = (department.adminIds || []).map((id: string) => {
      try {
        return new ObjectId(id);
      } catch {
        return null;
      }
    }).filter(Boolean);

    const admins = await db
      .collection(USERS_COLLECTION)
      .find({ _id: { $in: adminIds } })
      .project({ password: 0 })
      .toArray();

    const normalizedAdmins = admins.map((u) => ({
      ...u,
      id: u._id.toString(),
    }));

    return NextResponse.json({ success: true, data: normalizedAdmins });
  } catch (error) {
    console.error('Fetch department admins error:', error);
    return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 });
  }
}

// POST - Add admin to department
export async function POST(request: NextRequest, context: RouteContext) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  // Check permission
  const canManage = await canManageDepartment(userInfo.userId, userInfo.isSuperUser, id);
  if (!canManage) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const db = await getDatabase();

    // Verify user exists
    const user = await db.collection(USERS_COLLECTION).findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Add to adminIds (using $addToSet to avoid duplicates)
    await db.collection(DEPARTMENTS_COLLECTION).updateOne(
      { _id: new ObjectId(id) },
      {
        $addToSet: { adminIds: userId },
        $set: { 'metadata.updatedAt': new Date().toISOString() },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Admin added successfully',
    });
  } catch (error) {
    console.error('Add admin error:', error);
    return NextResponse.json({ error: 'Failed to add admin' }, { status: 500 });
  }
}

// DELETE - Remove admin from department
export async function DELETE(request: NextRequest, context: RouteContext) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  // Check permission
  const canManage = await canManageDepartment(userInfo.userId, userInfo.isSuperUser, id);
  if (!canManage) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const db = await getDatabase();

    await db.collection(DEPARTMENTS_COLLECTION).updateOne(
      { _id: new ObjectId(id) },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        $pull: { adminIds: userId } as any,
        $set: { 'metadata.updatedAt': new Date().toISOString() },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Admin removed successfully',
    });
  } catch (error) {
    console.error('Remove admin error:', error);
    return NextResponse.json({ error: 'Failed to remove admin' }, { status: 500 });
  }
}
