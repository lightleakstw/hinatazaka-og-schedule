/* 日向坂OG行程 - 離線支援 Service Worker
 *
 * 運作方式（network-first）：
 * 1. 有網路時：一律抓最新內容，並順手存一份副本到快取
 * 2. 沒網路時：拿出快取的副本顯示（訪客看到的是最後一次成功載入的行程）
 *
 * 若日後修改本檔案，把下面的版本號 v1 改成 v2、v3...，舊快取會自動清除。
 */
const CACHE_NAME = 'hnz-og-cal-v1';

/* 只快取這些來源的內容（頁面本體、試算表資料、字型、QR 工具、頭像圖） */
const CACHEABLE_HOSTS = [
  self.location.hostname,
  'docs.google.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
  'cdn.hinatazaka46.com'
];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (!CACHEABLE_HOSTS.includes(url.hostname)) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then(hit => {
          if (hit) return hit;
          if (req.mode === 'navigate') return caches.match('./', { ignoreSearch: true });
          return Response.error();
        })
      )
  );
});
