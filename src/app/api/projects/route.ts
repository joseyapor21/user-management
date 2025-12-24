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

// Get departments user has access to
async function getUserDepartments(userId: string, isSuperUser: boolean): Promise<string[]> {
  const db = await getDatabase();

  if (isSuperUser) {
    const departments = await db.collection(DEPARTMENTS_COLLECTION).find({}).toArray();
    return departments.map(d => d._id.toString());
  }

  const departments = await db.collection(DEPARTMENTS_COLLECTION).find({
    $or: [
      { adminIds: userId },
      { memberIds: userId }
    ]
  }).toArray();

  return departments.map(d => d._id.toString());
}

// GET - List projects (filtered by department access)
export async function GET(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');
    const assignedToMe = searchParams.get('assignedToMe') === 'true';

    const db = await getDatabase();

    // Get user's accessible departments
    const accessibleDepts = await getUserDepartments(userInfo.userId, userInfo.isSuperUser);

    // Check if requesting archived/drafts
    const showArchived = searchParams.get('archived') === 'true';

    // Build query based on filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any;

    if (departmentId) {
      // Check if user has access to this department
      if (!accessibleDepts.includes(departmentId)) {
        return NextResponse.json({ error: 'Access denied to this department' }, { status: 403 });
      }
      query = { departmentId };
    } else if (assignedToMe) {
      // Show only tasks assigned to the user
      query = { assigneeId: userInfo.userId };
    } else {
      // Show tasks from all accessible departments
      query = { departmentId: { $in: accessibleDepts } };
    }

    // Filter by archived status
    if (showArchived) {
      query.status = 'archived';
    } else {
      // Exclude archived tasks from regular view
      query.status = { $ne: 'archived' };
    }

    const projects = await db
      .collection(COLLECTION_NAME)
      .find(query)
      .sort({ order: 1, 'metadata.createdAt': -1 })
      .toArray();

    // Get user and department names for enrichment
    const userIds = Array.from(new Set(projects.flatMap(p => [
      p.assigneeId,
      p.createdBy,
      ...(p.assigneeIds || [])
    ].filter(Boolean))));
    const deptIds = Array.from(new Set(projects.map(p => p.departmentId)));

    const users = await db.collection(USERS_COLLECTION)
      .find({ _id: { $in: userIds.map(id => new ObjectId(id)) } })
      .project({ _id: 1, name: 1, email: 1 })
      .toArray();

    const departments = await db.collection(DEPARTMENTS_COLLECTION)
      .find({ _id: { $in: deptIds.map(id => new ObjectId(id)) } })
      .project({ _id: 1, name: 1 })
      .toArray();

    const userMap = new Map(users.map(u => [u._id.toString(), u.name || u.email]));
    const deptMap = new Map(departments.map(d => [d._id.toString(), d.name]));

    const normalizedProjects = projects.map((p) => ({
      ...p,
      id: p._id.toString(),
      assigneeName: p.assigneeId ? userMap.get(p.assigneeId) || 'Unknown' : null,
      assigneeNames: (p.assigneeIds || []).map((id: string) => userMap.get(id) || 'Unknown'),
      creatorName: userMap.get(p.createdBy) || 'Unknown',
      departmentName: deptMap.get(p.departmentId) || 'Unknown',
    }));

    return NextResponse.json({ success: true, data: normalizedProjects });
  } catch (error) {
    console.error('Fetch projects error:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST - Create project (Admin only)
export async function POST(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { departmentId, title, description, status, priority, assigneeId, assigneeIds, dueDate, labels, subtasks, estimatedHours } = body;

    if (!departmentId || !title) {
      return NextResponse.json({ error: 'Department and title are required' }, { status: 400 });
    }

    // Check if user can manage this department
    const canManage = await canManageDepartment(userInfo.userId, userInfo.isSuperUser, departmentId);
    if (!canManage) {
      return NextResponse.json({ error: 'Only department admins can create tasks' }, { status: 403 });
    }

    const db = await getDatabase();

    // Get the highest order for this department and status
    const lastProject = await db.collection(COLLECTION_NAME)
      .findOne(
        { departmentId, status: status || 'backlog' },
        { sort: { order: -1 } }
      );

    const newProject = {
      departmentId,
      title: title.trim(),
      description: description?.trim() || '',
      status: status || 'backlog',
      priority: priority || 'medium',
      assigneeId: assigneeId || null,
      assigneeIds: assigneeIds || [],
      createdBy: userInfo.userId,
      dueDate: dueDate || null,
      labels: labels || [],
      subtasks: subtasks || [],
      attachments: [],
      comments: [],
      activityLog: [{
        id: new ObjectId().toString(),
        userId: userInfo.userId,
        userName: userInfo.userName,
        action: 'created',
        details: 'Task created',
        timestamp: new Date().toISOString(),
      }],
      estimatedHours: estimatedHours || null,
      loggedHours: 0,
      blockedBy: [],
      order: (lastProject?.order || 0) + 1,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const result = await db.collection(COLLECTION_NAME).insertOne(newProject);

    return NextResponse.json({
      success: true,
      message: 'Project created successfully',
      id: result.insertedId.toString(),
    });
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}

// PUT - Update project
export async function PUT(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, title, description, status, priority, assigneeId, assigneeIds, dueDate, labels, subtasks, estimatedHours, loggedHours, blockedBy } = body;

    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const db = await getDatabase();

    // Get the existing project
    const existingProject = await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check permissions: admins can edit anything, assignees can only change status
    const canManage = await canManageDepartment(userInfo.userId, userInfo.isSuperUser, existingProject.departmentId);
    const isAssignee = existingProject.assigneeId === userInfo.userId || existingProject.assigneeIds?.includes(userInfo.userId);

    if (!canManage && !isAssignee) {
      return NextResponse.json({ error: 'You do not have permission to edit this project' }, { status: 403 });
    }

    // Build activity log entries for changes
    const activityEntries: Array<{id: string; userId: string; userName: string; action: string; details?: string; timestamp: string}> = [];
    const now = new Date().toISOString();

    // If user is just an assignee (not admin), they can only change status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      'metadata.updatedAt': now,
    };

    if (canManage) {
      // Admins can update everything
      if (title !== undefined && title !== existingProject.title) {
        updateData.title = title.trim();
        activityEntries.push({ id: new ObjectId().toString(), userId: userInfo.userId, userName: userInfo.userName, action: 'updated', details: `Changed title to "${title.trim()}"`, timestamp: now });
      }
      if (description !== undefined) updateData.description = description.trim();
      if (priority !== undefined && priority !== existingProject.priority) {
        updateData.priority = priority;
        activityEntries.push({ id: new ObjectId().toString(), userId: userInfo.userId, userName: userInfo.userName, action: 'updated', details: `Changed priority to ${priority}`, timestamp: now });
      }
      if (assigneeId !== undefined && assigneeId !== existingProject.assigneeId) {
        updateData.assigneeId = assigneeId;
        activityEntries.push({ id: new ObjectId().toString(), userId: userInfo.userId, userName: userInfo.userName, action: 'assigned', details: assigneeId ? 'Assigned task' : 'Unassigned task', timestamp: now });
      }
      if (assigneeIds !== undefined) updateData.assigneeIds = assigneeIds;
      if (dueDate !== undefined) updateData.dueDate = dueDate;
      if (labels !== undefined) updateData.labels = labels;
      if (subtasks !== undefined) updateData.subtasks = subtasks;
      if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours;
      if (blockedBy !== undefined) updateData.blockedBy = blockedBy;
    }

    // Assignees can update subtasks and log hours
    if (isAssignee) {
      if (subtasks !== undefined) updateData.subtasks = subtasks;
      if (loggedHours !== undefined) updateData.loggedHours = loggedHours;
    }

    // Both admins and assignees can change status
    if (status !== undefined && status !== existingProject.status) {
      updateData.status = status;
      activityEntries.push({ id: new ObjectId().toString(), userId: userInfo.userId, userName: userInfo.userName, action: 'moved', details: `Moved from ${existingProject.status} to ${status}`, timestamp: now });
    }

    // Build the update operation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateOperation: any = { $set: updateData };

    // Add activity log entries if there are any
    if (activityEntries.length > 0) {
      updateOperation.$push = { activityLog: { $each: activityEntries } };
    }

    await db.collection(COLLECTION_NAME).updateOne(
      { _id: new ObjectId(id) },
      updateOperation
    );

    return NextResponse.json({
      success: true,
      message: 'Project updated successfully',
    });
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

// DELETE - Soft delete (archive) project (Admin only)
export async function DELETE(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const permanent = searchParams.get('permanent') === 'true';

    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const db = await getDatabase();

    // Get the existing project
    const existingProject = await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if user can manage this department
    const canManage = await canManageDepartment(userInfo.userId, userInfo.isSuperUser, existingProject.departmentId);
    if (!canManage) {
      return NextResponse.json({ error: 'Only department admins can delete tasks' }, { status: 403 });
    }

    if (permanent) {
      // Permanently delete the task (only for archived tasks)
      await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });
      return NextResponse.json({
        success: true,
        message: 'Project permanently deleted',
      });
    } else {
      // Soft delete - move to archived status
      const now = new Date().toISOString();
      const activityEntry = {
        id: new ObjectId().toString(),
        userId: userInfo.userId,
        userName: userInfo.userName,
        action: 'archived',
        details: 'Task moved to drafts',
        timestamp: now,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const archiveOperation: any = {
        $set: {
          status: 'archived',
          previousStatus: existingProject.status,
          archivedAt: now,
          archivedBy: userInfo.userId,
          'metadata.updatedAt': now,
        },
        $push: {
          activityLog: activityEntry
        }
      };

      await db.collection(COLLECTION_NAME).updateOne(
        { _id: new ObjectId(id) },
        archiveOperation
      );

      return NextResponse.json({
        success: true,
        message: 'Project moved to drafts',
      });
    }
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
