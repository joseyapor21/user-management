import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import webpush from 'web-push';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SUBSCRIPTIONS_COLLECTION = 'v5push_subscriptions';
const USERS_COLLECTION = 'v5users';

// Configure web-push with VAPID keys (check multiple possible env var names)
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:admin@ccoan-ny.org',
    vapidPublicKey,
    vapidPrivateKey
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
    };
  } catch {
    return null;
  }
}

// POST - Send push notification to a user
export async function POST(request: NextRequest) {
  // Verify the sender is authenticated
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if VAPID keys are configured
  if (!vapidPublicKey || !vapidPrivateKey) {
    // Silently fail if VAPID keys are not configured
    return NextResponse.json({
      success: true,
      message: 'Push notifications not configured',
      sent: 0,
    });
  }

  try {
    const body = await request.json();
    const { userId, notification } = body;

    if (!userId || !notification) {
      return NextResponse.json({ error: 'userId and notification are required' }, { status: 400 });
    }

    const db = await getDatabase();

    // Get all subscriptions for the target user
    const subscriptions = await db.collection(SUBSCRIPTIONS_COLLECTION)
      .find({ userId })
      .toArray();

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No subscriptions found for user',
        sent: 0,
      });
    }

    const payload = JSON.stringify({
      title: notification.title || 'CCOAN New York',
      body: notification.body || 'You have a new notification',
      url: notification.url || '/dashboard',
      tag: notification.tag || `notification-${Date.now()}`,
    });

    // Send to all subscriptions for this user
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription, payload);
          return { success: true, endpoint: sub.subscription.endpoint };
        } catch (error: unknown) {
          // If subscription is expired or invalid, remove it
          const webPushError = error as { statusCode?: number };
          if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
            await db.collection(SUBSCRIPTIONS_COLLECTION).deleteOne({ _id: sub._id });
          }
          return { success: false, endpoint: sub.subscription.endpoint, error };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && (r.value as { success: boolean }).success).length;

    return NextResponse.json({
      success: true,
      message: `Push notification sent`,
      sent: successful,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error('Push send error:', error);
    return NextResponse.json({ error: 'Failed to send push notification' }, { status: 500 });
  }
}
