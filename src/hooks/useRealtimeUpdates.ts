'use client';

import { useEffect, useCallback, useRef } from 'react';

type UpdateHandler = () => void;

interface UseRealtimeUpdatesOptions {
  onScheduleUpdate?: UpdateHandler;
  onProjectUpdate?: UpdateHandler;
  onMeetingUpdate?: UpdateHandler;
  onDepartmentUpdate?: UpdateHandler;
}

// Use BroadcastChannel for same-browser cross-tab communication
// and localStorage events for backup
export function useRealtimeUpdates(options: UseRealtimeUpdatesOptions) {
  const handlersRef = useRef(options);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Keep handlers up to date
  useEffect(() => {
    handlersRef.current = options;
  }, [options]);

  useEffect(() => {
    // Create broadcast channel for cross-tab communication
    try {
      channelRef.current = new BroadcastChannel('app-updates');

      channelRef.current.onmessage = (event) => {
        const { type } = event.data;
        const handlers = handlersRef.current;

        switch (type) {
          case 'schedule_update':
            handlers.onScheduleUpdate?.();
            break;
          case 'project_update':
            handlers.onProjectUpdate?.();
            break;
          case 'meeting_update':
            handlers.onMeetingUpdate?.();
            break;
          case 'department_update':
            handlers.onDepartmentUpdate?.();
            break;
        }
      };
    } catch {
      // BroadcastChannel not supported, use localStorage fallback
    }

    // Also listen to localStorage changes for cross-tab sync
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'app-update-trigger') {
        try {
          const data = JSON.parse(event.newValue || '{}');
          const handlers = handlersRef.current;

          switch (data.type) {
            case 'schedule_update':
              handlers.onScheduleUpdate?.();
              break;
            case 'project_update':
              handlers.onProjectUpdate?.();
              break;
            case 'meeting_update':
              handlers.onMeetingUpdate?.();
              break;
            case 'department_update':
              handlers.onDepartmentUpdate?.();
              break;
          }
        } catch {
          // Invalid JSON
        }
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      channelRef.current?.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Function to trigger an update to all other tabs/windows
  const triggerUpdate = useCallback((type: string, data?: unknown) => {
    const message = { type, data, timestamp: Date.now() };

    // Send via BroadcastChannel
    try {
      channelRef.current?.postMessage(message);
    } catch {
      // Channel closed or not supported
    }

    // Also trigger via localStorage for cross-browser-context sync
    try {
      localStorage.setItem('app-update-trigger', JSON.stringify(message));
      // Remove immediately to allow same value to trigger again
      setTimeout(() => localStorage.removeItem('app-update-trigger'), 100);
    } catch {
      // localStorage not available
    }
  }, []);

  return { triggerUpdate };
}
