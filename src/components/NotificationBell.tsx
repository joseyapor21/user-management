'use client';

import { useState, useEffect } from 'react';
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/pushNotifications';

interface NotificationBellProps {
  token: string;
}

export default function NotificationBell({ token }: NotificationBellProps) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    // Check support and current permission
    const isSupported = isPushSupported();
    setSupported(isSupported);

    if (isSupported) {
      const currentPermission = getNotificationPermission();
      setPermission(currentPermission);

      // Check if already subscribed
      if (currentPermission === 'granted') {
        checkSubscription();
      }
    }
  }, []);

  const checkSubscription = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setSubscribed(!!subscription);
      } catch {
        setSubscribed(false);
      }
    }
  };

  const handleEnable = async () => {
    setLoading(true);
    try {
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);

      if (newPermission === 'granted') {
        const success = await subscribeToPush(token);
        setSubscribed(success);
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
    } finally {
      setLoading(false);
      setShowMenu(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      await unsubscribeFromPush(token);
      setSubscribed(false);
    } catch (error) {
      console.error('Failed to disable notifications:', error);
    } finally {
      setLoading(false);
      setShowMenu(false);
    }
  };

  if (!supported) {
    return null;
  }

  const isActive = permission === 'granted' && subscribed;

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`p-2 rounded-full transition-colors ${
          isActive
            ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
            : 'text-gray-500 hover:bg-gray-100'
        }`}
        title={isActive ? 'Notifications enabled' : 'Enable notifications'}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {isActive && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></span>
        )}
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-50 p-4">
            <h3 className="font-semibold text-gray-800 text-sm mb-2">
              Push Notifications
            </h3>

            {permission === 'denied' ? (
              <p className="text-xs text-red-600">
                Notifications are blocked. Please enable them in your browser settings.
              </p>
            ) : isActive ? (
              <>
                <p className="text-xs text-green-600 mb-3">
                  Notifications are enabled. You will receive alerts for task updates.
                </p>
                <button
                  onClick={handleDisable}
                  disabled={loading}
                  className="w-full px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 disabled:opacity-50"
                >
                  {loading ? 'Disabling...' : 'Disable Notifications'}
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-600 mb-3">
                  Enable notifications to get alerts when tasks are assigned to you or updated.
                </p>
                <button
                  onClick={handleEnable}
                  disabled={loading}
                  className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Enabling...' : 'Enable Notifications'}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
