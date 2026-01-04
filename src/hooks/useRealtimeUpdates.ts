'use client';

import { useEffect, useCallback, useRef } from 'react';
import Pusher from 'pusher-js';

type UpdateHandler = () => void;

interface UseRealtimeUpdatesOptions {
  onScheduleUpdate?: UpdateHandler;
  onProjectUpdate?: UpdateHandler;
  onMeetingUpdate?: UpdateHandler;
  onDepartmentUpdate?: UpdateHandler;
}

// Singleton Pusher instance
let pusherClient: Pusher | null = null;

function getPusherClient(): Pusher | null {
  if (typeof window === 'undefined') return null;

  if (!pusherClient) {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!key || !cluster) {
      console.warn('Pusher credentials not configured');
      return null;
    }

    pusherClient = new Pusher(key, {
      cluster: cluster,
    });
  }
  return pusherClient;
}

export function useRealtimeUpdates(options: UseRealtimeUpdatesOptions) {
  const handlersRef = useRef(options);

  // Keep handlers up to date
  useEffect(() => {
    handlersRef.current = options;
  }, [options]);

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    // Subscribe to the updates channel
    const channel = pusher.subscribe('app-updates');

    channel.bind('schedule-update', () => {
      handlersRef.current.onScheduleUpdate?.();
    });

    channel.bind('project-update', () => {
      handlersRef.current.onProjectUpdate?.();
    });

    channel.bind('meeting-update', () => {
      handlersRef.current.onMeetingUpdate?.();
    });

    channel.bind('department-update', () => {
      handlersRef.current.onDepartmentUpdate?.();
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe('app-updates');
    };
  }, []);

  // Function to trigger an update to all connected clients
  const triggerUpdate = useCallback(async (type: string, data?: unknown) => {
    const eventMap: Record<string, string> = {
      'schedule_update': 'schedule-update',
      'project_update': 'project-update',
      'meeting_update': 'meeting-update',
      'department_update': 'department-update',
    };

    const event = eventMap[type] || type;

    try {
      await fetch('/api/pusher/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'app-updates',
          event,
          data,
        }),
      });
    } catch (error) {
      console.error('Failed to trigger update:', error);
    }
  }, []);

  return { triggerUpdate };
}
