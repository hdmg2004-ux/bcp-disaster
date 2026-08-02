// sw.js — 発災時行動判断支援ツール オフラインキャッシュ
// キャッシュ名は更新のたびにバージョンを上げる（v1 → v2 …）
const CACHE_NAME = 'bcp-disaster-v1';

// キャッシュ対象。index.html本体のみで、アイコン等はHTML内にdata URIとして
// 埋め込まれているため個別キャッシュ不要。
const ASSETS_TO_CACHE = [
  './',
  './index.html'
];

// インストール時：必要ファイルを事前キャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// アクティベート時：古いバージョンのキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// フェッチ時：キャッシュファースト、なければネットワーク、
// ネットワーク成功時はキャッシュを更新（次回オフライン時のため）
self.addEventListener('fetch', (event) => {
  // GET以外（POST等）はそのままネットワークへ
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          // 正常なレスポンスのみキャッシュ更新
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // ネットワーク失敗時、キャッシュがあればそれを使う
          // （下のreturn cachedResponseと合流するため、ここでは何もしない）
          return cachedResponse;
        });

      // キャッシュがあれば即座にキャッシュを返しつつ、裏でネットワーク更新を試みる
      // （Stale-While-Revalidate）。キャッシュがなければネットワーク応答を待つ。
      return cachedResponse || networkFetch;
    })
  );
});
