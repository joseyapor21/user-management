// Service Worker for Push Notifications
// CCOAN New York Dashboard
// Version: 2.0 - Navigate to task on notification click

self.addEventListener('push', function(event) {
  const data = event.data?.json() ?? {};

  // Build detailed body with metadata
  let body = data.body || 'You have a new notification';

  // Add extra details if provided
  const details = [];
  if (data.department) details.push(data.department);
  if (data.priority) details.push('Priority: ' + data.priority.charAt(0).toUpperCase() + data.priority.slice(1));
  if (data.dueDate) {
    const date = new Date(data.dueDate);
    details.push('Due: ' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
  }
  if (data.byUser && data.byUser !== 'You') details.push('By: ' + data.byUser);

  if (details.length > 0) {
    body += '\n' + details.join(' | ');
  }

  const options = {
    body: body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: data.tag || 'default',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/dashboard',
      taskId: data.taskId
    },
    actions: [
      { action: 'view', title: 'View Task' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'CCOAN New York', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const taskId = event.notification.data?.taskId;
  const baseUrl = event.notification.data?.url || '/dashboard';
  // Add taskId as URL parameter so the app can open the task modal
  const targetUrl = taskId ? baseUrl + '?openTask=' + taskId : baseUrl;

  // Open or focus the dashboard and navigate to the task
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async function(clientList) {
      // Check if there's already an open window on the dashboard
      for (const client of clientList) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          // On mobile, navigate to the URL with task parameter to ensure it opens
          if ('navigate' in client && taskId) {
            try {
              await client.navigate(targetUrl);
              return client.focus();
            } catch (e) {
              // Navigation failed, try message instead
              client.postMessage({ type: 'OPEN_TASK', taskId: taskId });
              return client.focus();
            }
          } else if (taskId) {
            // Fallback: post message to open task
            client.postMessage({ type: 'OPEN_TASK', taskId: taskId });
          }
          return client.focus();
        }
      }
      // No existing window, open a new one with the task parameter
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});
