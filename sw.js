const CACHE_NAME = "robin-pwa-v85";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/main.css",
  "./logo robin negro.png",
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
  "./icons/apple-touch-icon.png",
  "./js/react/setup.js",
  "./js/config/api.js",
  "./js/config/supabase.js",
  "./js/config/push.js",
  "./js/config/auth.js",
  "./js/utils/storage.js",
  "./js/utils/diagnostics.js",
  "./js/utils/user.js",
  "./js/utils/preferences.js",
  "./js/utils/auth.js",
  "./js/utils/api.js",
  "./js/utils/personas.js",
  "./js/utils/categorias.js",
  "./js/utils/tasks.js",
  "./js/utils/taskBackup.js",
  "./js/utils/strings.js",
  "./js/utils/dates.js",
  "./js/utils/detalles.js",
  "./js/utils/validation.js",
  "./js/utils/presence.js",
  "./js/utils/widgets.js",
  "./js/utils/estatus.js",
  "./js/utils/equipos.js",
  "./js/utils/comentarios.js",
  "./js/utils/pushNotifications.js",
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
  "./js/components/SelectorCategoriasChips.jsx",
  "./js/components/FormularioCrearEntregable.jsx",
  "./js/components/GeneradorEstatus.jsx",
  "./js/components/BarraAccionesMasivas.jsx",
  "./js/components/BarraHoyAccesoRapido.jsx",
  "./js/components/DesktopWidgetsPanel.jsx",
  "./js/components/MobileWidgetsGrid.jsx",
  "./js/components/LayoutHome.jsx",
  "./js/components/LayoutMarcaHome.jsx",
  "./js/components/LayoutEquipos.jsx",
  "./js/components/ModalPortal.jsx",
  "./js/components/LayoutClientes.jsx",
  "./js/components/ListaSubtareas.jsx",
  "./js/components/InputFechaLibre.jsx",
  "./js/components/ModalEdicionTarea.jsx",
  "./js/components/ComentariosTarea.jsx",
  "./js/components/CampanaNotificaciones.jsx",
  "./js/components/WidgetsAdminPanel.jsx",
  "./js/components/MobileSubpageBar.jsx",
  "./js/components/MobileNavBar.jsx",
  "./js/App.jsx",
  "./js/bootstrap.jsx"
];

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

  const isLocalDev =
    url.hostname === "localhost" || url.hostname === "127.0.0.1";

  if (isAppScript(url.pathname)) {
    if (isLocalDev) {
      event.respondWith(fetch(request));
      return;
    }

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          }
          return caches.match(request);
        })
        .catch(() => caches.match(request))
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
      .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")))
  );
});

function abrirRobinConTarea(clientList, taskKey) {
  const destino = taskKey ? `./index.html#tarea=${encodeURIComponent(taskKey)}` : "./index.html";

  for (const client of clientList) {
    if ("focus" in client) {
      client.postMessage({ type: "ROBIN_OPEN_TASK", taskKey: taskKey || "" });
      return client.focus();
    }
  }

  if (self.clients.openWindow) {
    return self.clients.openWindow(destino);
  }

  return Promise.resolve();
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }

  const title = data.title || "ROBIN";
  const body = data.body || "Tienes una notificación nueva";
  const taskKey = data.task_key || "";
  const tag = data.id ? `robin-notif-${data.id}` : "robin-notif";
  const iconUrl = new URL("./icons/pwa-naranja-192.png", self.location.origin).href;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: iconUrl,
      badge: iconUrl,
      tag,
      renotify: true,
      data: { taskKey, type: data.type || "", notifId: data.id || "" }
    }).then(() =>
      self.clients.matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList) => {
          clientList.forEach((client) => {
            client.postMessage({
              type: "ROBIN_PUSH_RECEIVED",
              taskKey,
              notifId: data.id || ""
            });
          });
        })
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const taskKey = event.notification.data?.taskKey || "";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => abrirRobinConTarea(clientList, taskKey))
  );
});
