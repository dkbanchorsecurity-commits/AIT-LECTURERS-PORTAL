// Change this version string (e.g., to v3, v4) every time you deploy a major update!
const CACHE_NAME = 'ait-attendance-v2';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './lecturer-portal.html',
    './admin.css',
    './admin-ui.js',
    './admin-app.js',
    './lecturer-ui.js',
    './lecturer-app.js',
    './manifest.json',
    './AIT.png',
    './icon-192.png',
    './icon-512.png',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', (event) => {
    // Install new assets immediately
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Delete old caches immediately and take control of all open tabs
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.map((key) => { if (key !== CACHE_NAME) return caches.delete(key); })
        )).then(() => self.clients.claim())
    );
});

// Listen for the forceful skip-waiting command from the browser
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Network-First Strategy
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // If online and Vercel returns the file, update the cache silently
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                }
                return networkResponse;
            })
            // If offline, serve from cache
            .catch(() => caches.match(event.request))
    );
});