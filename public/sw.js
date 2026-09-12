// Service Worker для PWA
// Кеширует статику, чтобы приложение работало быстро

const CACHE_NAME = "shtab-v1";
const urlsToCache = ["/", "/index.html", "/manifest.json"];

// Установка — кешируем базовые файлы
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Активация — чистим старые версии
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// Fetch — стратегия: network first, fallback to cache
self.addEventListener("fetch", (event) => {
  // Не трогаем Firebase, Google и прочие внешние API
  const url = event.request.url;
  if (
    url.includes("firebase") ||
    url.includes("googleapis") ||
    url.includes("gstatic") ||
    url.includes("tile.openstreetmap") ||
    url.includes("unpkg.com") ||
    event.request.method !== "GET"
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Успешный ответ — кешируем и возвращаем
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Сеть упала — отдаём из кеша
        return caches.match(event.request).then((cached) => {
          return cached || caches.match("/index.html");
        });
      })
  );
});