const CACHE_NAME = "app-v1";

const ASSETS = [
  "/",
  "/index.html",
  "/invoice.html",
  "/products.html",
  "/records.html",
  "/css/style.css",

  "/js/dashboard.js",
  "/js/invoice.js",
  "/js/products.js",
  "/js/records.js",
  "/js/storage.js"
];

// Install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Activate (clear old cache)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

// Fetch
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});