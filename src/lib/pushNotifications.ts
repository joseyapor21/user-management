// Push notification utilities for browser notifications

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service worker registered');
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

// Fetch VAPID public key from server (runtime config)
async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch('/api/config/vapid');
    const data = await res.json();
    if (data.success && data.publicKey) {
      return data.publicKey;
    }
    return null;
  } catch {
    return null;
  }
}

export async function subscribeToPush(token: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported');
    return false;
  }

  const vapidPublicKey = await getVapidPublicKey();
  if (!vapidPublicKey) {
    console.error('VAPID public key not configured');
    return false;
  }

  try {
    const registration = await registerServiceWorker();
    if (!registration) {
      return false;
    }

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    // Send subscription to server
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
      }),
    });

    if (!response.ok) {
      console.error('Failed to save subscription on server');
      return false;
    }

    console.log('Push subscription successful');
    return true;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return false;
  }
}

export async function unsubscribeFromPush(token: string): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();

      // Remove from server
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    return true;
  } catch (error) {
    console.error('Failed to unsubscribe:', error);
    return false;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  return await Notification.requestPermission();
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | null {
  if (!('Notification' in window)) {
    return null;
  }
  return Notification.permission;
}
