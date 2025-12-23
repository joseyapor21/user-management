import { NextResponse } from 'next/server';

// GET - Return VAPID public key for client-side push subscription
export async function GET() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!vapidPublicKey) {
    return NextResponse.json({
      success: false,
      configured: false,
    });
  }

  return NextResponse.json({
    success: true,
    configured: true,
    publicKey: vapidPublicKey,
  });
}
