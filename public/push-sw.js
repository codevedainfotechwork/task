self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || 'TaskFlow';
  const options = {
    body: payload.body || 'You have a new notification.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data || {},
    actions: Array.isArray(payload?.data?.actions) ? payload.data.actions : [
      { action: 'open', title: 'Open Task' },
      { action: 'mark-read', title: 'Mark Read' },
    ],
    vibrate: [120, 60, 120],
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  const action = event.action || 'open';
  const notificationData = event.notification?.data || {};
  const targetUrl =
    action === 'mark-read'
      ? notificationData.actions?.find((item) => item.action === 'mark-read')?.link
        || notificationData.link
        || notificationData.url
        || '/login'
      : notificationData.link || notificationData.url || '/login';

  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl) {
            client.navigate(targetUrl);
          }
          return client;
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
