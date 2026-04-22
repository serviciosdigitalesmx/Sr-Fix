const CACHE_NAME = 'srfix-static-v5-20260421-2';
const STATIC_ASSETS = [
  './',
  './integrador.html',
  './panel-operativo.html',
  './panel-tecnico.html',
  './portal-cliente.html',
  './panel-solicitudes.html',
  './panel-archivo.html',
  './panel-stock.html',
  './panel-compras.html',
  './panel-gastos.html',
  './panel-finanzas.html',
  './panel-tareas.html',
  './panel-sucursales.html',
  './css/srfix-shared.css',
  './css/panel-operativo.css',
  './css/panel-tecnico.css',
  './css/portal-cliente.css',
  './css/pwa-mobile.css',
  './js/pwa-init.js',
  './manifest.webmanifest',
  './favicon.png',
  './assets/icons/icon-192x192.png',
  './assets/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isApiLike = url.searchParams.has('action') || url.pathname.includes('/exec');

  if (!isSameOrigin || isApiLike) {
    return;
  }

  const destino = request.destination || '';
  const esDocumento = request.mode === 'navigate' || destino === 'document';
  const esAssetCritico = destino === 'script' || destino === 'style';

  if (esDocumento || esAssetCritico) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match(request).then((cached) => {
        if (cached) return cached;
        if (request.mode === 'navigate') return caches.match('./integrador.html');
        return new Response('', { status: 503, statusText: 'Offline' });
      }))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      }).catch(() => {
        if (request.mode === 'navigate') {
          return caches.match('./integrador.html');
        }
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
