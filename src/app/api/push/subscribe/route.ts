import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const COLLECTION_NAME = 'v5push_subscriptions';
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
    };
  } catch {
    return null;
  }
}

// POST - Subscribe to push notifications
export async function POST(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    const db = await getDatabase();

    // Upsert subscription (update if endpoint exists, insert if not)
    await db.collection(COLLECTION_NAME).updateOne(
      { userId: userInfo.userId, 'subscription.endpoint': subscription.endpoint },
      {
        $set: {
          userId: userInfo.userId,
          subscription,
          userAgent: request.headers.get('user-agent') || 'unknown',
          updatedAt: new Date().toISOString(),
        },
        $setOnInsert: {
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Subscription saved successfully',
    });
  } catch (error) {
    console.error('Push subscribe error:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}

// DELETE - Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDatabase();

    // Remove all subscriptions for this user
    await db.collection(COLLECTION_NAME).deleteMany({ userId: userInfo.userId });

    return NextResponse.json({
      success: true,
      message: 'Unsubscribed successfully',
    });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}
