const STATIC_CACHE = 'static-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/resources/css/style.css',
  '/2025/reefscape_config.js',
  // Add other assets like images, fonts, etc.
];

// Service Worker Installation
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 Caching static assets...');
        return cache.addAll(STATIC_ASSETS).then(() => {
          console.log('✅ Static assets cached successfully');
          return cache.keys().then(keys => {
            console.log('📝 Cached items:', keys.map(k => k.url));
          });
        });
      })
      .then(() => {
        console.log('⏭️ Skipping waiting...');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Cache failure:', error);
      })
  );
});

// Activation
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== STATIC_CACHE) {
            console.log('🗑️ Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
    .then(() => {
      console.log('👑 Service Worker now controlling pages');
      return self.clients.claim();
    })
  );
});

// Fetch Handler
self.addEventListener('fetch', (event) => {
  console.log('⚡ Fetching:', event.request.url);
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    }).catch(() => {
      return caches.match('/index.html');
    })
  );
});