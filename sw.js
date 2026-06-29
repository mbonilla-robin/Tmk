const CACHE_NAME = "robin-pwa-v107";

const STATIC_ASSETS = [
  "./manifest.webmanifest",
  "./css/main.css",
  "./logo robin negro.png",
  "./logo robin blanco.png",
  "./logo robin blanco@2x.png",
  "./icons/logo-blanco.png",
  "./icons/logo-negro.png",
  "./icons/logo-naranja.png",
  "./icons/pwa-blanco-180.png",
  "./icons/pwa-blanco-192.png",
  "./icons/pwa-blanco-512.png",
  "./icons/pwa-negro-180.png",
  "./icons/pwa-negro-192.png",
  "./icons/pwa-negro-512.png",
  "./icons/pwa-naranja-180.png",
  "./icons/pwa-naranja-192.png",
  "./icons/pwa-naranja-512.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS).catch(() => Promise.resolve()))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isAppScript(pathname) {
  return pathname.endsWith(".js") || pathname.endsWith(".jsx");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // JS/JSX siempre desde red: evita funciones "is not defined" por caché vieja
  if (isAppScript(url.pathname) || url.pathname.endsWith(".html")) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
