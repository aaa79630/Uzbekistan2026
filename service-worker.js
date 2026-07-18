// ===== 烏茲別克行程 PWA Service Worker =====
// 策略：Network-first —— 有網路一律先抓最新版本，只有離線/斷線時才用快取備援
// 每次「大幅」更新內容（例如新增/刪除頁面檔案）時，建議把 CACHE_VERSION 往上加一版，
// 讓舊快取自動清掉；單純改文字內容不需要改版號，因為有網路時本來就會抓最新的。
const CACHE_VERSION = 'v2';
const CACHE_NAME = 'uzbekistan-trip-' + CACHE_VERSION;

// 開頁時預先快取的「基本骨架」，離線時至少能開起來
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './assets/route-map.webp',
  './assets/route-map-fallback.jpg'
];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  var request = event.request;

  // 只處理 GET；只處理同源請求 —— 外部的匯率/天氣 API、字型、地圖圖磚等交給瀏覽器自己處理，
  // 不快取這些，避免使用者看到過期的匯率或天氣資料
  if (request.method !== 'GET') return;
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(function (response) {
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(request, responseClone);
        });
        return response;
      })
      .catch(function () {
        // 網路連不上時，退回快取；連快取都沒有的話，至少給首頁
        return caches.match(request).then(function (cached) {
          return cached || caches.match('./index.html');
        });
      })
  );
});
