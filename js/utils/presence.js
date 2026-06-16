const PRESENCE_MARCA = "ROBIN";
const PRESENCE_ID_PREFIX = "PRESENCE-";
const PRESENCE_ACTIVE_MS = 60000;

function presenceIdForUser(username) {
  const clean = String(username || "").replace(/^@/, "").trim().toLowerCase();
  return `${PRESENCE_ID_PREFIX}${clean}`;
}

function enviarHeartbeatPresencia(apiUrl, usuario, nombreCompleto) {
  if (!apiUrl || !usuario) return Promise.resolve();

  const username = String(usuario).replace(/^@/, "").trim();
  const payload = {
    marca: PRESENCE_MARCA,
    idTarea: presenceIdForUser(username),
    info: nombreCompleto || `@${username}`,
    detalles: String(Date.now()),
    personas: `@${username}`,
    campo: "todo"
  };

  return fetch(apiUrl, {
    method: "POST",
    mode: "cors",
    redirect: "follow",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: JSON.stringify(payload)
  }).catch(() => {});
}

function esFilaPresencia(row) {
  const id = String(row.idTarea || row.id || "").trim().toUpperCase();
  return id.startsWith(PRESENCE_ID_PREFIX);
}

function esWidgetPolluidoPorPresencia(widget) {
  const id = String(widget.id || "").trim().toUpperCase();
  const titulo = String(widget.titulo || "").trim();
  const link = String(widget.link || "").trim();
  if (id.startsWith(PRESENCE_ID_PREFIX)) return true;
  if (/^@[\w.]+$/i.test(titulo) && /^\d{10,13}$/.test(link)) return true;
  return false;
}

function filtrarWidgetsReales(widgets) {
  if (!Array.isArray(widgets)) return [];
  return widgets.filter(w => {
    if (esWidgetPolluidoPorPresencia(w)) return false;
    const link = String(w.link || "").trim();
    return link.startsWith("http://") || link.startsWith("https://");
  });
}

function parsearEntradaPresencia(entry, ahora) {
  const id = String(entry.idTarea || entry.id || "").trim();
  const titulo = String(entry.info || entry.titulo || "").trim();
  const detalles = String(entry.detalles || entry.link || "").trim();
  const personas = String(entry.personas || "").trim();

  let username = "";
  if (id.toUpperCase().startsWith(PRESENCE_ID_PREFIX)) {
    username = id.slice(PRESENCE_ID_PREFIX.length);
  } else if (personas) {
    username = personas.replace(/^@/, "");
  } else if (/^@[\w.]+$/i.test(titulo)) {
    username = titulo.replace(/^@/, "");
  }

  const lastSeen = parseInt(detalles, 10);
  if (!username || !lastSeen || (ahora - lastSeen) > PRESENCE_ACTIVE_MS) return null;

  return {
    uid: id || presenceIdForUser(username),
    username: username.toLowerCase(),
    nombre: titulo || `@${username}`,
    lastSeen
  };
}

function extraerPresenciaDesdeDatos(data, ahoraMs) {
  if (!Array.isArray(data)) return [];

  const ahora = ahoraMs || Date.now();
  const porUsuario = new Map();

  data.forEach(row => {
    if (!esFilaPresencia(row)) return;
    const parsed = parsearEntradaPresencia(row, ahora);
    if (!parsed) return;
    const prev = porUsuario.get(parsed.username);
    if (!prev || parsed.lastSeen > prev.lastSeen) {
      porUsuario.set(parsed.username, parsed);
    }
  });

  return Array.from(porUsuario.values()).sort((a, b) => b.lastSeen - a.lastSeen);
}

function extraerPresenciaDesdeWidgets(widgets, ahoraMs) {
  if (!Array.isArray(widgets)) return [];

  const ahora = ahoraMs || Date.now();
  const porUsuario = new Map();

  widgets.forEach(w => {
    if (!esWidgetPolluidoPorPresencia(w)) return;
    const parsed = parsearEntradaPresencia({
      id: w.id,
      titulo: w.titulo,
      link: w.link
    }, ahora);
    if (!parsed) return;
    const prev = porUsuario.get(parsed.username);
    if (!prev || parsed.lastSeen > prev.lastSeen) {
      porUsuario.set(parsed.username, parsed);
    }
  });

  return Array.from(porUsuario.values()).sort((a, b) => b.lastSeen - a.lastSeen);
}

function combinarPresencia(...listas) {
  const porUsuario = new Map();
  listas.flat().forEach(u => {
    if (!u || !u.username) return;
    const key = u.username.toLowerCase();
    const prev = porUsuario.get(key);
    if (!prev || u.lastSeen > prev.lastSeen) {
      porUsuario.set(key, u);
    }
  });
  return Array.from(porUsuario.values()).sort((a, b) => b.lastSeen - a.lastSeen);
}

function obtenerUsuariosEnLinea(data, widgets, extra) {
  return combinarPresencia(
    extraerPresenciaDesdeDatos(data),
    extraerPresenciaDesdeWidgets(widgets),
    Array.isArray(extra) ? extra : []
  );
}

function obtenerNombrePerfilDesdePresencia(data, username) {
  if (!username || !Array.isArray(data)) return null;

  const idBuscado = presenceIdForUser(username).toUpperCase();
  const row = data.find(t => String(t.idTarea || "").trim().toUpperCase() === idBuscado);
  if (!row) return null;

  const info = String(row.info || "").trim();
  const userClean = String(username).replace(/^@/, "").toLowerCase();
  if (!info) return null;
  if (info.toLowerCase() === `@${userClean}`) return null;
  if (/^@[\w.]+$/i.test(info)) return null;

  return info;
}
