import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const COLLECTION_NAME = 'v5projects';
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
      userName: user.name || user.email,
      isSuperUser: user.isSuperUser || false,
    };
  } catch {
    return null;
  }
}

// POST - Migrate tasks from one status to another
export async function POST(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { departmentId, fromStatus, toStatus } = body;

    if (!departmentId || !fromStatus || !toStatus) {
      return NextResponse.json(
        { error: 'departmentId, fromStatus, and toStatus are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Check if user is admin of this department or superuser
    const department = await db.collection(DEPARTMENTS_COLLECTION).findOne({
      _id: new ObjectId(departmentId),
    });

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    if (!userInfo.isSuperUser && !department.adminIds.includes(userInfo.userId)) {
      return NextResponse.json(
        { error: 'Only department admins can migrate tasks' },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    const activityEntry = {
      id: new ObjectId().toString(),
      userId: userInfo.userId,
      userName: userInfo.userName,
      action: 'migrated',
      details: `Migrated from "${fromStatus}" to "${toStatus}" (column removed)`,
      timestamp: now,
    };

    // Update all tasks in this department with the old status
    const result = await db.collection(COLLECTION_NAME).updateMany(
      {
        departmentId,
        status: fromStatus,
      },
      {
        $set: {
          status: toStatus,
          'metadata.updatedAt': now,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        $push: { activityLog: activityEntry } as any,
      }
    );

    return NextResponse.json({
      success: true,
      message: `Migrated ${result.modifiedCount} tasks from "${fromStatus}" to "${toStatus}"`,
      migratedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Migrate tasks error:', error);
    return NextResponse.json({ error: 'Failed to migrate tasks' }, { status: 500 });
  }
}
