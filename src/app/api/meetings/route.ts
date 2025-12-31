import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import webpush from 'web-push';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const COLLECTION_NAME = 'v5meetings';
const USERS_COLLECTION = 'v5users';
const DEPARTMENTS_COLLECTION = 'v5departments';
const SUBSCRIPTIONS_COLLECTION = 'v5push_subscriptions';

// VAPID keys for push notifications
const VAPID_PUBLIC_KEY = 'BJhtjt4mkjp_f-dFU8PHLFRjDqFpeHncXVY2VwtiQH_5_GTdmtdj9K1or3pwkOWRTXWhLr7JVtlhfDVsuV-GqHI';
const VAPID_PRIVATE_KEY = 'LD2qY1dgXDty4tPoB0s5LoCH_AlowBBIa26UBgocq1w';

// Configure web-push
webpush.setVapidDetails(
  'mailto:admin@ccoan-ny.org',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Notification types
type NotificationType = 'new' | 'updated' | 'reminder';

// Send push notification to department members
async function sendMeetingNotification(
  departmentId: string,
  departmentName: string,
  title: string,
  date: string,
  startTime: string,
  notificationType: NotificationType = 'new'
) {
  const db = await getDatabase();

  // Get department to find all members
  const department = await db.collection(DEPARTMENTS_COLLECTION).findOne({
    _id: new ObjectId(departmentId)
  });

  if (!department) return;

  // Get all user IDs in the department (admins + members)
  const userIds = [...(department.adminIds || []), ...(department.memberIds || [])];

  if (userIds.length === 0) return;

  // Get all push subscriptions for these users
  const subscriptions = await db.collection(SUBSCRIPTIONS_COLLECTION)
    .find({ userId: { $in: userIds } })
    .toArray();

  if (subscriptions.length === 0) return;

  // Format the time for display
  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  let notificationTitle = '';
  let notificationBody = '';

  switch (notificationType) {
    case 'reminder':
      notificationTitle = `Meeting Reminder: ${title}`;
      notificationBody = `Starting in 10 minutes at ${formatTime(startTime)}`;
      break;
    case 'updated':
      notificationTitle = `Meeting Updated: ${title}`;
      notificationBody = `${departmentName} - ${date} at ${formatTime(startTime)}`;
      break;
    case 'new':
    default:
      notificationTitle = `New Meeting: ${title}`;
      notificationBody = `${departmentName} - ${date} at ${formatTime(startTime)}`;
      break;
  }

  const payload = JSON.stringify({
    title: notificationTitle,
    body: notificationBody,
    url: '/dashboard?tab=meetings',
    tag: `meeting-${Date.now()}`,
  });

  // Send to all subscriptions
  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, payload);
      } catch (error: unknown) {
        const webPushError = error as { statusCode?: number };
        if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
          await db.collection(SUBSCRIPTIONS_COLLECTION).deleteOne({ _id: sub._id });
        }
      }
    })
  );
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
      .sort({ date: 1, startTime: 1 })
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
    const { title, description, date, startTime, endTime, departmentId, location } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Meeting title is required' }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ error: 'Meeting date is required' }, { status: 400 });
    }

    if (!startTime) {
      return NextResponse.json({ error: 'Start time is required' }, { status: 400 });
    }

    if (!endTime) {
      return NextResponse.json({ error: 'End time is required' }, { status: 400 });
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
      date,
      startTime,
      endTime,
      departmentId,
      location: location?.trim() || '',
      createdBy: userInfo.userId,
      reminderSent: false,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const result = await db.collection(COLLECTION_NAME).insertOne(newMeeting);

    // Send push notification to all department members
    try {
      await sendMeetingNotification(
        departmentId,
        department.name,
        title.trim(),
        date,
        startTime,
        'new'
      );
    } catch (notifError) {
      console.error('Failed to send meeting notification:', notifError);
      // Don't fail the request if notification fails
    }

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
    const { id, title, description, date, startTime, endTime, departmentId, location } = body;

    if (!id) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 });
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Meeting title is required' }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ error: 'Meeting date is required' }, { status: 400 });
    }

    if (!startTime) {
      return NextResponse.json({ error: 'Start time is required' }, { status: 400 });
    }

    if (!endTime) {
      return NextResponse.json({ error: 'End time is required' }, { status: 400 });
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
          date,
          startTime,
          endTime,
          departmentId,
          location: location?.trim() || '',
          reminderSent: false, // Reset reminder when meeting is updated
          'metadata.updatedAt': new Date().toISOString(),
        },
      }
    );

    // Send push notification about the update to all department members
    try {
      await sendMeetingNotification(
        departmentId,
        department.name,
        title.trim(),
        date,
        startTime,
        'updated'
      );
    } catch (notifError) {
      console.error('Failed to send meeting update notification:', notifError);
    }

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
