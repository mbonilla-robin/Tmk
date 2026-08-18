const ENTREGABLES_MIGRATION_FLAG = "robin_entregables_migrated_v1";
const ENTREGABLES_PAGE_SIZE = 1000;
const ENTREGABLES_UPSERT_BATCH = 40;

function claveEntregableMigracion(tarea) {
  const importKey = typeof obtenerImportKeyTarea === "function" ? obtenerImportKeyTarea(tarea) : "";
  if (importKey) return `ik:${String(importKey).trim().toLowerCase()}`;
  const id = String(tarea?.idTarea || "").trim();
  if (id) return `id:${id.toLowerCase()}`;
  if (typeof getTaskSelectionKey === "function") {
    return `sel:${String(getTaskSelectionKey(tarea) || "").toLowerCase()}`;
  }
  return `info:${String(tarea?.marca || "").toLowerCase()}|${String(tarea?.info || "").toLowerCase()}`;
}

function idTareaEstableEntregable(tarea) {
  const raw = String(tarea?.idTarea || "").trim();
  if (raw && typeof isValidIdTarea === "function" && isValidIdTarea(raw)) return raw;
  if (raw.startsWith("STB-") || raw.startsWith("IMP-")) return raw;
  if (typeof getTaskSelectionKey === "function") {
    const key = String(getTaskSelectionKey(tarea) || "").trim();
    if (key) return key.slice(0, 120);
  }
  const marca = String(tarea?.marca || "TSK").substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
  return `STB-${marca}-${Date.now().toString(36)}`;
}

function tareaDesdeFilaSupabase(row) {
  if (!row) return null;
  const subcliente = String(row.subcliente || "").trim();
  const flujo = String(row.flujo || "").trim();
  const importKey = String(row.import_key || "").trim();
  const link = String(row.link || "").trim();
  let detalles = String(row.detalles || "");
  if (typeof serializeDetalles === "function" && typeof parseDetalles === "function") {
    const parsed = parseDetalles(detalles);
    detalles = serializeDetalles(
      parsed.notas,
      parsed.subtareas || [],
      parsed.historial || [],
      link || parsed.link,
      subcliente || parsed.subcliente,
      { flujo: flujo || parsed.flujo, importKey: importKey || parsed.importKey }
    );
  }
  const tarea = {
    idTarea: String(row.id_tarea || "").trim(),
    marca: row.marca || "",
    info: row.info || "",
    categoria: row.categoria || "",
    subcliente,
    personas: row.personas || "",
    detalles,
    link,
    estado: row.estado || "Pendiente",
    prioridad: row.prioridad || "Media",
    deadline: row.deadline || "",
    fechaInicio: row.fecha_inicio || "",
    flujo,
    importKey
  };
  return typeof normalizarTareaCampos === "function" ? normalizarTareaCampos(tarea) : tarea;
}

function filaSupabaseDesdeTarea(tarea, usuario) {
  const t = typeof normalizarTareaCampos === "function" ? normalizarTareaCampos(tarea || {}) : (tarea || {});
  const parsed = typeof parseDetalles === "function"
    ? parseDetalles(t.detalles || "")
    : { notas: t.detalles || "", subtareas: [], historial: [], link: t.link, subcliente: t.subcliente, flujo: t.flujo, importKey: t.importKey };
  const subcliente = (typeof obtenerSubclienteTarea === "function" ? obtenerSubclienteTarea(t) : "") || parsed.subcliente || "";
  const flujo = String(t.flujo || parsed.flujo || "").trim();
  const importKey = (typeof obtenerImportKeyTarea === "function" ? obtenerImportKeyTarea(t) : "") || parsed.importKey || "";
  const link = String(t.link || parsed.link || "").trim();
  const detalles = typeof serializeDetalles === "function"
    ? serializeDetalles(parsed.notas, parsed.subtareas || [], parsed.historial || [], link, subcliente, { flujo, importKey })
    : String(t.detalles || "");
  return {
    id_tarea: idTareaEstableEntregable(t),
    marca: String(t.marca || "").trim(),
    info: String(t.info || "").trim(),
    categoria: String(t.categoria || "").trim(),
    subcliente: String(subcliente || "").trim(),
    personas: String(t.personas || "").trim(),
    detalles,
    link,
    estado: String(t.estado || "Pendiente").trim(),
    prioridad: String(t.prioridad || "Media").trim(),
    deadline: String(t.deadline || "").trim(),
    fecha_inicio: String(t.fechaInicio || "").trim(),
    flujo,
    import_key: String(importKey || "").trim(),
    updated_by: String(usuario || "").replace(/^@/, "").trim()
  };
}

function construirTareasDesdePaqueteImport(usuario) {
  if (typeof construirTareaDesdeFilaEstatus !== "function") return [];
  const filas = typeof ESTATUS_LA_SANTE_IMPORT_ROWS !== "undefined" ? ESTATUS_LA_SANTE_IMPORT_ROWS : [];
  return filas
    .filter((fila) => String(fila.entregable || "").trim())
    .map((fila) => {
      const t = construirTareaDesdeFilaEstatus(fila, usuario);
      return typeof normalizarTareaCampos === "function"
        ? normalizarTareaCampos({ ...t, categoria: t.categoria || "Solicitud" })
        : t;
    });
}

function fusionarFuentesEntregables({ importadas, sheets, supabase, locales }) {
  const mapa = new Map();
  const put = (tarea, overwrite) => {
    if (!tarea || !String(tarea.info || "").trim() || !String(tarea.marca || "").trim()) return;
    let key = claveEntregableMigracion(tarea);
    if (!mapa.has(key) && typeof sonLaMismaTarea === "function") {
      for (const [k, existing] of mapa.entries()) {
        if (sonLaMismaTarea(existing, tarea, { estricto: false })) {
          key = k;
          break;
        }
      }
    }
    if (!overwrite && mapa.has(key)) return;
    const prev = mapa.get(key);
    const next = typeof normalizarTareaCampos === "function" ? normalizarTareaCampos({ ...tarea }) : { ...tarea };
    if (prev) {
      if (!next.idTarea && prev.idTarea) next.idTarea = prev.idTarea;
      const prevImport = typeof obtenerImportKeyTarea === "function" ? obtenerImportKeyTarea(prev) : prev.importKey;
      const nextImport = typeof obtenerImportKeyTarea === "function" ? obtenerImportKeyTarea(next) : next.importKey;
      if (!nextImport && prevImport) next.importKey = prevImport;
      if (!next.subcliente && prev.subcliente) next.subcliente = prev.subcliente;
      if (!next.detalles && prev.detalles) next.detalles = prev.detalles;
      if (!next.link && prev.link) next.link = prev.link;
    }
    mapa.set(key, next);
  };

  (importadas || []).forEach((t) => put(t, false));
  (sheets || []).forEach((t) => put(t, true));
  (supabase || []).forEach((t) => put(t, true));
  (locales || []).forEach((t) => {
    const pendiente = (typeof tareaEsPendienteLocal === "function" && tareaEsPendienteLocal(t))
      || (typeof tareaTieneFechasLocalesPendientes === "function" && tareaTieneFechasLocalesPendientes(t));
    const key = claveEntregableMigracion(t);
    if (pendiente || !mapa.has(key)) put(t, true);
  });

  return Array.from(mapa.values());
}

async function cargarEntregablesSupabase() {
  if (typeof entregablesSupabaseListos !== "function" || !entregablesSupabaseListos()) {
    return { ok: false, tareas: [], error: "Supabase de entregables no configurado" };
  }
  const base = getEntregablesSupabaseUrl();
  const tareas = [];
  let from = 0;

  try {
    while (true) {
      const to = from + ENTREGABLES_PAGE_SIZE - 1;
      const res = await fetch(
        `${base}/rest/v1/robin_entregables?select=*&order=updated_at.desc`,
        {
          headers: {
            ...getEntregablesSupabaseHeaders(),
            Range: `${from}-${to}`
          }
        }
      );
      if (!res.ok) {
        const detalle = await res.text();
        return { ok: false, tareas: [], error: detalle.slice(0, 300) || `HTTP ${res.status}` };
      }
      const page = await res.json();
      if (!Array.isArray(page) || !page.length) break;
      page.forEach((row) => {
        const t = tareaDesdeFilaSupabase(row);
        if (t) tareas.push(t);
      });
      if (page.length < ENTREGABLES_PAGE_SIZE) break;
      from += ENTREGABLES_PAGE_SIZE;
    }
    return { ok: true, tareas, error: "" };
  } catch (e) {
    return { ok: false, tareas: [], error: e?.message || String(e) };
  }
}

async function upsertEntregablesSupabase(tareas, usuario) {
  if (typeof entregablesSupabaseListos !== "function" || !entregablesSupabaseListos()) {
    return { ok: false, upserted: 0, error: "Supabase de entregables no configurado" };
  }
  const filas = (tareas || [])
    .map((t) => filaSupabaseDesdeTarea(t, usuario))
    .filter((row) => row.id_tarea && row.marca && row.info);
  if (!filas.length) return { ok: true, upserted: 0, error: "" };

  const base = getEntregablesSupabaseUrl();
  let upserted = 0;

  for (let i = 0; i < filas.length; i += ENTREGABLES_UPSERT_BATCH) {
    const lote = filas.slice(i, i + ENTREGABLES_UPSERT_BATCH);
    try {
      const res = await fetch(
        `${base}/rest/v1/robin_entregables?on_conflict=id_tarea`,
        {
          method: "POST",
          headers: getEntregablesSupabaseHeaders("resolution=merge-duplicates,return=minimal"),
          body: JSON.stringify(lote)
        }
      );
      if (!res.ok) {
        const detalle = await res.text();
        return { ok: false, upserted, error: detalle.slice(0, 400) || `HTTP ${res.status}` };
      }
      upserted += lote.length;
    } catch (e) {
      return { ok: false, upserted, error: e?.message || String(e) };
    }
  }

  return { ok: true, upserted, error: "" };
}

async function borrarEntregableSupabase(idTarea) {
  const id = String(idTarea || "").trim();
  if (!id) return { ok: true };
  if (typeof entregablesSupabaseListos !== "function" || !entregablesSupabaseListos()) {
    return { ok: false, error: "Supabase de entregables no configurado" };
  }
  try {
    const res = await fetch(
      `${getEntregablesSupabaseUrl()}/rest/v1/robin_entregables?id_tarea=eq.${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: getEntregablesSupabaseHeaders("return=minimal")
      }
    );
    if (!res.ok) {
      const detalle = await res.text();
      return { ok: false, error: detalle.slice(0, 300) || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

function yaMigraronEntregablesLocal() {
  return getLocalStorageItemSafe(ENTREGABLES_MIGRATION_FLAG, "") === "1";
}

function marcarMigracionEntregablesLocal() {
  setLocalStorageItemSafe(ENTREGABLES_MIGRATION_FLAG, "1");
}

async function asegurarMigracionYCargarEntregables({ locales, sheets, usuario }) {
  const remoto = await cargarEntregablesSupabase();
  if (!remoto.ok) return remoto;

  const necesitaMigrar = !yaMigraronEntregablesLocal() || !remoto.tareas.length;
  if (!necesitaMigrar) {
    return { ok: true, tareas: remoto.tareas, error: "", migradas: 0 };
  }

  const importadas = construirTareasDesdePaqueteImport(usuario);
  const fusionadas = fusionarFuentesEntregables({
    importadas,
    sheets,
    supabase: remoto.tareas,
    locales
  });
  const escrito = await upsertEntregablesSupabase(fusionadas, usuario);
  if (!escrito.ok) {
    return {
      ok: false,
      tareas: fusionadas.length ? fusionadas : (remoto.tareas || []),
      error: escrito.error,
      migradas: escrito.upserted
    };
  }

  marcarMigracionEntregablesLocal();
  const recarga = await cargarEntregablesSupabase();
  return {
    ok: recarga.ok,
    tareas: recarga.ok ? recarga.tareas : fusionadas,
    error: recarga.error,
    migradas: escrito.upserted
  };
}

function operacionColaEsEntregable(op) {
  const payload = op?.payload || {};
  const id = String(payload.idTarea || op?.taskKey || "").trim().toUpperCase();
  if (id.startsWith("WID-") || id.startsWith("PRESENCE-")) return false;
  if (op?.type === "delete") return true;
  return Boolean(payload.info || payload.marca);
}

async function procesarColaEntregablesSupabase(cola, usuario) {
  const pendientes = (cola || []).filter(operacionColaEsEntregable);
  if (!pendientes.length) {
    return { ok: true, processed: 0, remainingOps: cola || [], errores: [] };
  }

  const restantesNoEntregable = (cola || []).filter((op) => !operacionColaEsEntregable(op));
  const errores = [];
  const fallidas = [];
  const locales = typeof cargarTareasLocales === "function" ? cargarTareasLocales() : [];
  const upserts = [];
  const deletes = [];

  pendientes.forEach((op) => {
    if (op.type === "delete") {
      deletes.push(op);
      return;
    }
    const local = locales.find((t) => typeof tareaCoincideConOperacionSync === "function" && tareaCoincideConOperacionSync(t, op));
    const payload = op.payload || {};
    const tarea = local || {
      idTarea: payload.idTarea || op.taskKey,
      marca: payload.marca,
      info: payload.info,
      categoria: payload.categoria,
      personas: payload.personas,
      detalles: payload.detalles,
      estado: payload.estado,
      deadline: payload.deadline,
      fechaInicio: payload.fechaInicio,
      prioridad: payload.prioridad,
      importKey: payload.importKey
    };
    upserts.push({ op, tarea });
  });

  if (upserts.length) {
    const resultado = await upsertEntregablesSupabase(upserts.map((item) => item.tarea), usuario);
    if (!resultado.ok) {
      upserts.forEach((item) => fallidas.push(item.op));
      errores.push({ type: "upsert", error: resultado.error });
    } else {
      upserts.forEach((item) => {
        if (typeof confirmarTareaLocalTrasSync === "function") {
          confirmarTareaLocalTrasSync(item.op, {
            success: true,
            idTarea: idTareaEstableEntregable(item.tarea)
          });
        }
      });
    }
  }

  for (const op of deletes) {
    const id = String(op.payload?.idTarea || op.taskKey || "").trim();
    const borrado = await borrarEntregableSupabase(id);
    if (!borrado.ok) {
      fallidas.push(op);
      errores.push({ type: "delete", taskKey: op.taskKey, error: borrado.error });
    }
  }

  return {
    ok: fallidas.length === 0,
    processed: pendientes.length - fallidas.length,
    remainingOps: [...restantesNoEntregable, ...fallidas],
    errores
  };
}

window.entregablesSupabaseListos = typeof entregablesSupabaseListos === "function"
  ? entregablesSupabaseListos
  : function () { return false; };
window.cargarEntregablesSupabase = cargarEntregablesSupabase;
window.upsertEntregablesSupabase = upsertEntregablesSupabase;
window.borrarEntregableSupabase = borrarEntregableSupabase;
window.asegurarMigracionYCargarEntregables = asegurarMigracionYCargarEntregables;
window.procesarColaEntregablesSupabase = procesarColaEntregablesSupabase;
window.operacionColaEsEntregable = operacionColaEsEntregable;
window.fusionarFuentesEntregables = fusionarFuentesEntregables;
window.idTareaEstableEntregable = idTareaEstableEntregable;
