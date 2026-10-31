// Minimal service worker: makes the app installable. Push handlers are added in phase 2.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('push', (event) => {
  let d = {}; try { d = event.data ? event.data.json() : {}; } catch (e) {}
  event.waitUntil(self.registration.showNotification(d.title || 'Body Clock Kit', { body: d.body || '', icon: '/icon.svg', tag: d.tag }));
});
self.addEventListener('notificationclick', (e) => { e.notification.close(); e.waitUntil(self.clients.openWindow('/')); });
