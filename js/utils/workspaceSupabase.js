const WORKSPACE_MIGRATION_FLAG = "robin_workspace_migrated_v1";
const WIDGETS_STORAGE_KEY = "robin_widgets_backup_v1";
const MARCAS_STORAGE_KEY = "robin_marcas_backup_v1";

function workspaceSupabaseListo() {
  return typeof entregablesSupabaseListos === "function" && entregablesSupabaseListos();
}

function workspaceHeaders(prefer) {
  return typeof getEntregablesSupabaseHeaders === "function"
    ? getEntregablesSupabaseHeaders(prefer)
    : { "Content-Type": "application/json" };
}

function workspaceUrl(path) {
  const base = typeof getEntregablesSupabaseUrl === "function" ? getEntregablesSupabaseUrl() : "";
  return `${base}/rest/v1/${path}`;
}

function cargarWidgetsLocales() {
  try {
    const parsed = JSON.parse(getLocalStorageItemSafe(WIDGETS_STORAGE_KEY, "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function guardarWidgetsLocales(lista) {
  try {
    setLocalStorageItemSafe(WIDGETS_STORAGE_KEY, JSON.stringify(lista || []));
  } catch (e) { /* ignore */ }
}

function cargarMarcasLocales() {
  try {
    const parsed = JSON.parse(getLocalStorageItemSafe(MARCAS_STORAGE_KEY, "{}"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    return {};
  }
}

function guardarMarcasLocales(mapa) {
  try {
    setLocalStorageItemSafe(MARCAS_STORAGE_KEY, JSON.stringify(mapa || {}));
  } catch (e) { /* ignore */ }
}

function widgetAFilaSupabase(widget, usuario) {
  const w = typeof normalizarWidgetDesdeApi === "function" ? normalizarWidgetDesdeApi(widget) : widget;
  if (!w || !w.id) return null;
  return {
    id: String(w.id).trim(),
    titulo: String(w.titulo || "").trim(),
    link: String(w.link || "").trim(),
    icon: String(w.icon || "link").trim(),
    color: String(w.color || "sky").trim(),
    seccion: String(w.seccion || "robin").trim(),
    marca: String(w.marca || "").trim(),
    updated_by: String(usuario || "").replace(/^@/, "").trim()
  };
}

function widgetDesdeFilaSupabase(row) {
  if (!row) return null;
  const raw = {
    id: row.id,
    titulo: row.titulo,
    link: row.link,
    icon: row.icon,
    color: row.color,
    seccion: row.seccion,
    marca: row.marca
  };
  return typeof normalizarWidgetDesdeApi === "function" ? normalizarWidgetDesdeApi(raw) : raw;
}

function marcaAFilaSupabase(nombre, meta, usuario) {
  const m = typeof normalizarMetadataMarcaEntry === "function"
    ? normalizarMetadataMarcaEntry(meta)
    : (meta || {});
  const marca = typeof formatearMarca === "function" ? formatearMarca(nombre) : String(nombre || "").trim();
  if (!marca) return null;
  return {
    marca,
    cliente_directo: String(m.clienteDirecto || "").trim(),
    ejecutivos: Array.isArray(m.ejecutivos) ? m.ejecutivos : [],
    disenadores: Array.isArray(m.disenadores) ? m.disenadores : [],
    content_equipo: Array.isArray(m.contentEquipo) ? m.contentEquipo : [],
    notas: String(m.notas || "").trim(),
    metadata: m,
    updated_by: String(usuario || "").replace(/^@/, "").trim()
  };
}

function marcaDesdeFilaSupabase(row) {
  if (!row) return null;
  const nombre = typeof formatearMarca === "function" ? formatearMarca(row.marca) : String(row.marca || "").trim();
  const meta = typeof normalizarMetadataMarcaEntry === "function"
    ? normalizarMetadataMarcaEntry({
      clienteDirecto: row.cliente_directo,
      ejecutivos: row.ejecutivos,
      disenadores: row.disenadores,
      contentEquipo: row.content_equipo,
      notas: row.notas,
      ...(row.metadata && typeof row.metadata === "object" ? row.metadata : {})
    })
    : row.metadata;
  return { nombre, meta };
}

function filasPresenciaDesdeSupabase(rows) {
  return (rows || []).map((row) => ({
    idTarea: typeof presenceIdForUser === "function"
      ? presenceIdForUser(row.username)
      : `PRESENCE-${row.username}`,
    info: row.nombre || `@${row.username}`,
    detalles: String(row.last_seen_ms || ""),
    personas: `@${row.username}`
  }));
}

async function sbGet(path) {
  const res = await fetch(workspaceUrl(path), { headers: workspaceHeaders() });
  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(detalle.slice(0, 300) || `HTTP ${res.status}`);
  }
  return res.json();
}

async function sbUpsert(table, rows, onConflict) {
  const lista = Array.isArray(rows) ? rows.filter(Boolean) : [];
  if (!lista.length) return { ok: true };
  const res = await fetch(
    `${workspaceUrl(table)}?on_conflict=${encodeURIComponent(onConflict)}`,
    {
      method: "POST",
      headers: workspaceHeaders("resolution=merge-duplicates,return=minimal"),
      body: JSON.stringify(lista)
    }
  );
  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(detalle.slice(0, 400) || `HTTP ${res.status}`);
  }
  return { ok: true };
}

async function sbDelete(table, query) {
  const res = await fetch(`${workspaceUrl(table)}?${query}`, {
    method: "DELETE",
    headers: workspaceHeaders("return=minimal")
  });
  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(detalle.slice(0, 300) || `HTTP ${res.status}`);
  }
  return { ok: true };
}

async function cargarWidgetsSupabase() {
  const data = await sbGet("robin_widgets?select=*&order=titulo.asc");
  return (Array.isArray(data) ? data : []).map(widgetDesdeFilaSupabase).filter(Boolean);
}

async function upsertWidgetsSupabase(widgets, usuario) {
  const filas = (widgets || []).map((w) => widgetAFilaSupabase(w, usuario)).filter(Boolean);
  await sbUpsert("robin_widgets", filas, "id");
  return { ok: true, count: filas.length };
}

async function borrarWidgetSupabase(id) {
  const clean = String(id || "").trim();
  if (!clean) return { ok: true };
  await sbDelete("robin_widgets", `id=eq.${encodeURIComponent(clean)}`);
  return { ok: true };
}

async function cargarMarcasSupabase() {
  const data = await sbGet("robin_marcas?select=*&order=marca.asc");
  const mapa = {};
  (Array.isArray(data) ? data : []).forEach((row) => {
    const parsed = marcaDesdeFilaSupabase(row);
    if (parsed && parsed.nombre) mapa[parsed.nombre] = parsed.meta;
  });
  return mapa;
}

async function upsertMarcaSupabase(nombre, meta, usuario) {
  const fila = marcaAFilaSupabase(nombre, meta, usuario);
  if (!fila) return { ok: false, error: "Marca inválida" };
  await sbUpsert("robin_marcas", [fila], "marca");
  return { ok: true };
}

async function upsertMarcasSupabase(mapa, usuario) {
  const filas = Object.keys(mapa || {}).map((nombre) => marcaAFilaSupabase(nombre, mapa[nombre], usuario)).filter(Boolean);
  await sbUpsert("robin_marcas", filas, "marca");
  return { ok: true, count: filas.length };
}

async function borrarMarcaSupabase(nombre) {
  const marca = typeof formatearMarca === "function" ? formatearMarca(nombre) : String(nombre || "").trim();
  if (!marca) return { ok: true };
  await sbDelete("robin_marcas", `marca=eq.${encodeURIComponent(marca)}`);
  try {
    await sbDelete("robin_entregables", `marca=eq.${encodeURIComponent(marca)}`);
  } catch (e) { /* ignore */ }
  return { ok: true };
}

async function cargarPresenciaSupabase() {
  const data = await sbGet("robin_presencia?select=*&order=last_seen_ms.desc");
  const filas = filasPresenciaDesdeSupabase(Array.isArray(data) ? data : []);
  return typeof extraerPresenciaDesdeDatos === "function"
    ? extraerPresenciaDesdeDatos(filas)
    : filas;
}

async function enviarHeartbeatPresenciaSupabase(usuario, nombreCompleto) {
  const username = String(usuario || "").replace(/^@/, "").trim().toLowerCase();
  if (!username || !workspaceSupabaseListo()) return { ok: false };
  const nombre = String(nombreCompleto || "").trim() || `@${username}`;
  await sbUpsert("robin_presencia", [{
    username,
    nombre,
    last_seen_ms: Date.now()
  }], "username");
  return { ok: true };
}

function yaMigraronWorkspaceLocal() {
  return getLocalStorageItemSafe(WORKSPACE_MIGRATION_FLAG, "") === "1";
}

function yaMigraronEntregablesLocal() {
  return getLocalStorageItemSafe("robin_entregables_migrated_v1", "") === "1";
}

function necesitaSemillaSheets() {
  return !yaMigraronWorkspaceLocal() || !yaMigraronEntregablesLocal();
}

async function intentarSemillaDesdeSheets() {
  const vacio = { skipped: true, widgets: [], marcas: {}, tareas: [], auth: null };
  if (!necesitaSemillaSheets()) return vacio;
  if (typeof isApiConfigured !== "function" || !isApiConfigured()) return vacio;
  if (typeof hasRobinApiSession === "function" && !hasRobinApiSession()) return vacio;
  if (typeof fetchRobinApi !== "function" || typeof getConfiguredApiUrl !== "function") return vacio;

  try {
    const res = await fetchRobinApi(getConfiguredApiUrl(), {
      method: "GET",
      mode: "cors",
      redirect: "follow",
      cache: "no-store"
    });
    const rawText = await res.text();
    const json = JSON.parse(rawText);
    if (!json || json.success !== true || !json.data) return vacio;

    const widgets = yaMigraronWorkspaceLocal()
      ? []
      : (typeof filtrarWidgetsReales === "function"
        ? filtrarWidgetsReales(json.widgets || [])
        : (json.widgets || [])).map((w) => (
          typeof normalizarWidgetDesdeApi === "function" ? normalizarWidgetDesdeApi(w) : w
        )).filter(Boolean);

    const marcas = {};
    if (!yaMigraronWorkspaceLocal() && json.marcasMetadata) {
      Object.keys(json.marcasMetadata).forEach((k) => {
        const nombre = typeof formatearMarca === "function" ? formatearMarca(k) : k;
        marcas[nombre] = typeof normalizarMetadataMarcaEntry === "function"
          ? normalizarMetadataMarcaEntry(json.marcasMetadata[k])
          : json.marcasMetadata[k];
      });
    }

    const tareas = (!yaMigraronEntregablesLocal() && typeof normalizarTareasDesdeApi === "function")
      ? normalizarTareasDesdeApi(json.data)
      : [];

    return { skipped: false, widgets, marcas, tareas, auth: json.auth || null };
  } catch (e) {
    return { ...vacio, error: e?.message || String(e) };
  }
}

function operacionColaEsWidget(op) {
  const payload = op?.payload || {};
  const id = String(payload.idTarea || "").trim().toUpperCase();
  const marca = String(payload.marca || "").trim();
  if (id.startsWith("WID-")) return true;
  return marca === "Config_Marcas";
}

function operacionColaEsPresencia(op) {
  const id = String(op?.payload?.idTarea || "").trim().toUpperCase();
  return id.startsWith("PRESENCE-");
}

async function procesarColaWorkspaceSupabase(cola, usuario) {
  const widgets = [];
  const deletes = [];
  const remaining = [];

  (cola || []).forEach((op) => {
    if (operacionColaEsPresencia(op)) return;
    if (!operacionColaEsWidget(op)) {
      remaining.push(op);
      return;
    }
    if (op.type === "delete" || String(op.payload?.campo || "").toLowerCase() === "eliminar") {
      deletes.push(op);
      return;
    }
    widgets.push(op);
  });

  const errores = [];
  const fallidas = [];

  if (widgets.length) {
    const lista = widgets.map((op) => {
      const p = op.payload || {};
      return {
        id: p.idTarea,
        titulo: p.info,
        link: p.detalles,
        categoria: p.categoria,
        color: p.personas,
        marca: p.widgetMarca || ""
      };
    });
    try {
      await upsertWidgetsSupabase(lista, usuario);
    } catch (e) {
      fallidas.push(...widgets);
      errores.push({ type: "widget", error: e?.message || String(e) });
    }
  }

  for (const op of deletes) {
    try {
      await borrarWidgetSupabase(op.payload?.idTarea);
    } catch (e) {
      fallidas.push(op);
      errores.push({ type: "widget-delete", error: e?.message || String(e) });
    }
  }

  return {
    ok: fallidas.length === 0,
    processed: widgets.length + deletes.length - fallidas.length,
    remainingOps: [...remaining, ...fallidas],
    errores
  };
}

function marcarMigracionWorkspaceLocal() {
  setLocalStorageItemSafe(WORKSPACE_MIGRATION_FLAG, "1");
}

function fusionarWidgets(base, extra) {
  const mapa = new Map();
  [...(base || []), ...(extra || [])].forEach((w) => {
    const n = typeof normalizarWidgetDesdeApi === "function" ? normalizarWidgetDesdeApi(w) : w;
    if (!n || !n.id) return;
    if (typeof esWidgetPolluidoPorPresencia === "function" && esWidgetPolluidoPorPresencia(n)) return;
    mapa.set(String(n.id), n);
  });
  return Array.from(mapa.values());
}

function fusionarMarcas(base, extra) {
  const mapa = { ...(base || {}) };
  Object.keys(extra || {}).forEach((k) => {
    const nombre = typeof formatearMarca === "function" ? formatearMarca(k) : k;
    const meta = typeof normalizarMetadataMarcaEntry === "function"
      ? normalizarMetadataMarcaEntry(extra[k])
      : extra[k];
    mapa[nombre] = meta;
  });
  return mapa;
}

async function asegurarMigracionYCargarWorkspace({ sheetsWidgets, sheetsMarcas, usuario }) {
  const localWidgets = cargarWidgetsLocales();
  const localMarcas = cargarMarcasLocales();
  let remotosWidgets = [];
  let remotasMarcas = {};
  let presencia = [];
  let error = "";

  try {
    remotosWidgets = await cargarWidgetsSupabase();
    remotasMarcas = await cargarMarcasSupabase();
    presencia = await cargarPresenciaSupabase();
  } catch (e) {
    error = e?.message || String(e);
  }

  const sheetsW = (sheetsWidgets || []).map((w) => (
    typeof normalizarWidgetDesdeApi === "function" ? normalizarWidgetDesdeApi(w) : w
  )).filter(Boolean);
  const sheetsM = {};
  Object.keys(sheetsMarcas || {}).forEach((k) => {
    const nombre = typeof formatearMarca === "function" ? formatearMarca(k) : k;
    sheetsM[nombre] = typeof normalizarMetadataMarcaEntry === "function"
      ? normalizarMetadataMarcaEntry(sheetsMarcas[k])
      : sheetsMarcas[k];
  });

  const widgets = fusionarWidgets(fusionarWidgets(sheetsW, remotosWidgets), localWidgets);
  const marcas = fusionarMarcas(fusionarMarcas(sheetsM, remotasMarcas), localMarcas);

  const necesitaSubir = !yaMigraronWorkspaceLocal()
    || (!remotosWidgets.length && widgets.length)
    || (!Object.keys(remotasMarcas).length && Object.keys(marcas).length);

  if (necesitaSubir && workspaceSupabaseListo()) {
    try {
      if (widgets.length) await upsertWidgetsSupabase(widgets, usuario);
      if (Object.keys(marcas).length) await upsertMarcasSupabase(marcas, usuario);
      marcarMigracionWorkspaceLocal();
    } catch (e) {
      error = e?.message || String(e);
    }
  } else if (remotosWidgets.length || Object.keys(remotasMarcas).length) {
    marcarMigracionWorkspaceLocal();
  }

  guardarWidgetsLocales(widgets);
  guardarMarcasLocales(marcas);
  return { ok: !error || widgets.length || Object.keys(marcas).length, widgets, marcas, presencia, error };
}

window.workspaceSupabaseListo = workspaceSupabaseListo;
window.cargarWidgetsLocales = cargarWidgetsLocales;
window.guardarWidgetsLocales = guardarWidgetsLocales;
window.cargarMarcasLocales = cargarMarcasLocales;
window.guardarMarcasLocales = guardarMarcasLocales;
window.cargarWidgetsSupabase = cargarWidgetsSupabase;
window.upsertWidgetsSupabase = upsertWidgetsSupabase;
window.borrarWidgetSupabase = borrarWidgetSupabase;
window.cargarMarcasSupabase = cargarMarcasSupabase;
window.upsertMarcaSupabase = upsertMarcaSupabase;
window.borrarMarcaSupabase = borrarMarcaSupabase;
window.cargarPresenciaSupabase = cargarPresenciaSupabase;
window.enviarHeartbeatPresenciaSupabase = enviarHeartbeatPresenciaSupabase;
window.asegurarMigracionYCargarWorkspace = asegurarMigracionYCargarWorkspace;
window.filasPresenciaDesdeSupabase = filasPresenciaDesdeSupabase;
window.intentarSemillaDesdeSheets = intentarSemillaDesdeSheets;
window.necesitaSemillaSheets = necesitaSemillaSheets;
window.procesarColaWorkspaceSupabase = procesarColaWorkspaceSupabase;
window.operacionColaEsWidget = operacionColaEsWidget;
