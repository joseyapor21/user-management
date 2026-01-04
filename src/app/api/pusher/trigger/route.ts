import { NextRequest, NextResponse } from 'next/server';
import { triggerUpdate } from '@/lib/pusher';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channel, event, data } = body;

    if (!channel || !event) {
      return NextResponse.json({ error: 'Channel and event are required' }, { status: 400 });
    }

    await triggerUpdate(channel, event, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pusher trigger error:', error);
    return NextResponse.json({ error: 'Failed to trigger event' }, { status: 500 });
  }
}
