// Hollowkeep service worker: precache the app shell so the game runs offline.
// Network-first, so a deploy shows up on the next online load; bump CACHE_NAME
// when the shell list changes.
const CACHE_NAME = "hollowkeep-v3";
const APP_SHELL = [
  "./", "./index.html", "./styles.css",
  "./js/sim.js", "./js/colony.js", "./js/war.js", "./js/blight.js", "./js/divine.js", "./js/story.js",
  "./js/render.js", "./js/render-war.js", "./js/camera.js", "./js/main.js",
  "./design.html", "./design.css", "./mockup.svg",
  "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith("hollowkeep-") && key !== CACHE_NAME).map((key) => caches.delete(key))
  )));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin) return;
  event.respondWith(fetch(event.request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request, { ignoreSearch: true })
    .then((cached) => cached || (event.request.mode === "navigate" ? caches.match("./index.html") : undefined))
    .then((res) => res || Response.error())));
});
