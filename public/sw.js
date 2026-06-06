/* KASA HUB Service Worker
 * - NetworkFirst for HTML / navigations
 * - CacheFirst for hashed static assets (/assets/*)
 * - Push notification handlers preserved
 */

const APP_CACHE = "kasa-hub-app-v2";
const ASSET_CACHE = "kasa-hub-assets-v2";
const KEEP_CACHES = new Set([APP_CACHE, ASSET_CACHE]);

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => (KEEP_CACHES.has(k) ? null : caches.delete(k))),
      );
      await self.clients.claim();
    })(),
  );
});

function isHashedAsset(url) {
  return url.origin === self.location.origin && url.pathname.startsWith("/assets/");
}
function isApiOrAuth(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/~oauth") ||
    url.pathname.startsWith("/_serverFn/")
  );
}
function isNavigation(request) {
  return request.mode === "navigate" || (request.method === "GET" && request.headers.get("accept")?.includes("text/html"));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isApiOrAuth(url)) return;

  // NetworkFirst for navigations / HTML
  if (isNavigation(request)) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(APP_CACHE);
          cache.put(request, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cache = await caches.open(APP_CACHE);
          const cached = await cache.match(request);
          if (cached) return cached;
          const fallback = await cache.match("/");
          if (fallback) return fallback;
          return new Response("Offline", { status: 503, statusText: "offline" });
        }
      })(),
    );
    return;
  }

  // CacheFirst for hashed assets
  if (isHashedAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const fresh = await fetch(request);
          if (fresh.ok) cache.put(request, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          return cached || Response.error();
        }
      })(),
    );
    return;
  }
});

// Push notifications
self.addEventListener("push", (event) => {
  const data = (() => { try { return event.data ? event.data.json() : {}; } catch { return {}; } })();
  const title = data.title || "KASA HUB";
  const options = {
    body: data.body || "Nova notificação recebida",
    icon: data.icon || "/icon-512.png",
    badge: data.badge || "/icon-512.png",
    data: { url: data.url || "/" },
    tag: data.tag,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = all.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.navigate(targetUrl).catch(() => {});
        return;
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});

// Message channel for skipWaiting on demand
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
