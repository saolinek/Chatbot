const CACHE_NAME = 'minimal-chatbot-v2';
const ASSETS = [
  './',
  './index.html',
  './icon.svg',
  './manifest.json'
];

// Instalační fáze - nacachování shell assetů
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Aktivační fáze - vyčištění starých verzí cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Strategie Network-First s Fallbackem na Cache (vhodné pro dynamické SPA)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorujeme externí API požadavky (OpenRouter atd.) - ty nesmí jít přes cache
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Pokud je odpověď úspěšná, uložíme ji kopii do cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Při výpadku internetu vrátíme data z cache
        return caches.match(event.request);
      })
  );
});
