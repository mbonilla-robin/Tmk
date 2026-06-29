const PUSH_PROMPT_LEGACY_KEY = "robin_push_deferred";

function pushPromptStorageKey(username) {
  return `robin_push_prompt_${pushUsuario(username)}`;
}

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

  if (arr.length === 66 && arr[0] === 0x04 && arr[1] === 0x04) {
    return arr.subarray(1);
  }

  if (arr.length !== 65 || arr[0] !== 0x04) {
    throw new Error("invalid_vapid_public_key");
  }

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

function esEntornoPushMovil() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}

function esPwaInstalada() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function esIos() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent || "");
}

function pushRequierePwaInstalada() {
  return esIos() && !esPwaInstalada();
}

function pushVapidKeyStorageKey(username) {
  return `robin_push_vapid_${pushUsuario(username)}`;
}

function pushVapidKeyActual() {
  return typeof ROBIN_VAPID_KEY_ID !== "undefined" ? String(ROBIN_VAPID_KEY_ID) : "v1";
}

function necesitaResuscribirPorVapid(username) {
  const user = pushUsuario(username);
  if (!user) return false;
  try {
    return getLocalStorageItemSafe(pushVapidKeyStorageKey(user), "") !== pushVapidKeyActual();
  } catch (e) {
    return true;
  }
}

function marcarVapidKeyActual(username) {
  const user = pushUsuario(username);
  if (!user) return;
  try {
    setLocalStorageItemSafe(pushVapidKeyStorageKey(user), pushVapidKeyActual());
  } catch (e) { /* ignore */ }
}

function pushRegistroOkStorageKey(username) {
  return `robin_push_ok_${pushUsuario(username)}`;
}

function pushRegistroBannerStorageKey(username) {
  return `robin_push_reg_banner_${pushUsuario(username)}`;
}

function registroPushCompleto(username) {
  const user = pushUsuario(username);
  if (!user) return false;
  try {
    return getLocalStorageItemSafe(pushRegistroOkStorageKey(user), "") === "1";
  } catch (e) {
    return false;
  }
}

function marcarRegistroPushCompleto(username) {
  const user = pushUsuario(username);
  if (!user) return;
  try {
    setLocalStorageItemSafe(pushRegistroOkStorageKey(user), "1");
    marcarVapidKeyActual(user);
  } catch (e) { /* ignore */ }
}

function pushRegistroBannerDescartado(username) {
  const user = pushUsuario(username);
  if (!user) return true;
  try {
    return getLocalStorageItemSafe(pushRegistroBannerStorageKey(user), "") === "1";
  } catch (e) {
    return true;
  }
}

function descartarBannerRegistroPush(username) {
  const user = pushUsuario(username);
  if (!user) return;
  try {
    setLocalStorageItemSafe(pushRegistroBannerStorageKey(user), "1");
  } catch (e) { /* ignore */ }
}

function limpiarRegistroPushCompleto(username) {
  const user = pushUsuario(username);
  if (!user) return;
  try {
    removeLocalStorageItemSafe(pushRegistroOkStorageKey(user));
  } catch (e) { /* ignore */ }
}

async function evaluarBannerRegistroPush(username) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return { mostrar: false, motivo: "no_permission" };
  }
  if (pushRegistroBannerDescartado(username)) {
    return { mostrar: false, motivo: "dismissed" };
  }

  const estado = await obtenerEstadoPushUsuario(username);
  if (estado.guardadoRemoto && estado.suscrito) {
    marcarRegistroPushCompleto(username);
    return { mostrar: false, motivo: "already_registered" };
  }

  if (registroPushCompleto(username) && !estado.guardadoRemoto) {
    limpiarRegistroPushCompleto(username);
  }

  if (estado.soportado && !estado.guardadoRemoto && esEntornoPushMovil()) {
    return { mostrar: true, motivo: "needs_register" };
  }

  return { mostrar: false, motivo: "unsupported_or_desktop" };
}

async function invalidarSuscripcionPushLocal(reg) {
  if (!reg?.pushManager) return;
  try {
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  } catch (e) { /* ignore */ }
}

function conTimeout(promise, ms, mensaje = "timeout") {
  let timer;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(mensaje)), ms);
    })
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function fetchConTimeout(url, options = {}, ms = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function limpiarPushPromptAtendido(username) {
  const user = pushUsuario(username);
  if (!user) return;
  try {
    removeLocalStorageItemSafe(pushPromptStorageKey(user));
    removeLocalStorageItemSafe(PUSH_PROMPT_LEGACY_KEY);
  } catch (e) { /* ignore */ }
}

async function esperarControlServiceWorker(timeoutMs = 10000) {
  if (navigator.serviceWorker.controller) return true;

  await new Promise((resolve) => {
    let listo = false;
    const terminar = () => {
      if (listo) return;
      listo = true;
      resolve();
    };

    const onChange = () => {
      if (navigator.serviceWorker.controller) terminar();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onChange);
    setTimeout(() => {
      navigator.serviceWorker.removeEventListener("controllerchange", onChange);
      terminar();
    }, timeoutMs);
  });

  return Boolean(navigator.serviceWorker.controller);
}

async function obtenerOCrearSuscripcionPush(reg, vapidKey) {
  const applicationServerKey = urlBase64ToUint8Array(vapidKey);
  let subscription = await reg.pushManager.getSubscription();

  if (subscription) {
    const actual = pushVapidKeyActual();
    const guardada = getLocalStorageItemSafe(
      pushVapidKeyStorageKey(pushUsuarioActual() || ""),
      ""
    );
    if (guardada && guardada !== actual) {
      await subscription.unsubscribe();
      subscription = null;
    }
  }

  if (subscription) return subscription;

  const intentarSubscribe = () => reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey
  });

  try {
    return await intentarSubscribe();
  } catch (primerError) {
    try {
      const stale = await reg.pushManager.getSubscription();
      if (stale) await stale.unsubscribe();
    } catch (e) { /* ignore */ }

    try {
      return await intentarSubscribe();
    } catch (segundoError) {
      const fallback = await reg.pushManager.getSubscription();
      if (fallback) return fallback;
      throw segundoError || primerError;
    }
  }
}

function pushPromptYaAtendido(username) {
  const user = pushUsuario(username);
  if (!user) return true;

  try {
    if (getLocalStorageItemSafe(pushPromptStorageKey(user), "") === "1") return true;
    if (getLocalStorageItemSafe(PUSH_PROMPT_LEGACY_KEY, "") === "1") return true;
    return false;
  } catch (e) {
    return true;
  }
}

function marcarPushPromptAtendido(username) {
  const user = pushUsuario(username);
  if (!user) return;

  try {
    setLocalStorageItemSafe(pushPromptStorageKey(user), "1");
  } catch (e) { /* ignore */ }
}

async function obtenerRegistroParaPush() {
  if (!("serviceWorker" in navigator)) return null;

  try {
    let reg = await navigator.serviceWorker.getRegistration("./");
    if (!reg) {
      reg = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
    }

    await conTimeout(navigator.serviceWorker.ready, 10000, "sw_ready_timeout");

    if (reg.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    }

    const inicio = Date.now();
    while (!reg.active && Date.now() - inicio < 8000) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      reg = await navigator.serviceWorker.getRegistration("./") || reg;
    }

    if (!reg.active) {
      console.warn("ROBIN: service worker sin worker activo");
      return null;
    }

    return reg;
  } catch (e) {
    console.warn("ROBIN: service worker push no disponible", e);
    return null;
  }
}

function precalentarPushServiceWorker() {
  if (!pushSoportado()) return;
  obtenerRegistroParaPush().catch(() => {});
}

async function asegurarServiceWorkerRegistrado() {
  if (!("serviceWorker" in navigator)) return null;

  try {
    let reg = await navigator.serviceWorker.getRegistration("./");
    if (!reg) {
      reg = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
    }
    await navigator.serviceWorker.ready;
    await esperarControlServiceWorker();
    return reg;
  } catch (e) {
    console.warn("ROBIN: service worker no disponible", e);
    return null;
  }
}

async function obtenerRegistroServiceWorker() {
  return asegurarServiceWorkerRegistrado();
}

async function verificarSuscripcionRemota(username, endpoint, intentos = 3) {
  const user = pushUsuario(username);
  const ep = String(endpoint || "").trim();
  if (!pushSupabaseReady() || !user || !ep) return false;

  for (let i = 0; i < intentos; i += 1) {
    try {
      const res = await fetchConTimeout(
        `${pushSupabaseUrl()}/rest/v1/robin_push_subscriptions?recipient=eq.${encodeURIComponent(user)}&endpoint=eq.${encodeURIComponent(ep)}&select=id&limit=1`,
        { method: "GET", headers: pushSupabaseHeaders() },
        8000
      );
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) return true;
      }
    } catch (e) { /* retry */ }

    if (i < intentos - 1) {
      await new Promise((resolve) => setTimeout(resolve, 350 * (i + 1)));
    }
  }

  return false;
}

async function guardarSuscripcionPush(username, subscription) {
  const user = pushUsuario(username);
  const json = subscription.toJSON();
  if (!pushSupabaseReady() || !user || !json.endpoint || !json.keys) {
    return { ok: false, reason: "invalid_payload" };
  }

  const payload = {
    recipient: user,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    user_agent: String(navigator.userAgent || "").slice(0, 240)
  };

  try {
    if (typeof SUPABASE_ANON_KEY !== "undefined") {
      const fnRes = await fetchConTimeout(
        `${pushSupabaseUrl()}/functions/v1/register-push-subscription`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify(payload)
        },
        12000
      );

      if (fnRes.ok) {
        const fnJson = await fnRes.json().catch(() => ({}));
        if (fnJson.ok && fnJson.id) {
          return { ok: true, endpoint: json.endpoint, id: fnJson.id };
        }
      }
    }

    const rpcRes = await fetchConTimeout(
      `${pushSupabaseUrl()}/rest/v1/rpc/robin_upsert_push_subscription`,
      {
        method: "POST",
        headers: pushSupabaseHeaders(),
        body: JSON.stringify({
          p_recipient: user,
          p_endpoint: json.endpoint,
          p_p256dh: json.keys.p256dh,
          p_auth: json.keys.auth,
          p_user_agent: payload.user_agent
        })
      },
      12000
    );

    if (rpcRes.ok) {
      const id = await rpcRes.json().catch(() => null);
      if (id) return { ok: true, endpoint: json.endpoint, id };
    }

    const fila = {
      recipient: user,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: payload.user_agent,
      updated_at: new Date().toISOString()
    };

    const res = await fetchConTimeout(
      `${pushSupabaseUrl()}/rest/v1/robin_push_subscriptions?on_conflict=endpoint`,
      {
        method: "POST",
        headers: pushSupabaseHeaders("resolution=merge-duplicates,return=minimal"),
        body: JSON.stringify(fila)
      },
      12000
    );

    if (res.ok) {
      return { ok: true, endpoint: json.endpoint };
    }

    const detalle = (await res.text()).slice(0, 300);
    if (typeof registrarDiagnosticoRobin === "function") {
      registrarDiagnosticoRobin("push", "Suscripción no guardada", detalle);
    }
    return { ok: false, reason: "save_failed", status: res.status, detail: detalle };
  } catch (e) {
    const detalle = String(e?.message || e);
    if (typeof registrarDiagnosticoRobin === "function") {
      registrarDiagnosticoRobin("push", "Error al guardar suscripción", detalle);
    }
    return { ok: false, reason: "save_failed", detail: detalle };
  }
}

async function suscribirConRegistro(reg, username) {
  const user = pushUsuario(username);
  if (!user || !reg?.pushManager) {
    return { ok: false, reason: "no_sw" };
  }

  if (Notification.permission !== "granted") {
    return { ok: false, reason: "denied" };
  }

  const vapidKey = typeof ROBIN_VAPID_PUBLIC_KEY !== "undefined" ? ROBIN_VAPID_PUBLIC_KEY : "";
  if (!vapidKey) return { ok: false, reason: "no_vapid" };

  let subscription;
  try {
    subscription = await conTimeout(
      obtenerOCrearSuscripcionPush(reg, vapidKey),
      12000,
      "subscribe_timeout"
    );
  } catch (e) {
    const detalle = String(e?.message || e);
    const reason = detalle.includes("subscribe_timeout") || detalle.includes("timeout")
      ? "timeout"
      : detalle.includes("invalid_vapid")
        ? "invalid_vapid"
        : detalle.includes("P-256") || detalle.includes("applicationServerKey")
          ? "invalid_vapid"
          : "subscribe_failed";
    if (typeof registrarDiagnosticoRobin === "function") {
      registrarDiagnosticoRobin("push", "Subscribe falló", detalle);
    }
    return { ok: false, reason, detail: detalle };
  }

  const guardado = await guardarSuscripcionPush(user, subscription);
  if (!guardado.ok) {
    return { ok: false, reason: guardado.reason || "save_failed", detail: guardado.detail };
  }

  const remoto = await verificarSuscripcionRemota(user, subscription.endpoint, 2);
  if (!remoto) {
    return {
      ok: true,
      endpoint: subscription.endpoint,
      warning: "saved_unverified"
    };
  }

  return { ok: true, endpoint: subscription.endpoint };
}

async function registrarPushConPaso(username, onPaso) {
  const avisar = (paso) => {
    if (typeof onPaso === "function") onPaso(paso);
  };

  if (!pushSoportado() || !pushSupabaseReady()) {
    return { ok: false, reason: "unsupported" };
  }

  if (pushRequierePwaInstalada()) {
    return { ok: false, reason: "needs_pwa" };
  }

  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return { ok: false, reason: "denied" };
  }

  try {
    avisar("Preparando la app…");
    const reg = await conTimeout(obtenerRegistroParaPush(), 12000, "sw_ready_timeout");
    if (!reg?.pushManager) {
      return { ok: false, reason: "no_sw", detail: "Service worker no disponible" };
    }

    const requiereNuevaSuscripcion = necesitaResuscribirPorVapid(username);
    if (requiereNuevaSuscripcion) {
      avisar("Actualizando registro push…");
      await invalidarSuscripcionPushLocal(reg);
    }

    avisar("Vinculando este iPhone…");
    const existente = requiereNuevaSuscripcion
      ? null
      : await reg.pushManager.getSubscription();

    if (existente) {
      avisar("Guardando en el servidor…");
      const guardado = await guardarSuscripcionPush(username, existente);
      if (guardado.ok) {
        marcarVapidKeyActual(username);
        marcarRegistroPushCompleto(username);
        return { ok: true, endpoint: existente.endpoint };
      }
      await invalidarSuscripcionPushLocal(reg);
    }

    avisar("Creando suscripción push…");
    const resultado = await suscribirConRegistro(reg, username);
    if (resultado.ok) {
      marcarVapidKeyActual(username);
      marcarRegistroPushCompleto(username);
    }
    return resultado;
  } catch (e) {
    const detalle = String(e?.message || e);
    const reason = detalle.includes("timeout") ? "timeout" : "no_sw";
    return { ok: false, reason, detail: detalle };
  }
}

async function activarPushEnDispositivo(username) {
  return registrarPushConPaso(username);
}

async function suscribirPushNotificaciones(username, opts) {
  const omitirPermiso = opts?.omitirPermiso === true;
  if (!pushSoportado() || !pushSupabaseReady()) {
    return { ok: false, reason: "unsupported" };
  }

  const user = pushUsuario(username);
  if (!user) return { ok: false, reason: "no_user" };

  if (!omitirPermiso) {
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      return { ok: false, reason: "denied" };
    }
  } else if (Notification.permission !== "granted") {
    return { ok: false, reason: "denied" };
  }

  return activarPushEnDispositivo(user);
}

async function registrarPushEnSegundoPlano(username, intentos = 6) {
  const user = pushUsuario(username);
  if (!user || Notification.permission !== "granted") return { ok: false };

  for (let i = 0; i < intentos; i += 1) {
    const reg = await obtenerRegistroParaPush();
    const existente = reg?.pushManager ? await reg.pushManager.getSubscription() : null;

    let resultado;
    if (existente) {
      resultado = await guardarSuscripcionPush(user, existente);
      if (resultado.ok) {
        const remoto = await verificarSuscripcionRemota(user, existente.endpoint);
        if (remoto) {
          marcarVapidKeyActual(user);
          marcarRegistroPushCompleto(user);
          return { ok: true, endpoint: existente.endpoint };
        }
        resultado = { ok: false, reason: "save_failed" };
      }
    } else if (esIos()) {
      return { ok: false, reason: "needs_gesture" };
    } else {
      resultado = await activarPushEnDispositivo(user);
    }

    if (resultado.ok) {
      enviarPushPruebaUsuario(user).catch(() => {});
      return resultado;
    }
    if (resultado.reason === "denied" || resultado.reason === "needs_gesture") {
      return resultado;
    }
    if (i < intentos - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1200 * (i + 1)));
    }
  }

  return { ok: false, reason: "retry_exhausted" };
}

async function mantenerSuscripcionPushActiva(username) {
  if (!pushSoportado() || !username) {
    return { ok: false, reason: "unsupported" };
  }

  if (Notification.permission !== "granted") {
    return { ok: false, reason: "no_permission" };
  }

  const reg = await obtenerRegistroParaPush();
  if (!reg || !reg.pushManager) {
    return { ok: false, reason: "no_sw" };
  }

  const existente = await reg.pushManager.getSubscription();
  if (existente) {
    return guardarSuscripcionPush(username, existente);
  }

  return suscribirPushNotificaciones(username);
}

async function inicializarPushNotificaciones(username) {
  if (!pushSoportado() || !username) return null;

  const user = pushUsuario(username);

  if (Notification.permission === "granted") {
    registrarPushEnSegundoPlano(user).catch(() => {});
    marcarPushPromptAtendido(user);
    return { ok: true, reason: "registered" };
  }

  if (Notification.permission === "denied") {
    marcarPushPromptAtendido(user);
    return { ok: false, reason: "denied" };
  }

  if (!esEntornoPushMovil() || pushPromptYaAtendido(user)) {
    return { ok: false, reason: "no_prompt" };
  }

  return { ok: false, reason: "needs_prompt" };
}

function registrarListenersPush({ onAbrirTarea, onPushRecibido } = {}) {
  if (!("serviceWorker" in navigator)) return () => {};

  const handler = (event) => {
    const data = event.data || {};
    if (data.type === "ROBIN_OPEN_TASK" && data.taskKey && typeof onAbrirTarea === "function") {
      onAbrirTarea(data.taskKey);
    }
    if (data.type === "ROBIN_PUSH_RECEIVED" && typeof onPushRecibido === "function") {
      onPushRecibido(data);
    }
  };

  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
}

function registrarListenerAperturaPush(onAbrirTarea) {
  return registrarListenersPush({ onAbrirTarea });
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

const PUSH_ENVIADOS_KEY = "robin_push_enviados_ids";

function pushYaEnviadosIds() {
  try {
    const raw = getLocalStorageItemSafe(PUSH_ENVIADOS_KEY, "[]");
    const lista = JSON.parse(raw || "[]");
    return new Set(Array.isArray(lista) ? lista : []);
  } catch (e) {
    return new Set();
  }
}

function marcarPushEnviado(notifId) {
  const id = String(notifId || "").trim();
  if (!id) return;
  try {
    const ids = pushYaEnviadosIds();
    ids.add(id);
    const lista = Array.from(ids).slice(-120);
    setLocalStorageItemSafe(PUSH_ENVIADOS_KEY, JSON.stringify(lista));
  } catch (e) { /* ignore */ }
}

function nombreActorPush(actor) {
  const handle = pushUsuario(actor);
  if (typeof obtenerNombreDisplayEquipo === "function") {
    const nombre = obtenerNombreDisplayEquipo(handle);
    if (nombre && !String(nombre).startsWith("@")) return nombre;
  }
  return formatearHandleCanonico(handle);
}

function mensajeErrorPush(reason) {
  const mapa = {
    denied: "Permiso denegado. Actívalas en Ajustes del navegador o del iPhone.",
    no_sw: "La app aún está cargando. Espera unos segundos e inténtalo de nuevo.",
    save_failed: "Permiso concedido, pero no se registró el teléfono en Supabase. Usa Configuración → API → Activar en este dispositivo.",
    needs_pwa: "En iPhone debes instalar ROBIN en la pantalla de inicio (Compartir → Añadir a inicio) antes de activar notificaciones.",
    needs_gesture: "Pulsa «Registrar dispositivo» para completar la activación en este iPhone.",
    subscribe_failed: "No se pudo vincular este iPhone. Cierra ROBIN, ábrela de nuevo e inténtalo otra vez.",
    invalid_vapid: "Configuración push inválida. Actualiza ROBIN e inténtalo de nuevo.",
    vapid_stale: "Hay una actualización de notificaciones. Pulsa «Registrar dispositivo» otra vez.",
    timeout: "La activación tardó demasiado. Cierra ROBIN, ábrela de nuevo e inténtalo otra vez.",
    unsupported: "Este navegador no soporta notificaciones push.",
    no_vapid: "Falta configuración VAPID en la app."
  };
  return mapa[reason] || "No se pudieron activar las notificaciones push";
}

function construirPayloadPushNotificacion(notif) {
  const actor = nombreActorPush(notif.actor);
  const payload = notif.payload || {};
  const excerpt = String(payload.excerpt || "").trim();
  const taskTitle = String(notif.task_title || "Entregable").trim();
  const type = String(notif.type || "");

  let body = "";
  if (type === "mencion") {
    body = excerpt
      ? `${actor} te dejó este comentario: "${excerpt}"`
      : `${actor} te mencionó en un comentario`;
  } else if (type === "respuesta") {
    body = excerpt
      ? `${actor} respondió tu comentario: "${excerpt}"`
      : `${actor} respondió tu comentario`;
  } else if (type === "asignacion") {
    body = `${actor} te asignó este entregable`;
  } else if (type === "cambio_estado") {
    const de = payload.estadoAnterior || payload.de || "";
    const a = payload.estadoNuevo || payload.a || "";
    body = de && a ? `${actor}: ${de} → ${a}` : `${actor} cambió el estado`;
  } else {
    body = typeof resumirTextoNotificacion === "function"
      ? resumirTextoNotificacion(notif)
      : `${actor} te envió una notificación`;
  }

  return {
    title: taskTitle,
    body,
    task_key: notif.task_key || "",
    id: notif.id || "",
    type
  };
}

async function mostrarPushLocal(notif) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return { ok: false, reason: "no_permission" };
  }

  const data = construirPayloadPushNotificacion(notif);
  const opciones = {
    body: data.body,
    icon: "./icons/pwa-naranja-192.png",
    badge: "./icons/pwa-naranja-192.png",
    tag: data.id ? `robin-notif-${data.id}` : "robin-notif",
    renotify: true,
    data: { taskKey: data.task_key, type: data.type }
  };

  try {
    const reg = await obtenerRegistroServiceWorker();
    if (reg && reg.showNotification) {
      await reg.showNotification(data.title, opciones);
      return { ok: true, via: "sw" };
    }
    new Notification(data.title, opciones);
    return { ok: true, via: "window" };
  } catch (e) {
    console.warn("ROBIN: push local falló", e);
    return { ok: false, reason: "show_failed" };
  }
}

async function dispararPushRemoto(notif) {
  if (!pushSupabaseReady() || typeof SUPABASE_ANON_KEY === "undefined") {
    return { ok: false, reason: "no_supabase" };
  }

  try {
    const res = await fetchConTimeout(
      `${pushSupabaseUrl()}/functions/v1/send-push-on-notification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ record: notif })
      },
      15000
    );

    if (!res.ok) {
      const detalle = await res.text();
      return { ok: false, reason: "http_error", status: res.status, detalle };
    }

    const json = await res.json().catch(() => ({}));
    const sent = Number(json.sent || 0);
    const failed = Number(json.failed || 0);
    const errors = Array.isArray(json.errors) ? json.errors : [];

    if (sent > 0) {
      return { ok: true, sent, failed, errors };
    }

    return {
      ok: false,
      sent: 0,
      failed,
      errors,
      reason: json.reason || (failed ? "send_failed" : "no_subscriptions"),
      detalle: errors[0]?.message || json.error || ""
    };
  } catch (e) {
    return { ok: false, reason: "network", error: String(e.message || e) };
  }
}

function pushUsuarioActual() {
  if (typeof getRobinApiUsername === "function") {
    return pushUsuario(getRobinApiUsername());
  }
  return pushUsuario(getLocalStorageItemSafe("robin_usuario_actual", ""));
}

async function tieneSuscripcionPushLocal() {
  try {
    const reg = await obtenerRegistroServiceWorker();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    return Boolean(sub);
  } catch (e) {
    return false;
  }
}

async function entregarPushParaNotificacion(notif) {
  const id = String(notif?.id || "").trim();
  if (!id || pushYaEnviadosIds().has(id)) {
    return { ok: false, reason: "already_sent" };
  }

  const destinatario = pushUsuario(notif?.recipient);
  const yo = pushUsuarioActual();
  let local = { ok: false, reason: "skipped" };
  let remoto = { ok: false, reason: "skipped" };
  const esIdCliente = id.startsWith("m-") || id.startsWith("r-") || id.startsWith("test-");

  if (destinatario && yo && destinatario !== yo) {
    remoto = await dispararPushRemoto(notif);
  } else if (destinatario && yo === destinatario) {
    if (esIdCliente) {
      remoto = await dispararPushRemoto(notif);
    }
    if (
      (typeof document !== "undefined" && document.visibilityState === "visible") ||
      (esIdCliente && !remoto.ok)
    ) {
      local = await mostrarPushLocal(notif);
    }
    if (!esIdCliente && !remoto.ok) {
      remoto = { ok: true, reason: "server_trigger" };
    }
  }

  if (local.ok || remoto.ok) {
    marcarPushEnviado(id);
    return { ok: true, local, remoto };
  }

  return { ok: false, local, remoto };
}

async function procesarPushNotificacionesNuevas(lista, opts) {
  const notificaciones = Array.isArray(lista) ? lista : [];
  const idsConocidos = opts?.idsConocidos;
  const esCargaInicial = opts?.esCargaInicial === true;

  if (esCargaInicial || !idsConocidos) {
    return { procesadas: 0 };
  }

  let procesadas = 0;
  for (const notif of notificaciones) {
    if (!notif?.id || notif.read_at) continue;
    if (idsConocidos.has(notif.id)) continue;

    const resultado = await entregarPushParaNotificacion(notif);
    if (resultado.ok) procesadas += 1;
  }

  return { procesadas };
}

async function obtenerEstadoPushUsuario(username) {
  const user = pushUsuario(username);
  const estado = {
    soportado: pushSoportado(),
    permiso: typeof Notification !== "undefined" ? Notification.permission : "unsupported",
    suscrito: false,
    guardadoRemoto: false,
    endpoint: ""
  };

  if (!estado.soportado || !user) return estado;

  try {
    const reg = await obtenerRegistroServiceWorker();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    estado.suscrito = Boolean(sub);
    estado.endpoint = sub ? sub.endpoint : "";

    if (pushSupabaseReady() && user) {
      const res = await fetch(
        `${pushSupabaseUrl()}/rest/v1/robin_push_subscriptions?recipient=eq.${encodeURIComponent(user)}&select=id,endpoint&limit=1`,
        { method: "GET", headers: pushSupabaseHeaders() }
      );
      if (res.ok) {
        const rows = await res.json();
        estado.guardadoRemoto = Array.isArray(rows) && rows.length > 0;
      }
    }
  } catch (e) {
    estado.error = String(e.message || e);
  }

  return estado;
}

async function enviarPushPruebaUsuario(username) {
  const user = pushUsuario(username);
  if (!user || !pushSupabaseReady()) return { ok: false, reason: "no_user" };

  const notif = {
    id: `test-${Date.now()}`,
    recipient: user,
    type: "mencion",
    actor: user,
    task_title: "ROBIN",
    task_key: "",
    payload: { excerpt: "Si ves esto, las notificaciones push ya funcionan en segundo plano." }
  };

  const remoto = await dispararPushRemoto(notif);
  if (remoto.ok && remoto.sent > 0) {
    marcarRegistroPushCompleto(user);
    return { ok: true, sent: remoto.sent, via: "remote" };
  }

  if (remoto.reason === "send_failed" || remoto.errors?.[0]?.status === 403) {
    limpiarRegistroPushCompleto(user);
    return {
      ok: false,
      reason: "remote_rejected",
      detalle: remoto.errors?.[0]?.message || remoto.detalle || "Apple rechazó el push (403)"
    };
  }

  const local = await mostrarPushLocal(notif);
  if (local.ok) {
    return {
      ok: true,
      sent: 0,
      via: "local",
      warning: remoto.detalle || remoto.reason || "remote_failed"
    };
  }

  return {
    ok: false,
    reason: remoto.reason || "send_failed",
    detalle: remoto.detalle || remoto.errors?.[0]?.message || ""
  };
}

async function probarPushLocal(username) {
  const user = pushUsuario(username);
  if (!user) return { ok: false, reason: "no_user" };

  const suscripcion = await suscribirPushNotificaciones(username);
  if (!suscripcion.ok) return suscripcion;

  return mostrarPushLocal({
    id: `test-${Date.now()}`,
    type: "mencion",
    actor: user,
    task_title: "Prueba ROBIN",
    task_key: "",
    payload: { excerpt: "Si ves esto, las notificaciones push están funcionando." }
  });
}

async function notificarPushPorComentario({ comentario, author, tarea, parentAuthor }) {
  if (!comentario?.id || typeof entregarPushParaNotificacion !== "function") return;

  const ctx = construirContextoTarea(tarea);
  const yo = normalizeRobinUser(author);
  const excerpt = String(comentario.body || "").slice(0, 160);
  const menciones = extraerMencionesDeTexto(comentario.body);
  const mencionados = new Set(menciones.map((m) => normalizeRobinUser(m)));
  const jobs = [];

  menciones.forEach((recipient) => {
    const dest = normalizeRobinUser(recipient);
    if (!dest || dest === yo) return;
    jobs.push(entregarPushParaNotificacion({
      id: `m-${comentario.id}-${dest}`,
      recipient: dest,
      type: "mencion",
      actor: yo,
      task_key: ctx.taskKey,
      marca: ctx.marca,
      task_title: ctx.taskTitle,
      payload: { excerpt }
    }));
  });

  const padre = normalizeRobinUser(parentAuthor);
  if (padre && padre !== yo && !mencionados.has(padre)) {
    jobs.push(entregarPushParaNotificacion({
      id: `r-${comentario.id}-${padre}`,
      recipient: padre,
      type: "respuesta",
      actor: yo,
      task_key: ctx.taskKey,
      marca: ctx.marca,
      task_title: ctx.taskTitle,
      payload: { excerpt }
    }));
  }

  await Promise.allSettled(jobs);
}

async function notificarPushPorFilas(notificaciones) {
  const filas = Array.isArray(notificaciones) ? notificaciones : [];
  await Promise.allSettled(
    filas.map((notif) => entregarPushParaNotificacion({
      ...notif,
      id: notif.id || `n-${notif.recipient}-${notif.task_key}-${Date.now()}`
    }))
  );
}
