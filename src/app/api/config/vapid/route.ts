import { NextResponse } from 'next/server';

// GET - Return VAPID public key for client-side push subscription
export async function GET() {
  // Check multiple possible env var names for flexibility
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    || process.env.VAPID_PUBLIC_KEY;

  if (!vapidPublicKey) {
    // Return debug info to help troubleshoot
    const envKeys = Object.keys(process.env).filter(k => k.includes('VAPID'));
    return NextResponse.json({
      success: false,
      configured: false,
      debug: {
        foundVapidKeys: envKeys,
        hint: 'Set VAPID_PUBLIC_KEY or NEXT_PUBLIC_VAPID_PUBLIC_KEY environment variable',
      },
    });
  }

  return NextResponse.json({
    success: true,
    configured: true,
    publicKey: vapidPublicKey,
  });
}
