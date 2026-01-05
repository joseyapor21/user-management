import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const USERS_COLLECTION = 'v5users';
const DEPARTMENTS_COLLECTION = 'v5departments';
const PROJECTS_COLLECTION = 'v5projects';

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

// GET - Get user activity data (SuperUsers only)
export async function GET(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!userInfo.isSuperUser) {
    return NextResponse.json({ error: 'Only SuperUsers can view user activity' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const db = await getDatabase();

    // If requesting a single user's activity
    if (userId) {
      const user = await db.collection(USERS_COLLECTION).findOne({ _id: new ObjectId(userId) });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Get all departments
      const departments = await db.collection(DEPARTMENTS_COLLECTION).find({}).toArray();

      // Find departments where user is admin or member
      const userDepartments = departments
        .filter(d => d.adminIds?.includes(userId) || d.memberIds?.includes(userId))
        .map(d => ({
          id: d._id.toString(),
          name: d.name,
          role: d.adminIds?.includes(userId) ? 'admin' : 'member' as 'admin' | 'member',
        }));

      // Get user's current tasks (not archived)
      const currentTasks = await db.collection(PROJECTS_COLLECTION)
        .find({
          $or: [
            { assigneeId: userId },
            { assigneeIds: userId }
          ],
          status: { $ne: 'archived' }
        })
        .toArray();

      // Get department names for tasks
      const deptMap = new Map(departments.map(d => [d._id.toString(), d.name]));

      const normalizedTasks = currentTasks.map(t => ({
        id: t._id.toString(),
        title: t.title,
        status: t.status,
        departmentName: deptMap.get(t.departmentId) || 'Unknown',
        priority: t.priority,
      }));

      // Count completed tasks (tasks that user moved to 'done' based on activity log)
      const completedTasks = await db.collection(PROJECTS_COLLECTION)
        .find({
          $or: [
            { assigneeId: userId },
            { assigneeIds: userId }
          ],
          status: 'done'
        })
        .toArray();

      // Determine if user is busy (has in_progress tasks)
      const inProgressTasks = normalizedTasks.filter(t => t.status === 'in_progress');

      const activityData = {
        userId,
        userName: user.name || user.email,
        userEmail: user.email,
        departments: userDepartments,
        currentTasks: normalizedTasks,
        completedTasksCount: completedTasks.length,
        isBusy: inProgressTasks.length > 0,
        inProgressCount: inProgressTasks.length,
        lastActive: user.updatedAt || user.createdAt,
      };

      return NextResponse.json({ success: true, data: activityData });
    }

    // Get all users' activity summary
    const users = await db.collection(USERS_COLLECTION).find({}).toArray();
    const departments = await db.collection(DEPARTMENTS_COLLECTION).find({}).toArray();
    const allProjects = await db.collection(PROJECTS_COLLECTION)
      .find({ status: { $ne: 'archived' } })
      .toArray();

    const deptMap = new Map(departments.map(d => [d._id.toString(), d.name]));

    const usersActivity = users.map(user => {
      const userId = user._id.toString();

      // Find user's departments
      const userDepartments = departments
        .filter(d => d.adminIds?.includes(userId) || d.memberIds?.includes(userId))
        .map(d => ({
          id: d._id.toString(),
          name: d.name,
          role: d.adminIds?.includes(userId) ? 'admin' : 'member' as 'admin' | 'member',
        }));

      // Find user's tasks
      const userTasks = allProjects.filter(
        p => p.assigneeId === userId || p.assigneeIds?.includes(userId)
      );

      const currentTasks = userTasks.map(t => ({
        id: t._id.toString(),
        title: t.title,
        status: t.status,
        departmentName: deptMap.get(t.departmentId) || 'Unknown',
        priority: t.priority,
      }));

      const completedTasksCount = userTasks.filter(t => t.status === 'done').length;
      const inProgressCount = userTasks.filter(t => t.status === 'in_progress').length;

      return {
        userId,
        userName: user.name || user.email,
        userEmail: user.email,
        departments: userDepartments,
        currentTasks,
        completedTasksCount,
        isBusy: inProgressCount > 0,
        inProgressCount,
        lastActive: user.updatedAt || user.createdAt,
      };
    });

    // Sort by busy status (busy users first), then by in-progress count
    usersActivity.sort((a, b) => {
      if (a.isBusy !== b.isBusy) return b.isBusy ? 1 : -1;
      return b.inProgressCount - a.inProgressCount;
    });

    return NextResponse.json({ success: true, data: usersActivity });
  } catch (error) {
    console.error('Fetch user activity error:', error);
    return NextResponse.json({ error: 'Failed to fetch user activity' }, { status: 500 });
  }
}
