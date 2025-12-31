import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import webpush from 'web-push';

const COLLECTION_NAME = 'v5meetings';
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

// Format time for display
function formatTime(time: string) {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

// GET - Check for meetings starting soon and send reminders
// This endpoint should be called by a cron job every minute
export async function GET(request: NextRequest) {
  // Optional: Add a secret key for security
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  // You can set REMINDER_SECRET in your environment
  const expectedSecret = process.env.REMINDER_SECRET || 'meeting-reminder-secret';
  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDatabase();
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Get current time in HH:MM format
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    // Calculate time 10-15 minutes from now
    const reminderMinutes = currentMinutes + 10;
    const reminderHours = currentHours + Math.floor(reminderMinutes / 60);
    const normalizedMinutes = reminderMinutes % 60;

    const reminderTimeStart = `${String(reminderHours).padStart(2, '0')}:${String(normalizedMinutes).padStart(2, '0')}`;

    // Also check 5 minutes later to account for timing variations
    const endMinutes = currentMinutes + 15;
    const endHours = currentHours + Math.floor(endMinutes / 60);
    const normalizedEndMinutes = endMinutes % 60;
    const reminderTimeEnd = `${String(endHours).padStart(2, '0')}:${String(normalizedEndMinutes).padStart(2, '0')}`;

    // Find meetings starting in approximately 10 minutes that haven't had reminders sent
    const meetings = await db.collection(COLLECTION_NAME).find({
      date: today,
      startTime: { $gte: reminderTimeStart, $lte: reminderTimeEnd },
      reminderSent: { $ne: true }
    }).toArray();

    if (meetings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No meetings need reminders',
        checked: { today, timeRange: `${reminderTimeStart} - ${reminderTimeEnd}` }
      });
    }

    let remindersSent = 0;

    for (const meeting of meetings) {
      // Get department info
      const department = await db.collection(DEPARTMENTS_COLLECTION).findOne({
        _id: new ObjectId(meeting.departmentId)
      });

      if (!department) continue;

      // Get all user IDs in the department
      const userIds = [...(department.adminIds || []), ...(department.memberIds || [])];
      if (userIds.length === 0) continue;

      // Get all push subscriptions for these users
      const subscriptions = await db.collection(SUBSCRIPTIONS_COLLECTION)
        .find({ userId: { $in: userIds } })
        .toArray();

      if (subscriptions.length === 0) continue;

      const payload = JSON.stringify({
        title: `Meeting Reminder: ${meeting.title}`,
        body: `Starting in 10 minutes at ${formatTime(meeting.startTime)}`,
        url: '/dashboard?tab=meetings',
        tag: `meeting-reminder-${meeting._id}`,
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

      // Mark reminder as sent
      await db.collection(COLLECTION_NAME).updateOne(
        { _id: meeting._id },
        { $set: { reminderSent: true } }
      );

      remindersSent++;
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${remindersSent} meeting reminders`,
      remindersSent,
    });
  } catch (error) {
    console.error('Meeting reminders error:', error);
    return NextResponse.json({ error: 'Failed to process reminders' }, { status: 500 });
  }
}
