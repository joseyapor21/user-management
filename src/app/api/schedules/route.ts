import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { SERVICE_PHASES, SCHEDULE_DEPARTMENTS } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SCHEDULES_COLLECTION = 'v5schedules';
const CONFIG_COLLECTION = 'v5config';
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
      email: user.email,
      name: user.name || user.email,
      isAdmin: user.isAdmin || false,
      isSuperUser: user.isSuperUser || false,
    };
  } catch {
    return null;
  }
}

// Check if user can edit schedule
async function canEditSchedule(db: ReturnType<typeof getDatabase> extends Promise<infer T> ? T : never, userId: string, isSuperUser: boolean) {
  if (isSuperUser) return true;

  const config = await db.collection(CONFIG_COLLECTION).findOne({ key: 'scheduleAdmin' });
  return config?.value === userId;
}

// GET - Get schedule for a specific date
export async function GET(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json({ error: 'Date parameter required' }, { status: 400 });
    }

    const db = await getDatabase();

    // Get the schedule for the specified date
    const schedule = await db.collection(SCHEDULES_COLLECTION).findOne({ date: dateParam });

    // Get schedule admin info
    const config = await db.collection(CONFIG_COLLECTION).findOne({ key: 'scheduleAdmin' });
    let scheduleAdminName = null;
    if (config?.value) {
      const adminUser = await db.collection(USERS_COLLECTION).findOne({ _id: new ObjectId(config.value) });
      scheduleAdminName = adminUser?.name || adminUser?.email || null;
    }

    const canEdit = await canEditSchedule(db, userInfo.userId, userInfo.isSuperUser);

    if (schedule) {
      return NextResponse.json({
        success: true,
        data: {
          id: schedule._id.toString(),
          date: schedule.date,
          slots: schedule.slots || [],
          createdBy: schedule.createdBy,
          lastModifiedBy: schedule.lastModifiedBy,
          metadata: schedule.metadata,
        },
        canEdit,
        scheduleAdminId: config?.value || null,
        scheduleAdminName,
        phases: SERVICE_PHASES,
        departments: SCHEDULE_DEPARTMENTS,
      });
    }

    // Return empty schedule with default structure
    return NextResponse.json({
      success: true,
      data: null,
      canEdit,
      scheduleAdminId: config?.value || null,
      scheduleAdminName,
      phases: SERVICE_PHASES,
      departments: SCHEDULE_DEPARTMENTS,
    });
  } catch (error) {
    console.error('Get schedule error:', error);
    return NextResponse.json({ error: 'Failed to get schedule' }, { status: 500 });
  }
}

// PUT - Update or create schedule
export async function PUT(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDatabase();

    // Check if user can edit
    const canEdit = await canEditSchedule(db, userInfo.userId, userInfo.isSuperUser);
    if (!canEdit) {
      return NextResponse.json({ error: 'You do not have permission to edit the schedule' }, { status: 403 });
    }

    const body = await request.json();
    const { date, slots } = body;

    if (!date || !slots) {
      return NextResponse.json({ error: 'Date and slots are required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Check if schedule exists
    const existing = await db.collection(SCHEDULES_COLLECTION).findOne({ date });

    if (existing) {
      // Update existing schedule
      await db.collection(SCHEDULES_COLLECTION).updateOne(
        { date },
        {
          $set: {
            slots,
            lastModifiedBy: userInfo.userId,
            'metadata.updatedAt': now,
          },
        }
      );
    } else {
      // Create new schedule
      await db.collection(SCHEDULES_COLLECTION).insertOne({
        date,
        slots,
        createdBy: userInfo.userId,
        lastModifiedBy: userInfo.userId,
        metadata: {
          createdAt: now,
          updatedAt: now,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Schedule saved successfully',
    });
  } catch (error) {
    console.error('Save schedule error:', error);
    return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 });
  }
}
