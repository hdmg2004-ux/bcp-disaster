// sw.js — 発災時行動判断支援ツール オフラインキャッシュ
// キャッシュ名は sw.js の処理を変えたときに上げる（v1 → v2 → v3 …）。
// 本体（index.html）の更新だけなら上げなくてよい：下の stale-while-revalidate で取り直され、
// 新しい版が出たことは画面側（index.html 内の「版・更新通知」の層）が知らせる。
const CACHE_NAME = 'bcp-disaster-v3';

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

// フェッチ時：キャッシュがあれば即座に返し、裏でネットワークから取り直してキャッシュを更新する
// （Stale-While-Revalidate）。発災時は回線が細いため、起動はキャッシュを優先する。
self.addEventListener('fetch', (event) => {
  // GET以外（POST等）はそのままネットワークへ
  if (event.request.method !== 'GET') return;

  // 版の確認（index.html?__vcheck=…）はキャッシュせず、そのままネットワークへ通す
  const url = new URL(event.request.url);
  if (url.searchParams.has('__vcheck')) return;

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
        .catch(() => cachedResponse);

      return cachedResponse || networkFetch;
    })
  );
});
