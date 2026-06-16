const CACHE_NAME = "robin-pwa-v7";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/main.css",
  "./logo robin negro.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./js/react/setup.js",
  "./js/config/api.js",
  "./js/utils/storage.js",
  "./js/utils/preferences.js",
  "./js/utils/api.js",
  "./js/utils/user.js",
  "./js/utils/tasks.js",
  "./js/utils/strings.js",
  "./js/utils/dates.js",
  "./js/utils/detalles.js",
  "./js/utils/validation.js",
  "./js/utils/presence.js",
  "./js/utils/widgets.js",
  "./js/constants/index.js",
  "./js/utils/marcas.js",
  "./js/pwa.js",
  "./js/components/RobinLogo.jsx",
  "./js/components/WidgetIcon.jsx",
  "./js/components/SvgIcons.jsx",
  "./js/components/CalendarioNotion.jsx",
  "./js/components/LayoutTablaAgrupada.jsx",
  "./js/components/LayoutKanban.jsx",
  "./js/components/SelectorPersonasChips.jsx",
  "./js/components/WidgetBarFila.jsx",
  "./js/components/MobileWidgetsGrid.jsx",
  "./js/components/LayoutHome.jsx",
  "./js/components/ModalPortal.jsx",
  "./js/components/LayoutClientes.jsx",
  "./js/components/ModalEdicionTarea.jsx",
  "./js/components/WidgetsAdminPanel.jsx",
  "./js/components/MobileSubpageBar.jsx",
  "./js/components/MobileNavBar.jsx",
  "./js/App.jsx",
  "./js/bootstrap.jsx"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")))
  );
});
