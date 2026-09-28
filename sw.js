/* LegalDesk service worker — makes the Netlify link open & work fully offline.
   Strategy: cache the app shell + libraries on first online visit, then serve
   from cache when offline. The Google Apps Script sync endpoint is never cached
   (it must always hit the network so sync stays correct). */
var CACHE = 'legaldesk-v49-2';
var CORE = ['./','index.html','LegalDesk.html','manifest.json','corresp-data.js','classification-data.js','limitation-data.js','logo.png','icon-192.png','icon-512.png','icon-180.png','favicon-16.png','favicon-32.png','favicon-48.png','favicon-64.png'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.allSettled(CORE.map(function (u) { return c.add(u).catch(function () {}); }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  // Never intercept the cloud-sync endpoint.
  if (/script\.google\.com|googleusercontent\.com|script\.googleusercontent/.test(req.url)) return;

  // App pages: network-first (fresh when online), fall back to cache when offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(function (resp) { var c = resp.clone(); caches.open(CACHE).then(function (cache) { cache.put(req, c); }); return resp; })
        .catch(function () {
          return caches.match(req).then(function (r) {
            return r || caches.match('index.html') || caches.match('LegalDesk.html') || caches.match('./');
          });
        })
    );
    return;
  }

  // Everything else (fonts, CDN libs, icons): serve cached instantly, refresh in background.
  e.respondWith(
    caches.match(req).then(function (cached) {
      var net = fetch(req).then(function (resp) {
        if (resp && (resp.status === 200 || resp.type === 'opaque')) {
          var c = resp.clone(); caches.open(CACHE).then(function (cache) { cache.put(req, c); });
        }
        return resp;
      }).catch(function () { return cached; });
      return cached || net;
    })
  );
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cl) {
    for (var i = 0; i < cl.length; i++) { if ('focus' in cl[i]) return cl[i].focus(); }
    if (self.clients.openWindow) return self.clients.openWindow('./');
  }));
});
