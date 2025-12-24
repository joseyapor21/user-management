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
      isAdmin: user.isAdmin || false,
    };
  } catch {
    return null;
  }
}

// Check if user can manage a department (is admin or superuser)
async function canManageDepartment(userId: string, isSuperUser: boolean, departmentId: string): Promise<boolean> {
  if (isSuperUser) return true;

  const db = await getDatabase();
  const department = await db.collection(DEPARTMENTS_COLLECTION).findOne({
    _id: new ObjectId(departmentId),
    adminIds: userId,
  });

  return !!department;
}

// POST - Restore an archived project
export async function POST(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const db = await getDatabase();

    // Get the archived project
    const existingProject = await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (existingProject.status !== 'archived') {
      return NextResponse.json({ error: 'Project is not archived' }, { status: 400 });
    }

    // Check if user can manage this department
    const canManage = await canManageDepartment(userInfo.userId, userInfo.isSuperUser, existingProject.departmentId);
    if (!canManage) {
      return NextResponse.json({ error: 'Only department admins can restore tasks' }, { status: 403 });
    }

    // Restore to previous status or default to backlog
    const restoreToStatus = existingProject.previousStatus || 'backlog';
    const now = new Date().toISOString();

    // Create activity log entry
    const activityEntry = {
      id: new ObjectId().toString(),
      userId: userInfo.userId,
      userName: userInfo.userName,
      action: 'restored',
      details: `Task restored from drafts to ${restoreToStatus}`,
      timestamp: now,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateOperation: any = {
      $set: {
        status: restoreToStatus,
        'metadata.updatedAt': now,
      },
      $unset: {
        previousStatus: '',
        archivedAt: '',
        archivedBy: '',
      },
      $push: {
        activityLog: activityEntry
      }
    };

    await db.collection(COLLECTION_NAME).updateOne(
      { _id: new ObjectId(id) },
      updateOperation
    );

    return NextResponse.json({
      success: true,
      message: 'Project restored successfully',
      restoredTo: restoreToStatus,
    });
  } catch (error) {
    console.error('Restore project error:', error);
    return NextResponse.json({ error: 'Failed to restore project' }, { status: 500 });
  }
}
