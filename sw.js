// rede primeiro, cache de reserva; e o aviso de pedido novo pro barbeiro (push vazio, o texto sai daqui)
const CACHE = 'varanda-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
self.addEventListener('push', e => e.waitUntil(self.registration.showNotification('Varanda Barber', { body: 'pedido novo de horário: toca pra aceitar', tag: 'pedido' })));
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL('./?barbeiro', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { const a = cs.find(c => c.url.startsWith(url)); return a ? a.focus() : self.clients.openWindow(url); }));
});
