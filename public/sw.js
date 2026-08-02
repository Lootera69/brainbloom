const CACHE = "brainbloom-v1";
const PRECACHE_URLS = ["/", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const isNavigation = event.request.mode === "navigate";
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          if (isNavigation) return caches.match("/offline");
          return cached;
        });
      return cached || fetched;
    }),
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  const title = data.title ?? "BrainBloom";
  const options = {
    body: data.body ?? "",
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: data.data ?? {},
    tag: data.tag ?? "brainbloom-notification",
    renotify: true,
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data ?? {};
  const url = data.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});