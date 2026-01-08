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
      isSuperUser: user.isSuperUser || false,
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

// PUT - Reorder projects (update status and order)
export async function PUT(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectId, newStatus, newOrder } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const db = await getDatabase();

    // Get the project
    const project = await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(projectId) });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check permissions: admins can reorder anything, assignees can only move their own tasks
    const canManage = await canManageDepartment(userInfo.userId, userInfo.isSuperUser, project.departmentId);
    const isAssignee = project.assigneeId === userInfo.userId || project.assigneeIds?.includes(userInfo.userId);

    if (!canManage && !isAssignee) {
      return NextResponse.json({ error: 'You do not have permission to move this project' }, { status: 403 });
    }

    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      'metadata.updatedAt': now,
    };

    const hasMultipleAssignees = project.assigneeIds && project.assigneeIds.length > 1;

    // Handle individual completion for multi-assignee tasks
    if (newStatus !== undefined) {
      if (hasMultipleAssignees && newStatus === 'done' && isAssignee && !canManage) {
        // Individual assignee marking as done - add to completedByIds
        const currentCompletedBy = project.completedByIds || [];
        if (!currentCompletedBy.includes(userInfo.userId)) {
          updateData.completedByIds = [...currentCompletedBy, userInfo.userId];

          // Check if ALL assignees have now completed
          const allAssignees = project.assigneeIds || [];
          const newCompletedBy = [...currentCompletedBy, userInfo.userId];
          const allCompleted = allAssignees.every((id: string) => newCompletedBy.includes(id));

          if (allCompleted) {
            // All assignees done - move task to done
            updateData.status = 'done';
            updateData.completedAt = now;
          }
          // If not all completed, don't change status - task stays in current column
        }
      } else if (hasMultipleAssignees && newStatus !== 'done' && isAssignee && !canManage) {
        // Individual assignee un-marking as done - remove from completedByIds
        const currentCompletedBy = project.completedByIds || [];
        if (currentCompletedBy.includes(userInfo.userId)) {
          updateData.completedByIds = currentCompletedBy.filter((id: string) => id !== userInfo.userId);
        }
        updateData.status = newStatus;
        if (project.status === 'done') {
          updateData.completedAt = null;
        }
      } else {
        // Admin changing status OR single assignee task - normal behavior
        updateData.status = newStatus;
        if (newStatus === 'done') {
          updateData.completedAt = now;
          // For admin moving to done, mark all assignees as completed
          if (hasMultipleAssignees && canManage) {
            updateData.completedByIds = project.assigneeIds || [];
          }
        } else if (project.status === 'done') {
          updateData.completedAt = null;
          if (hasMultipleAssignees) {
            updateData.completedByIds = [];
          }
        }
      }
    }

    if (newOrder !== undefined) {
      updateData.order = newOrder;
    }

    await db.collection(COLLECTION_NAME).updateOne(
      { _id: new ObjectId(projectId) },
      { $set: updateData }
    );

    return NextResponse.json({
      success: true,
      message: 'Project reordered successfully',
    });
  } catch (error) {
    console.error('Reorder project error:', error);
    return NextResponse.json({ error: 'Failed to reorder project' }, { status: 500 });
  }
}
