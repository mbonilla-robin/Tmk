/**
 * Persistencia de informes de entregables en Supabase (robin_informes).
 */

const INFORME_STATUS = {
  borrador: "borrador",
  con_ia: "con_ia",
  exportado: "exportado"
};

const INFORME_STATUS_LABEL = {
  borrador: "Borrador",
  con_ia: "Con IA",
  exportado: "Exportado"
};

const INFORME_LOCAL_MIGRATED_KEY = "robin_informe_borrador_migrado_v1";

function informeStoreConfigured() {
  try {
    return typeof isSupabaseConfigured === "function" && isSupabaseConfigured();
  } catch (_) {
    return false;
  }
}

function informeStoreHeaders(prefer) {
  if (typeof getSupabaseRestHeaders === "function") {
    return getSupabaseRestHeaders(prefer);
  }
  return { "Content-Type": "application/json" };
}

function informeStoreBaseUrl() {
  return typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "";
}

function normalizarUsuarioInforme(val) {
  if (typeof normalizeRobinUsername === "function") {
    return normalizeRobinUsername(val);
  }
  return String(val || "").replace(/^@/, "").trim().toLowerCase();
}

function usuarioActualInforme() {
  if (typeof getRobinApiUsername === "function") {
    const u = normalizarUsuarioInforme(getRobinApiUsername());
    if (u) return u;
  }
  if (typeof getInicialUsuario === "function") {
    return normalizarUsuarioInforme(getInicialUsuario());
  }
  return "";
}

function derivarStatusInforme(informe, { wasExported = false, prevStatus = null } = {}) {
  if (wasExported || prevStatus === INFORME_STATUS.exportado) {
    return INFORME_STATUS.exportado;
  }
  const tieneAi = typeof informeTieneRedaccionAi === "function"
    ? informeTieneRedaccionAi(informe)
    : Boolean(informe?.aiGenerado);
  if (tieneAi || informe?.aiGenerado) return INFORME_STATUS.con_ia;
  return INFORME_STATUS.borrador;
}

function filasSelectInforme() {
  return "id,author_username,marca,titulo,mes_desde,mes_hasta,status,payload,exported_at,created_at,updated_at";
}

function mapRowInforme(row) {
  if (!row) return null;
  const payload = row.payload && typeof row.payload === "object"
    ? (typeof normalizarInformeDesdeBorrador === "function"
      ? normalizarInformeDesdeBorrador(row.payload)
      : row.payload)
    : (typeof crearInformeVacio === "function"
      ? crearInformeVacio(row.marca || "Gama")
      : null);
  return {
    id: row.id,
    authorUsername: row.author_username || "",
    marca: row.marca || payload?.marca || "",
    titulo: row.titulo || payload?.titulo || "INFORME ENTREGABLES",
    mesDesde: row.mes_desde || payload?.mesDesde || "",
    mesHasta: row.mes_hasta || payload?.mesHasta || "",
    status: row.status || INFORME_STATUS.borrador,
    statusLabel: INFORME_STATUS_LABEL[row.status] || row.status || "Borrador",
    payload,
    exportedAt: row.exported_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    ejesCount: (payload?.macros?.length || 0) + (payload?.micros?.length || 0)
  };
}

function buildInformeRow(informe, {
  authorUsername,
  status,
  exportedAt = null
} = {}) {
  const copia = typeof normalizarInformeDesdeBorrador === "function"
    ? normalizarInformeDesdeBorrador(informe)
    : (informe || {});
  const st = status || derivarStatusInforme(copia);
  const row = {
    author_username: authorUsername || usuarioActualInforme(),
    marca: String(copia.marca || ""),
    titulo: String(copia.titulo || "INFORME ENTREGABLES"),
    mes_desde: String(copia.mesDesde || ""),
    mes_hasta: String(copia.mesHasta || ""),
    status: st,
    payload: copia,
    updated_at: new Date().toISOString()
  };
  if (exportedAt) row.exported_at = exportedAt;
  else if (st === INFORME_STATUS.exportado && !exportedAt) {
    /* keep existing exported_at on update unless provided */
  }
  return row;
}

async function listarInformes({ limite = 100 } = {}) {
  if (!informeStoreConfigured()) return [];
  const params = [
    `select=${filasSelectInforme()}`,
    "order=updated_at.desc",
    `limit=${Math.max(1, Number(limite) || 100)}`
  ];
  try {
    const res = await fetch(
      `${informeStoreBaseUrl()}/rest/v1/robin_informes?${params.join("&")}`,
      { headers: informeStoreHeaders() }
    );
    if (!res.ok) {
      console.warn("ROBIN: error listando informes", res.status, await res.text());
      return [];
    }
    const rows = await res.json();
    return (Array.isArray(rows) ? rows : []).map(mapRowInforme).filter(Boolean);
  } catch (err) {
    console.warn("ROBIN: error listando informes", err);
    return [];
  }
}

async function obtenerInforme(id) {
  if (!informeStoreConfigured() || !id) return null;
  try {
    const res = await fetch(
      `${informeStoreBaseUrl()}/rest/v1/robin_informes?id=eq.${encodeURIComponent(id)}&select=${filasSelectInforme()}&limit=1`,
      { headers: informeStoreHeaders() }
    );
    if (!res.ok) {
      console.warn("ROBIN: error obteniendo informe", res.status, await res.text());
      return null;
    }
    const rows = await res.json();
    return mapRowInforme(Array.isArray(rows) ? rows[0] : null);
  } catch (err) {
    console.warn("ROBIN: error obteniendo informe", err);
    return null;
  }
}

async function crearInforme(informe, { status, exportedAt = null } = {}) {
  if (!informeStoreConfigured()) {
    return { ok: false, error: "Supabase no configurado" };
  }
  const author = usuarioActualInforme();
  if (!author) {
    return { ok: false, error: "Usuario no identificado" };
  }
  const body = buildInformeRow(informe, {
    authorUsername: author,
    status: status || derivarStatusInforme(informe, { wasExported: Boolean(exportedAt) }),
    exportedAt
  });
  if (exportedAt) body.exported_at = exportedAt;
  try {
    const res = await fetch(
      `${informeStoreBaseUrl()}/rest/v1/robin_informes?select=${filasSelectInforme()}`,
      {
        method: "POST",
        headers: informeStoreHeaders("return=representation"),
        body: JSON.stringify(body)
      }
    );
    if (!res.ok) {
      const detalle = await res.text();
      console.warn("ROBIN: error creando informe", res.status, detalle);
      return { ok: false, error: detalle || `Error ${res.status}` };
    }
    const rows = await res.json();
    const mapped = mapRowInforme(Array.isArray(rows) ? rows[0] : rows);
    return { ok: true, informe: mapped };
  } catch (err) {
    console.warn("ROBIN: error creando informe", err);
    return { ok: false, error: String(err?.message || err) };
  }
}

async function actualizarInforme(id, informe, {
  status,
  exportedAt = null,
  prevStatus = null,
  markExported = false
} = {}) {
  if (!informeStoreConfigured() || !id) {
    return { ok: false, error: "Falta id o Supabase" };
  }
  const author = usuarioActualInforme();
  const nextStatus = status
    || derivarStatusInforme(informe, {
      wasExported: markExported,
      prevStatus
    });
  const body = buildInformeRow(informe, {
    authorUsername: author || undefined,
    status: nextStatus,
    exportedAt: markExported ? (exportedAt || new Date().toISOString()) : exportedAt
  });
  if (markExported) {
    body.exported_at = exportedAt || new Date().toISOString();
    body.status = INFORME_STATUS.exportado;
  }
  // No sobrescribir author en updates si no tenemos usuario
  if (!author) delete body.author_username;

  try {
    const res = await fetch(
      `${informeStoreBaseUrl()}/rest/v1/robin_informes?id=eq.${encodeURIComponent(id)}&select=${filasSelectInforme()}`,
      {
        method: "PATCH",
        headers: informeStoreHeaders("return=representation"),
        body: JSON.stringify(body)
      }
    );
    if (!res.ok) {
      const detalle = await res.text();
      console.warn("ROBIN: error actualizando informe", res.status, detalle);
      return { ok: false, error: detalle || `Error ${res.status}` };
    }
    const rows = await res.json();
    const mapped = mapRowInforme(Array.isArray(rows) ? rows[0] : rows);
    return { ok: true, informe: mapped };
  } catch (err) {
    console.warn("ROBIN: error actualizando informe", err);
    return { ok: false, error: String(err?.message || err) };
  }
}

async function guardarInformeEnNube(id, informe, opts = {}) {
  if (id) return actualizarInforme(id, informe, opts);
  return crearInforme(informe, opts);
}

async function eliminarInforme(id, { soloPropio = true } = {}) {
  if (!informeStoreConfigured() || !id) {
    return { ok: false, error: "Falta id o Supabase" };
  }
  const author = usuarioActualInforme();
  const filters = [`id=eq.${encodeURIComponent(id)}`];
  if (soloPropio && author) {
    filters.push(`author_username=eq.${encodeURIComponent(author)}`);
  }
  try {
    const res = await fetch(
      `${informeStoreBaseUrl()}/rest/v1/robin_informes?${filters.join("&")}`,
      {
        method: "DELETE",
        headers: informeStoreHeaders("return=minimal")
      }
    );
    if (!res.ok) {
      const detalle = await res.text();
      console.warn("ROBIN: error eliminando informe", res.status, detalle);
      return { ok: false, error: detalle || `Error ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.warn("ROBIN: error eliminando informe", err);
    return { ok: false, error: String(err?.message || err) };
  }
}

function resumenInformes(lista) {
  const items = Array.isArray(lista) ? lista : [];
  const byStatus = {
    borrador: 0,
    con_ia: 0,
    exportado: 0
  };
  const marcas = new Map();
  items.forEach((inf) => {
    if (byStatus[inf.status] != null) byStatus[inf.status] += 1;
    const m = inf.marca || "Sin marca";
    marcas.set(m, (marcas.get(m) || 0) + 1);
  });
  return {
    total: items.length,
    borrador: byStatus.borrador,
    con_ia: byStatus.con_ia,
    exportado: byStatus.exportado,
    marcas: Array.from(marcas.entries())
      .map(([nombre, count]) => ({ nombre, count }))
      .sort((a, b) => b.count - a.count)
  };
}

async function migrarBorradorLocalSiExiste() {
  if (!informeStoreConfigured()) return { ok: false, skipped: true };
  try {
    const already = typeof getLocalStorageItemSafe === "function"
      ? getLocalStorageItemSafe(INFORME_LOCAL_MIGRATED_KEY)
      : localStorage.getItem(INFORME_LOCAL_MIGRATED_KEY);
    if (already === "1") return { ok: true, skipped: true };

    const draft = typeof cargarBorradorInforme === "function" ? cargarBorradorInforme() : null;
    if (!draft?.informe) {
      if (typeof setLocalStorageItemSafe === "function") {
        setLocalStorageItemSafe(INFORME_LOCAL_MIGRATED_KEY, "1");
      } else {
        try { localStorage.setItem(INFORME_LOCAL_MIGRATED_KEY, "1"); } catch (_) { /* ignore */ }
      }
      return { ok: true, skipped: true };
    }

    const ejes = [...(draft.informe.macros || []), ...(draft.informe.micros || [])];
    const tieneContenido = ejes.some((e) => e?.titulo || e?.notas || e?.redactado)
      || Boolean(draft.informe.sugerenciasNotas)
      || (draft.informe.sugerenciasBullets || []).length > 0;
    if (!tieneContenido) {
      if (typeof setLocalStorageItemSafe === "function") {
        setLocalStorageItemSafe(INFORME_LOCAL_MIGRATED_KEY, "1");
      } else {
        try { localStorage.setItem(INFORME_LOCAL_MIGRATED_KEY, "1"); } catch (_) { /* ignore */ }
      }
      return { ok: true, skipped: true };
    }

    const res = await crearInforme(draft.informe);
    if (!res.ok) return res;

    if (typeof borrarBorradorInforme === "function") borrarBorradorInforme();
    if (typeof setLocalStorageItemSafe === "function") {
      setLocalStorageItemSafe(INFORME_LOCAL_MIGRATED_KEY, "1");
    } else {
      try { localStorage.setItem(INFORME_LOCAL_MIGRATED_KEY, "1"); } catch (_) { /* ignore */ }
    }
    return { ok: true, informe: res.informe, migrated: true };
  } catch (err) {
    console.warn("ROBIN: error migrando borrador local", err);
    return { ok: false, error: String(err?.message || err) };
  }
}

/** Firma estable de ejes para comparar borrador local vs nube. */
function fingerprintEjesInforme(informe) {
  const ejes = [...(informe?.macros || []), ...(informe?.micros || [])];
  const titulos = ejes
    .map((e) => String(e?.titulo || "").trim().toLowerCase())
    .filter(Boolean)
    .sort();
  return `${titulos.length}:${titulos.join("|")}`;
}

function resumenBorradorLocalInforme() {
  const draft = typeof cargarBorradorInforme === "function" ? cargarBorradorInforme() : null;
  if (!draft?.informe) return null;
  const ejes = [...(draft.informe.macros || []), ...(draft.informe.micros || [])];
  const tieneContenido = ejes.some((e) => e?.titulo || e?.notas || e?.redactado)
    || Boolean(draft.informe.sugerenciasNotas)
    || (draft.informe.sugerenciasBullets || []).length > 0;
  if (!tieneContenido) return null;
  return {
    savedAt: draft.savedAt || null,
    marca: draft.informe.marca || "",
    ejesCount: ejes.length,
    titulos: ejes.map((e) => String(e?.titulo || "").trim()).filter(Boolean),
    fingerprint: fingerprintEjesInforme(draft.informe),
    informe: draft.informe
  };
}

/** true si el borrador local no coincide con ningún informe de la lista nube. */
function borradorLocalDistintoDeNube(lista) {
  const local = resumenBorradorLocalInforme();
  if (!local) return null;
  const rows = Array.isArray(lista) ? lista : [];
  const match = rows.some((row) => fingerprintEjesInforme(row?.payload) === local.fingerprint);
  if (match) return null;
  return local;
}

/** Sube el borrador local como informe NUEVO (no pisa los de la nube). */
async function subirBorradorLocalComoNuevoInforme() {
  const local = resumenBorradorLocalInforme();
  if (!local?.informe) return { ok: false, error: "No hay borrador local" };
  const res = await crearInforme(local.informe, {
    status: derivarStatusInforme(local.informe)
  });
  if (!res.ok) return res;
  if (typeof borrarBorradorInforme === "function") borrarBorradorInforme();
  if (typeof setLocalStorageItemSafe === "function") {
    setLocalStorageItemSafe(INFORME_LOCAL_MIGRATED_KEY, "1");
  } else {
    try { localStorage.setItem(INFORME_LOCAL_MIGRATED_KEY, "1"); } catch (_) { /* ignore */ }
  }
  return { ok: true, informe: res.informe };
}

window.INFORME_STATUS = INFORME_STATUS;
window.INFORME_STATUS_LABEL = INFORME_STATUS_LABEL;
window.listarInformes = listarInformes;
window.obtenerInforme = obtenerInforme;
window.crearInforme = crearInforme;
window.actualizarInforme = actualizarInforme;
window.guardarInformeEnNube = guardarInformeEnNube;
window.eliminarInforme = eliminarInforme;
window.derivarStatusInforme = derivarStatusInforme;
window.resumenInformes = resumenInformes;
window.migrarBorradorLocalSiExiste = migrarBorradorLocalSiExiste;
window.mapRowInforme = mapRowInforme;
window.fingerprintEjesInforme = fingerprintEjesInforme;
window.resumenBorradorLocalInforme = resumenBorradorLocalInforme;
window.borradorLocalDistintoDeNube = borradorLocalDistintoDeNube;
window.subirBorradorLocalComoNuevoInforme = subirBorradorLocalComoNuevoInforme;
