import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { SERVICE_PHASES, SCHEDULE_DEPARTMENTS } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
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
      isSuperUser: user.isSuperUser || false,
    };
  } catch {
    return null;
  }
}

// Check if user can edit schedule
async function canEditSchedule(db: ReturnType<typeof getDatabase> extends Promise<infer T> ? T : never, userId: string) {
  const config = await db.collection(CONFIG_COLLECTION).findOne({ key: 'scheduleAdmin' });
  return config?.value === userId;
}

// GET - Get schedule configuration (departments and phases)
export async function GET(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDatabase();

    // Get custom departments
    const deptConfig = await db.collection(CONFIG_COLLECTION).findOne({ key: 'scheduleDepartments' });
    const departments = deptConfig?.value || [...SCHEDULE_DEPARTMENTS];

    // Get custom phases
    const phaseConfig = await db.collection(CONFIG_COLLECTION).findOne({ key: 'schedulePhases' });
    const phases = phaseConfig?.value || [...SERVICE_PHASES];

    return NextResponse.json({
      success: true,
      data: {
        departments,
        phases,
      },
    });
  } catch (error) {
    console.error('Get schedule config error:', error);
    return NextResponse.json({ error: 'Failed to get schedule config' }, { status: 500 });
  }
}

// PUT - Update schedule configuration (admin only)
export async function PUT(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDatabase();

    // Check if user can edit
    const canEdit = await canEditSchedule(db, userInfo.userId);
    if (!canEdit && !userInfo.isSuperUser) {
      return NextResponse.json({ error: 'You do not have permission to edit schedule config' }, { status: 403 });
    }

    const body = await request.json();
    const { departments, phases, renamedDepartment, renamedPhase } = body;

    const now = new Date().toISOString();
    const SCHEDULES_COLLECTION = 'v5schedules';

    // Update departments if provided
    if (departments !== undefined) {
      await db.collection(CONFIG_COLLECTION).updateOne(
        { key: 'scheduleDepartments' },
        {
          $set: {
            key: 'scheduleDepartments',
            value: departments,
            updatedAt: now,
            updatedBy: userInfo.userId,
          },
        },
        { upsert: true }
      );

      // If a department was renamed, update all schedule slots
      if (renamedDepartment) {
        const { oldName, newName } = renamedDepartment;
        await db.collection(SCHEDULES_COLLECTION).updateMany(
          { 'slots.department': oldName },
          { $set: { 'slots.$[elem].department': newName } },
          { arrayFilters: [{ 'elem.department': oldName }] }
        );
      }
    }

    // Update phases if provided
    if (phases !== undefined) {
      await db.collection(CONFIG_COLLECTION).updateOne(
        { key: 'schedulePhases' },
        {
          $set: {
            key: 'schedulePhases',
            value: phases,
            updatedAt: now,
            updatedBy: userInfo.userId,
          },
        },
        { upsert: true }
      );

      // If a phase was renamed, update all schedule slots
      if (renamedPhase) {
        const { oldName, newName } = renamedPhase;
        await db.collection(SCHEDULES_COLLECTION).updateMany(
          { 'slots.phase': oldName },
          { $set: { 'slots.$[elem].phase': newName } },
          { arrayFilters: [{ 'elem.phase': oldName }] }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Schedule configuration updated',
    });
  } catch (error) {
    console.error('Update schedule config error:', error);
    return NextResponse.json({ error: 'Failed to update schedule config' }, { status: 500 });
  }
}
