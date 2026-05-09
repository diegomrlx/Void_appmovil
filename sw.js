// ─── Void PWA Service Worker ──────────────────────────────────────────────────
const CACHE = 'void-v2';
const BASE  = '/Void_appmovil/';
const ASSETS = [BASE, BASE+'index.html', BASE+'manifest.json', BASE+'icon-192.png'];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch (cache-first para assets, network-first para Supabase) ─────────────
self.addEventListener('fetch', e => {
  if (e.request.url.includes('supabase.co')) return; // siempre red para API
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
  );
});

// ── Push notification desde el SW ────────────────────────────────────────────
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'Void', body: 'Tienes tareas pendientes.' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/Void_appmovil/icon-192.png',
      badge: '/Void_appmovil/icon-192.png',
      tag: data.tag || 'void-notif',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: data.url || '/Void_appmovil/' }
    })
  );
});

// ── Click en notificación ─────────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      if (wins.length > 0) { wins[0].focus(); return; }
      return clients.openWindow('/Void_appmovil/');
    })
  );
});

// ── Alarmas programadas (mensajes desde el cliente) ──────────────────────────
const alarmas = new Map(); // id → timeoutId

self.addEventListener('message', e => {
  const { type, id, ms, title, body, tag } = e.data || {};

  if (type === 'SET_ALARM') {
    if (alarmas.has(id)) clearTimeout(alarmas.get(id));
    const tid = setTimeout(() => {
      self.registration.showNotification(title || 'Void', {
        body: body || '',
        icon: '/Void_appmovil/icon-192.png',
        badge: '/Void_appmovil/icon-192.png',
        tag: tag || id,
        renotify: true,
        vibrate: [300, 100, 300, 100, 300],
        data: { url: '/Void_appmovil/' }
      });
      alarmas.delete(id);
    }, ms);
    alarmas.set(id, tid);
  }

  if (type === 'CANCEL_ALARM') {
    if (alarmas.has(id)) { clearTimeout(alarmas.get(id)); alarmas.delete(id); }
  }
});
