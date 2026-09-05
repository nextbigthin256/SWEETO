// Service Worker for SWEETOS - Web Push Notifications & Offline Support
const CACHE_NAME = 'sweetos-v5';
const OFFLINE_URL = '/index.html';

// Install - Cache essential static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/index.css',
        '/assets/sweetos_logo.svg'
      ]).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch - Network-first for JavaScript and API requests to ensure fresh code
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Network-first for JS modules, HTML, and Supabase cloud requests
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.html') || url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});

// ===== WEB PUSH NOTIFICATIONS =====

// Listen for incoming Push Events (Runs even when web app is closed!)
self.addEventListener('push', (event) => {
  let data = {
    title: '📦 SWEETOS Store Update',
    body: 'New products & exclusive offers are available!',
    icon: '/assets/sweetos_logo.svg',
    badge: '/assets/sweetos_logo.svg',
    tag: 'sweetos-push-notification',
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'view',
        title: '🛍️ Open Storefront'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    requireInteraction: true,
    vibrate: [200, 100, 200]
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || './assets/sweetos_logo.svg',
      badge: data.badge || './assets/sweetos_logo.svg',
      tag: data.tag || 'sweetos-push',
      data: data.data || { url: '/' },
      actions: data.actions || [],
      vibrate: data.vibrate || [200, 100, 200, 100, 200, 100, 400],
      requireInteraction: data.requireInteraction !== undefined ? data.requireInteraction : true,
      renotify: true,
      silent: false
    })
  );
});

// Listen for Notification Click Events
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || '/';

  if (action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification dismissed by user:', event.notification.tag);
});
