import Pusher from 'pusher';

// Server-side Pusher instance
let pusherServer: Pusher | null = null;

export function getPusherServer(): Pusher {
  if (!pusherServer) {
    pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return pusherServer;
}

// Trigger an update event to all connected clients
export async function triggerUpdate(channel: string, event: string, data?: unknown) {
  try {
    const pusher = getPusherServer();
    await pusher.trigger(channel, event, data || {});
  } catch (error) {
    console.error('Pusher trigger error:', error);
  }
}
