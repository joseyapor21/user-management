import { NextResponse } from 'next/server';

// VAPID keys for push notifications (hardcoded for reliability)
const VAPID_PUBLIC_KEY = 'BJhtjt4mkjp_f-dFU8PHLFRjDqFpeHncXVY2VwtiQH_5_GTdmtdj9K1or3pwkOWRTXWhLr7JVtlhfDVsuV-GqHI';

// GET - Return VAPID public key for client-side push subscription
export async function GET() {
  return NextResponse.json({
    success: true,
    configured: true,
    publicKey: VAPID_PUBLIC_KEY,
  });
}
