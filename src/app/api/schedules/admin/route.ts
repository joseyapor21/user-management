import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

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
      email: user.email,
      name: user.name || user.email,
      isAdmin: user.isAdmin || false,
      isSuperUser: user.isSuperUser || false,
    };
  } catch {
    return null;
  }
}

// GET - Get schedule admin
export async function GET(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDatabase();

    const config = await db.collection(CONFIG_COLLECTION).findOne({ key: 'scheduleAdmin' });

    let adminUser = null;
    if (config?.value) {
      const user = await db.collection(USERS_COLLECTION).findOne({ _id: new ObjectId(config.value) });
      if (user) {
        adminUser = {
          id: user._id.toString(),
          email: user.email,
          name: user.name || user.email,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        scheduleAdminId: config?.value || null,
        scheduleAdmin: adminUser,
      },
    });
  } catch (error) {
    console.error('Get schedule admin error:', error);
    return NextResponse.json({ error: 'Failed to get schedule admin' }, { status: 500 });
  }
}

// PUT - Set schedule admin (SuperUser only)
export async function PUT(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!userInfo.isSuperUser) {
    return NextResponse.json({ error: 'Only SuperUser can set schedule admin' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId } = body;

    const db = await getDatabase();

    // Verify the user exists
    if (userId) {
      const user = await db.collection(USERS_COLLECTION).findOne({ _id: new ObjectId(userId) });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    // Update or insert config
    await db.collection(CONFIG_COLLECTION).updateOne(
      { key: 'scheduleAdmin' },
      {
        $set: {
          key: 'scheduleAdmin',
          value: userId || null,
          updatedAt: new Date().toISOString(),
          updatedBy: userInfo.userId,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: userId ? 'Schedule admin set successfully' : 'Schedule admin removed',
    });
  } catch (error) {
    console.error('Set schedule admin error:', error);
    return NextResponse.json({ error: 'Failed to set schedule admin' }, { status: 500 });
  }
}
