const PUSH_DEFER_KEY = "robin_push_deferred";

function pushSupabaseHeaders(prefer) {
  if (typeof getSupabaseRestHeaders === "function") {
    return getSupabaseRestHeaders(prefer);
  }
  return { "Content-Type": "application/json" };
}

function pushSupabaseUrl() {
  return typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "";
}

function pushSupabaseReady() {
  try {
    return typeof isSupabaseConfigured === "function" && isSupabaseConfigured();
  } catch (e) {
    return false;
  }
}

function pushUsuario(val) {
  return String(val || "").replace(/^@/, "").trim().toLowerCase();
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
  return arr;
}

function pushSoportado() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    window.isSecureContext
  );
}

function pushEstaDiferido() {
  try {
    return getLocalStorageItemSafe(PUSH_DEFER_KEY, "") === "1";
  } catch (e) {
    return false;
  }
}

function diferirPushNotificaciones() {
  try {
    setLocalStorageItemSafe(PUSH_DEFER_KEY, "1");
  } catch (e) { /* ignore */ }
}

async function obtenerRegistroServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch (e) {
    return null;
  }
}

async function guardarSuscripcionPush(username, subscription) {
  const user = pushUsuario(username);
  const json = subscription.toJSON();
  if (!pushSupabaseReady() || !user || !json.endpoint || !json.keys) return false;

  const fila = {
    recipient: user,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    user_agent: String(navigator.userAgent || "").slice(0, 240),
    updated_at: new Date().toISOString()
  };

  try {
    const res = await fetch(
      `${pushSupabaseUrl()}/rest/v1/robin_push_subscriptions?on_conflict=endpoint`,
      {
        method: "POST",
        headers: pushSupabaseHeaders("resolution=merge-duplicates,return=minimal"),
        body: JSON.stringify(fila)
      }
    );
    return res.ok;
  } catch (e) {
    console.warn("ROBIN: no se pudo guardar suscripción push", e);
    return false;
  }
}

async function suscribirPushNotificaciones(username) {
  if (!pushSoportado() || !pushSupabaseReady()) {
    return { ok: false, reason: "unsupported" };
  }

  const user = pushUsuario(username);
  if (!user) return { ok: false, reason: "no_user" };

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    return { ok: false, reason: "denied" };
  }

  const reg = await obtenerRegistroServiceWorker();
  if (!reg || !reg.pushManager) return { ok: false, reason: "no_sw" };

  const vapidKey = typeof ROBIN_VAPID_PUBLIC_KEY !== "undefined" ? ROBIN_VAPID_PUBLIC_KEY : "";
  if (!vapidKey) return { ok: false, reason: "no_vapid" };

  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey)
    });
  }

  const guardado = await guardarSuscripcionPush(user, subscription);
  if (!guardado) return { ok: false, reason: "save_failed" };

  try {
    setLocalStorageItemSafe(PUSH_DEFER_KEY, "0");
  } catch (e) { /* ignore */ }

  return { ok: true };
}

async function inicializarPushNotificaciones(username) {
  if (!pushSoportado() || pushEstaDiferido() || !username) return null;
  if (Notification.permission === "denied") return { ok: false, reason: "denied" };

  const reg = await obtenerRegistroServiceWorker();
  if (!reg) return null;

  const existente = await reg.pushManager.getSubscription();
  if (existente) {
    await guardarSuscripcionPush(username, existente);
    return { ok: true, reason: "existing" };
  }

  if (Notification.permission === "granted") {
    return suscribirPushNotificaciones(username);
  }

  return { ok: false, reason: "needs_prompt" };
}

function registrarListenerAperturaPush(onAbrirTarea) {
  if (!("serviceWorker" in navigator)) return () => {};

  const handler = (event) => {
    const data = event.data || {};
    if (data.type === "ROBIN_OPEN_TASK" && data.taskKey && typeof onAbrirTarea === "function") {
      onAbrirTarea(data.taskKey);
    }
  };

  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
}

function leerTaskKeyDesdeUrl() {
  try {
    const hash = String(window.location.hash || "").replace(/^#/, "");
    if (!hash) return null;

    const params = new URLSearchParams(hash);
    const directa = params.get("tarea") || params.get("task");
    if (directa) return directa;

    if (hash.startsWith("tarea/")) return decodeURIComponent(hash.slice(6));
    if (hash.startsWith("task/")) return decodeURIComponent(hash.slice(5));
    return null;
  } catch (e) {
    return null;
  }
}

function limpiarTaskKeyEnUrl() {
  try {
    if (window.location.hash) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  } catch (e) { /* ignore */ }
}
