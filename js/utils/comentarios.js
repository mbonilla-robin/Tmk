const NOTIF_POLL_MS = 45000;
const MENCION_EN_TEXTO_RE = /@([^\s@,]+(?:\s+[^\s@,]+)?)\s*,?/g;
const MENCION_ACTIVA_RE = /@([^\s@,]*)$/;

const NOTIF_TIPO_ETIQUETA = {
  mencion: "Te mencionaron",
  respuesta: "Respondieron",
  asignacion: "Te asignaron",
  cambio_estado: "Cambio de estado"
};

function normalizeRobinUser(val) {
  return String(val || "").replace(/^@/, "").trim().toLowerCase();
}

function safeSupabaseConfigured() {
  try {
    return typeof isSupabaseConfigured === "function" && isSupabaseConfigured();
  } catch (e) {
    return false;
  }
}

function supabaseHeaders(prefer) {
  if (typeof getSupabaseRestHeaders === "function") {
    return getSupabaseRestHeaders(prefer);
  }
  return { "Content-Type": "application/json" };
}

function supabaseBaseUrl() {
  return typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "";
}

function construirContextoTarea(tarea) {
  const normalizada = normalizarTareaCampos(tarea || {});
  return {
    taskKey: resolverTaskKeyComentarios(normalizada),
    marca: normalizarMarca(normalizada.marca) || "",
    taskTitle: tituloLimpioTarea(normalizada) || String(normalizada.info || "").trim()
  };
}

function clavesBusquedaComentariosTarea(tarea) {
  const t = normalizarTareaCampos(tarea || {});
  const keys = new Set();
  const rawId = String(t.idTarea || "").trim();
  const idLimpio = cleanIdTarea(rawId);

  if (idLimpio && isValidIdTarea(idLimpio)) keys.add(idLimpio.toLowerCase());
  if (rawId.startsWith("STB-")) keys.add(rawId.toLowerCase());

  const selectionKey = getTaskSelectionKey(t);
  if (selectionKey) keys.add(String(selectionKey).toLowerCase());

  const marca = (normalizarMarca(t.marca) || "").toLowerCase();
  const titulo = tituloLimpioTarea(t) || String(t.info || "").trim().toLowerCase();
  if (marca || titulo) keys.add(`${marca}|${titulo}`.trim());

  return Array.from(keys).filter(Boolean);
}

function resolverTaskKeyComentarios(tarea) {
  const keys = clavesBusquedaComentariosTarea(tarea);
  const t = normalizarTareaCampos(tarea || {});
  const rawId = String(t.idTarea || "").trim();
  const idLimpio = cleanIdTarea(rawId);

  if (idLimpio && isValidIdTarea(idLimpio)) return idLimpio.toLowerCase();
  if (rawId.startsWith("STB-")) return rawId.toLowerCase();
  return keys[0] || getTaskSelectionKey(t);
}

function normalizarTokenMencion(raw) {
  return String(raw || "")
    .trim()
    .replace(/^@/, "")
    .replace(/[,;.:!?]+$/g, "");
}

function extraerMencionesDeTexto(texto) {
  const menciones = new Set();
  const raw = String(texto || "");
  let match;

  MENCION_EN_TEXTO_RE.lastIndex = 0;
  while ((match = MENCION_EN_TEXTO_RE.exec(raw)) !== null) {
    const token = normalizarTokenMencion(match[1]);
    if (!token) continue;
    expandirTokenPersona(`@${token}`).forEach((handle) => {
      const limpio = normalizeRobinUser(handle);
      if (limpio && limpio !== "cliente" && limpio !== "trade" && limpio !== "admin") {
        menciones.add(limpio);
      }
    });
  }

  return Array.from(menciones);
}

function obtenerSugerenciasMencion(query, listaPersonas) {
  const q = normalizeRobinUser(String(query || "").replace(/[,;.:!?]+$/g, ""));
  const candidatos = new Set();

  obtenerHandlesEquipoTrade().forEach((h) => candidatos.add(h));
  (listaPersonas || []).forEach((p) => {
    expandirTokenPersona(p).forEach((h) => candidatos.add(h));
  });

  return Array.from(candidatos)
    .filter((h) => h && h !== "cliente" && h !== "trade" && h !== "admin")
    .filter((h) => !q || h.includes(q) || formatearHandleCanonico(h).toLowerCase().includes(q))
    .sort()
    .slice(0, 8);
}

function formatearTiempoRelativo(iso) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";

  const diffMs = Date.now() - fecha.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;

  const horas = Math.floor(mins / 60);
  if (horas < 24) return `hace ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias < 7) return `hace ${dias} d`;

  return fecha.toLocaleDateString("es-VE", { day: "numeric", month: "short" });
}

function resumirTextoNotificacion(notif) {
  const payload = notif.payload || {};
  const actor = formatearHandleCanonico(notif.actor);

  if (notif.type === "mencion" || notif.type === "respuesta") {
    const excerpt = String(payload.excerpt || "").trim();
    return excerpt ? `${actor}: "${excerpt}"` : `${actor} dejó un comentario`;
  }

  if (notif.type === "asignacion") {
    return `${actor} te asignó este entregable`;
  }

  if (notif.type === "cambio_estado") {
    const de = payload.estadoAnterior || payload.de || "";
    const a = payload.estadoNuevo || payload.a || "";
    if (de && a) return `${de} → ${a} · ${actor}`;
    return `Estado actualizado · ${actor}`;
  }

  return actor;
}

function agruparNotificacionesPorTipo(lista) {
  const orden = ["mencion", "respuesta", "asignacion", "cambio_estado"];
  const grupos = new Map();

  (lista || []).forEach((n) => {
    const tipo = n.type || "mencion";
    if (!grupos.has(tipo)) grupos.set(tipo, []);
    grupos.get(tipo).push(n);
  });

  return orden
    .filter((tipo) => grupos.has(tipo))
    .map((tipo) => ({
      tipo,
      etiqueta: NOTIF_TIPO_ETIQUETA[tipo] || tipo,
      items: grupos.get(tipo)
    }));
}

function buildTaskKeyInFilter(keys) {
  const inner = (keys || [])
    .filter(Boolean)
    .map((k) => `"${String(k).replace(/"/g, '""')}"`)
    .join(",");
  return encodeURIComponent(`in.(${inner})`);
}

async function fetchComentariosTarea(tareaOrKey) {
  const keys = typeof tareaOrKey === "string"
    ? [String(tareaOrKey || "").trim()]
    : clavesBusquedaComentariosTarea(tareaOrKey);
  const unicas = Array.from(new Set(keys.map((k) => String(k).trim()).filter(Boolean)));
  if (!safeSupabaseConfigured() || !unicas.length) return [];

  try {
    const res = await fetch(
      `${supabaseBaseUrl()}/rest/v1/robin_task_comments?task_key=${buildTaskKeyInFilter(unicas)}&select=id,task_key,marca,task_title,author,body,mentions,parent_id,created_at&order=created_at.asc`,
      { method: "GET", headers: supabaseHeaders() }
    );
    if (!res.ok) {
      console.warn("ROBIN: error cargando comentarios", res.status, await res.text());
      return [];
    }
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.warn("ROBIN: no se pudieron cargar comentarios", e);
    return [];
  }
}

async function publicarComentario({ tarea, author, body, parentId, listaPersonas }) {
  const usuario = normalizeRobinUser(author);
  const texto = String(body || "").trim();
  if (!safeSupabaseConfigured() || !usuario || !texto) {
    return { ok: false, error: "Datos incompletos" };
  }

  const ctx = construirContextoTarea(tarea);
  const mentions = extraerMencionesDeTexto(texto);

  try {
    const res = await fetch(
      `${supabaseBaseUrl()}/rest/v1/robin_task_comments?select=id,task_key,marca,task_title,author,body,mentions,parent_id,created_at`,
      {
        method: "POST",
        headers: supabaseHeaders("return=representation"),
        body: JSON.stringify({
          task_key: ctx.taskKey,
          marca: ctx.marca,
          task_title: ctx.taskTitle,
          author: usuario,
          body: texto,
          mentions,
          parent_id: parentId || null
        })
      }
    );

    if (!res.ok) {
      const detalle = await res.text();
      console.warn("ROBIN: error publicando comentario", res.status, detalle);
      return { ok: false, error: "No se pudo guardar el comentario. Revisa tu conexión." };
    }

    const rows = await res.json();
    const comentario = Array.isArray(rows) ? rows[0] : rows;
    if (!comentario || !comentario.id) {
      return { ok: false, error: "El comentario no se guardó correctamente." };
    }
    return { ok: true, comentario, mentions, listaPersonas };
  } catch (e) {
    console.warn("ROBIN: error publicando comentario", e);
    return { ok: false, error: "Error de conexión" };
  }
}

async function insertarNotificaciones(notificaciones) {
  const filas = (notificaciones || []).filter((n) => n && n.recipient && n.task_key);
  if (!safeSupabaseConfigured() || !filas.length) return false;

  try {
    const res = await fetch(
      `${supabaseBaseUrl()}/rest/v1/robin_notifications`,
      {
        method: "POST",
        headers: supabaseHeaders("return=minimal"),
        body: JSON.stringify(filas)
      }
    );
    return res.ok;
  } catch (e) {
    console.warn("ROBIN: error insertando notificaciones", e);
    return false;
  }
}

function handlesNuevosEnCampo(anterior, nuevo) {
  const antes = new Set(obtenerHandlesDesdeCampoPersonas(anterior));
  return obtenerHandlesDesdeCampoPersonas(nuevo).filter((h) => !antes.has(h));
}

function destinatariosAsignacion(tarea, actor) {
  const yo = normalizeRobinUser(actor);
  return obtenerHandlesDesdeCampoPersonas(tarea.personas).filter((h) => h !== yo);
}

async function notificarAsignacionTarea(tarea, actor, destinatariosExtra) {
  const ctx = construirContextoTarea(tarea);
  const yo = normalizeRobinUser(actor);
  const destinos = new Set(destinatariosExtra || destinatariosAsignacion(tarea, yo));

  const filas = Array.from(destinos)
    .filter((r) => r && r !== yo)
    .map((recipient) => ({
      recipient,
      type: "asignacion",
      actor: yo,
      task_key: ctx.taskKey,
      marca: ctx.marca,
      task_title: ctx.taskTitle,
      payload: {}
    }));

  return insertarNotificaciones(filas);
}

async function notificarCambioEstadoTarea(tarea, actor, estadoAnterior, estadoNuevo) {
  const ctx = construirContextoTarea(tarea);
  const yo = normalizeRobinUser(actor);
  const destinos = destinatariosAsignacion(tarea, yo);

  const filas = destinos.map((recipient) => ({
    recipient,
    type: "cambio_estado",
    actor: yo,
    task_key: ctx.taskKey,
    marca: ctx.marca,
    task_title: ctx.taskTitle,
    payload: {
      estadoAnterior: normalizarEstado(estadoAnterior),
      estadoNuevo: normalizarEstado(estadoNuevo)
    }
  }));

  return insertarNotificaciones(filas);
}

async function notificarNuevosAsignados(tarea, actor, personasAnteriores, personasNuevas) {
  const nuevos = handlesNuevosEnCampo(personasAnteriores, personasNuevas);
  if (!nuevos.length) return false;
  return notificarAsignacionTarea(tarea, actor, nuevos);
}

async function fetchNotificacionesUsuario(username, limite) {
  const user = normalizeRobinUser(username);
  const max = limite || 40;
  if (!safeSupabaseConfigured() || !user) return [];

  try {
    const res = await fetch(
      `${supabaseBaseUrl()}/rest/v1/robin_notifications?recipient=eq.${encodeURIComponent(user)}&select=id,recipient,type,actor,task_key,marca,task_title,comment_id,payload,read_at,created_at&order=created_at.desc&limit=${max}`,
      { method: "GET", headers: supabaseHeaders() }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.warn("ROBIN: no se pudieron cargar notificaciones", e);
    return [];
  }
}

async function contarNotificacionesNoLeidas(username) {
  const user = normalizeRobinUser(username);
  if (!safeSupabaseConfigured() || !user) return 0;

  try {
    const res = await fetch(
      `${supabaseBaseUrl()}/rest/v1/robin_notifications?recipient=eq.${encodeURIComponent(user)}&read_at=is.null&select=id`,
      {
        method: "GET",
        headers: {
          ...supabaseHeaders(),
          Prefer: "count=exact"
        }
      }
    );
    if (!res.ok) return 0;

    const range = res.headers.get("content-range") || "";
    const match = range.match(/\/(\d+)$/);
    if (match) return parseInt(match[1], 10) || 0;

    const rows = await res.json();
    return Array.isArray(rows) ? rows.length : 0;
  } catch (e) {
    return 0;
  }
}

async function marcarNotificacionLeida(id) {
  const notifId = String(id || "").trim();
  if (!safeSupabaseConfigured() || !notifId) return false;

  try {
    const res = await fetch(
      `${supabaseBaseUrl()}/rest/v1/robin_notifications?id=eq.${encodeURIComponent(notifId)}`,
      {
        method: "PATCH",
        headers: supabaseHeaders("return=minimal"),
        body: JSON.stringify({ read_at: new Date().toISOString() })
      }
    );
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function marcarTodasNotificacionesLeidas(username) {
  const user = normalizeRobinUser(username);
  if (!safeSupabaseConfigured() || !user) return false;

  try {
    const res = await fetch(
      `${supabaseBaseUrl()}/rest/v1/robin_notifications?recipient=eq.${encodeURIComponent(user)}&read_at=is.null`,
      {
        method: "PATCH",
        headers: supabaseHeaders("return=minimal"),
        body: JSON.stringify({ read_at: new Date().toISOString() })
      }
    );
    return res.ok;
  } catch (e) {
    return false;
  }
}

function renderizarCuerpoComentario(texto) {
  const escaped = escaparHtmlTexto(texto);
  return escaped.replace(
    MENCION_EN_TEXTO_RE,
    (full) => `<span class="robin-mention">${full}</span>`
  );
}

const AVATAR_COLORES = ["#E8DEEE", "#FADEC9", "#D3E5EF", "#DBEDDB", "#FDECC8", "#FFE2DD"];

function obtenerNombreAutorComentario(author) {
  const handle = normalizeRobinUser(author);
  if (typeof obtenerNombreDisplayEquipo === "function") {
    const nombre = obtenerNombreDisplayEquipo(handle);
    if (nombre && !/^@[\w.]+$/i.test(nombre)) return nombre;
  }
  return formatearHandleCanonico(handle);
}

function obtenerInicialesAutor(author, nombreVisible) {
  const nombre = String(nombreVisible || author || "?").trim();
  if (nombre.startsWith("@")) return nombre.replace(/^@/, "").slice(0, 2).toUpperCase();
  const partes = nombre.split(/\s+/).filter(Boolean);
  if (partes.length >= 2) return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
  return nombre.slice(0, 2).toUpperCase();
}

function colorAvatarAutor(author) {
  const handle = normalizeRobinUser(author);
  let hash = 0;
  for (let i = 0; i < handle.length; i++) {
    hash = handle.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORES[Math.abs(hash) % AVATAR_COLORES.length];
}
