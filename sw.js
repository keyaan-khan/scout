const STATIC_CACHE = 'static-v6';
const API_CACHE = 'api-v6';
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours

// Core assets to cache
const REPO_NAME = '/scout';
const STATIC_ASSETS = [ `${REPO_NAME}/`, `${REPO_NAME}/index.html`, `${REPO_NAME}/pit.html`,
    `${REPO_NAME}/2025/field_image.png`,`${REPO_NAME}/2025/reefscape_config.js`,`${REPO_NAME}/2025/reefscape_pit_scouting.js`,
    `${REPO_NAME}/resources/css/style.css`, `${REPO_NAME}/resources/js/scoutingApp.js`,
    `${REPO_NAME}/resources/js/easy.qrcode.min.js`,`${REPO_NAME}/resources/js/TBAInterface.js`,
    `${REPO_NAME}/resources/images/favicon.ico`, `${REPO_NAME}/resources/images/field_location_key.png`,
    `${REPO_NAME}/resources/fonts/alex.woff`,`${REPO_NAME}/resources/fonts/alexisv3.ttf`];

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
      console.log('🔑 Existing caches:', keys);
      return Promise.all(
        keys.map(key => {
          if (key !== STATIC_CACHE && key !== API_CACHE) {
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
  const url = new URL(event.request.url);
  console.log('📡 Fetch request for:', url.pathname);
  
  if (event.request.mode === 'navigate') {
    console.log('🧭 Navigation request detected');
    event.respondWith(handleNavigationRequest(event));
    return;
  }

  const apiConfig = getApiConfig(url);
  if (apiConfig) {
    console.log('🌐 API request detected');
    event.respondWith(handleApiRequest(event, apiConfig));
    return;
  }

  console.log('📄 Static asset request');
  event.respondWith(handleStaticAssetRequest(event));
});

async function handleNavigationRequest(event) {
  console.log('🏃 Handling navigation request');
  try {
    console.log('🌐 Attempting network fetch');
    const networkResponse = await fetch(event.request);
    console.log('✅ Network fetch successful');
    return networkResponse;
  } catch (error) {
    console.log('❌ Network fetch failed, trying cache');
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(`${REPO_NAME}/index.html`);
    if (cachedResponse) {
      console.log('✅ Found cached index.html');
      return cachedResponse;
    }
    console.error('❌ No cached version found');
    return Response.error();
  }
}

async function handleStaticAssetRequest(event) {
  console.log('📦 Handling static asset:', event.request.url);
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(event.request);
  
  if (cachedResponse) {
    console.log('✅ Found in cache:', event.request.url);
    // Background cache update
    fetch(event.request)
      .then(networkResponse => {
        console.log('🔄 Checking for updates');
        if (networkResponse.ok && 
            networkResponse.headers.get('etag') !== cachedResponse.headers.get('etag')) {
          console.log('📥 Updating cached version');
          return cache.put(event.request, networkResponse.clone());
        }
      })
      .catch(error => console.log('ℹ️ Background update failed:', error));
    return cachedResponse;
  }
  
  console.log('🌐 Fetching from network:', event.request.url);
  return fetch(event.request);
}

// Cache cleanup
setInterval(async () => {
  console.log('🧹 Running cache cleanup');
  const cache = await caches.open(API_CACHE);
  const requests = await cache.keys();
  
  requests.forEach(async request => {
    const cacheTime = await getCacheTime(request);
    if (Date.now() - cacheTime > CACHE_EXPIRATION) {
      console.log('🗑️ Removing expired cache:', request.url);
      cache.delete(request);
    }
  });
}, CACHE_EXPIRATION);
