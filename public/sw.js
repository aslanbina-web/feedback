const CACHE = "giveget-shell-v2";
const OFFLINE_ASSETS = ["/offline.html", "/giveget-star.svg", "/giveget-icon.svg", "/giveget-icon-192.png", "/giveget-icon-512.png", "/giveget-icon-maskable-512.png", "/apple-touch-icon.png"];
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(OFFLINE_ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.pathname.startsWith("/api/")) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
    return;
  }
  if (OFFLINE_ASSETS.includes(url.pathname)) event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request)));
});
