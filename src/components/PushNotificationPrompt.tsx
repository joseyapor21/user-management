'use client';

import { useState, useEffect } from 'react';
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
} from '@/lib/pushNotifications';

interface PushNotificationPromptProps {
  token: string;
}

export default function PushNotificationPrompt({ token }: PushNotificationPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    // Check if push is supported and permission hasn't been decided
    if (!isPushSupported()) {
      return;
    }

    const permission = getNotificationPermission();
    const dismissed = localStorage.getItem('push_prompt_dismissed');

    // Show prompt if permission is 'default' (not yet decided) and user hasn't dismissed
    if (permission === 'default' && !dismissed) {
      // Delay showing prompt for better UX
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);

      return () => clearTimeout(timer);
    }

    // Auto-subscribe if permission was already granted
    if (permission === 'granted' && token) {
      subscribeToPush(token);
    }
  }, [token]);

  const handleEnable = async () => {
    setSubscribing(true);
    try {
      const permission = await requestNotificationPermission();
      if (permission === 'granted') {
        await subscribeToPush(token);
      }
      setShowPrompt(false);
    } catch (error) {
      console.error('Failed to enable notifications:', error);
    } finally {
      setSubscribing(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('push_prompt_dismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-50 border border-gray-200">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-2xl">
          🔔
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 text-sm">
            Enable Notifications
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            Get notified when tasks are assigned to you or when there are updates to your tasks.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleEnable}
              disabled={subscribing}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {subscribing ? 'Enabling...' : 'Enable'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-md hover:bg-gray-200"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
