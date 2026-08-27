const SUBCLIENTES_STORAGE_KEY = "robin_subclientes_v1";
const SUBCLIENTES_ELIMINADOS_KEY = "robin_subclientes_eliminados_v1";

/** Catálogo base por marca. La Santé: cadenas del estatus / CSV interno. */
const SUBCLIENTES_CATALOGO = [
  { marca: "La Santé", nombre: "ALAMO" },
  { marca: "La Santé", nombre: "ANALPER" },
  { marca: "La Santé", nombre: "BIGFARMA" },
  { marca: "La Santé", nombre: "CAMPAÑA ESOZ" },
  { marca: "La Santé", nombre: "CRISTALMED" },
  { marca: "La Santé", nombre: "FARMA EXPRESS" },
  { marca: "La Santé", nombre: "FARMA INFANTE NINA ROSA" },
  { marca: "La Santé", nombre: "FARMA INFANTE SUC EL SOMBRERO" },
  { marca: "La Santé", nombre: "FARMA INFANTE SUC INFANTE" },
  { marca: "La Santé", nombre: "FARMA INFANTE SUC INFANTE ORGANICA" },
  { marca: "La Santé", nombre: "FARMACIA AHINOA" },
  { marca: "La Santé", nombre: "FARMACIA GRUPO INSIDE" },
  { marca: "La Santé", nombre: "FARMACIA RUIZ PINEDA" },
  { marca: "La Santé", nombre: "FARMACIA RUPERTO LUGO" },
  { marca: "La Santé", nombre: "FARMACIA SAMÁN DE PERIJÁ" },
  { marca: "La Santé", nombre: "FARMACIA TIENDA PERFECTA" },
  { marca: "La Santé", nombre: "FARMACIA VENCEDORA" },
  { marca: "La Santé", nombre: "FARMACIA XXX" },
  { marca: "La Santé", nombre: "FARMACIA YA" },
  { marca: "La Santé", nombre: "FARMAECONOMICA" },
  { marca: "La Santé", nombre: "FARMAEXPRESS MARGARITA" },
  { marca: "La Santé", nombre: "FARMAGO" },
  { marca: "La Santé", nombre: "FARMAMIGO" },
  { marca: "La Santé", nombre: "FARMANUTRY" },
  { marca: "La Santé", nombre: "FARMATODO" },
  { marca: "La Santé", nombre: "FARMAX" },
  { marca: "La Santé", nombre: "FRANLUIS" },
  { marca: "La Santé", nombre: "GAMA" },
  { marca: "La Santé", nombre: "GRUPO PEREIRA" },
  { marca: "La Santé", nombre: "GRUPO TODO HOGAR" },
  { marca: "La Santé", nombre: "LA SANTÉ" },
  { marca: "La Santé", nombre: "LOCATEL" },
  { marca: "La Santé", nombre: "MARAPLUS" },
  { marca: "La Santé", nombre: "MI FARMA PF" },
  { marca: "La Santé", nombre: "MULTIMARCA" },
  { marca: "La Santé", nombre: "OTC" },
  { marca: "La Santé", nombre: "PROBIÓTICOS" },
  { marca: "La Santé", nombre: "Rattan Margarita" },
  { marca: "La Santé", nombre: "SAN ANSELMO" },
  { marca: "La Santé", nombre: "XANA" }
];

function claveSubcliente(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function claveDomSubcliente(nombre) {
  return claveSubcliente(nombre).replace(/\s+/g, "-");
}

function claveMarcaSubcliente(marca) {
  if (typeof normalizarMarcaKey === "function") {
    try {
      return normalizarMarcaKey(marca) || claveSubcliente(marca);
    } catch (e) {}
  }
  return claveSubcliente(marca);
}

function normalizarNombreSubcliente(valor) {
  const limpio = String(valor || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!limpio || limpio.length > 48) return "";
  if (/<|>|;|\|/.test(limpio)) return "";
  return limpio;
}

function esNombreSubclienteNuevoValido(valor) {
  const limpio = normalizarNombreSubcliente(valor);
  if (!limpio) return false;
  if (limpio.length < 2) return false;
  return true;
}

function normalizarPrioridadSubcliente(valor) {
  if (typeof normalizarPrioridad === "function") {
    const n = normalizarPrioridad(valor);
    if (n === "Alta" || n === "Media" || n === "Baja") return n;
  }
  const limpio = String(valor || "").trim();
  if (limpio === "Alta" || limpio === "Media" || limpio === "Baja") return limpio;
  return "Media";
}

function normalizarLinkSubcliente(valor) {
  return String(valor || "").trim().slice(0, 2000);
}

function normalizarEntradaSubcliente(item) {
  if (!item) return null;
  if (typeof item === "string") {
    const nombre = normalizarNombreSubcliente(item);
    if (!nombre) return null;
    return { marca: "", nombre, prioridad: "Media", link: "" };
  }
  const nombre = normalizarNombreSubcliente(item.nombre);
  if (!nombre) return null;
  const marca = typeof normalizarMarca === "function"
    ? normalizarMarca(item.marca || "")
    : String(item.marca || "").trim();
  const tienePrioridad = item.prioridad != null && String(item.prioridad).trim() !== "";
  const tieneLink = item.link != null && String(item.link).trim() !== "";
  return {
    marca,
    nombre,
    prioridad: normalizarPrioridadSubcliente(item.prioridad),
    link: normalizarLinkSubcliente(item.link),
    _metaPrioridad: tienePrioridad,
    _metaLink: tieneLink
  };
}

function limpiarMetaFlagsSubcliente(entrada) {
  if (!entrada || typeof entrada !== "object") return entrada;
  const { _metaPrioridad, _metaLink, ...rest } = entrada;
  return rest;
}

function subclientesCoinciden(a, b) {
  const ca = claveSubcliente(a);
  const cb = claveSubcliente(b);
  return Boolean(ca && cb && ca === cb);
}

function obtenerSubclienteTarea(tarea) {
  if (!tarea) return "";
  const fromField = normalizarNombreSubcliente(tarea.subcliente);
  if (fromField) return fromField;
  if (typeof parseDetalles === "function") {
    return normalizarNombreSubcliente(parseDetalles(tarea.detalles || "").subcliente || "");
  }
  return "";
}

function preferirCasingSubcliente(actual, entrante) {
  if (!entrante) return actual || "";
  if (!actual) return entrante;
  if (actual === entrante) return actual;
  const upA = (String(actual).match(/[A-ZÁÉÍÓÚÜÑ]/g) || []).length;
  const upB = (String(entrante).match(/[A-ZÁÉÍÓÚÜÑ]/g) || []).length;
  if (upB !== upA) return upB > upA ? entrante : actual;
  return entrante;
}

function fusionarListasSubclientes(base, extra) {
  const mapa = new Map();
  const add = (item, preferIncoming) => {
    const raw = normalizarEntradaSubcliente(item);
    if (!raw || !raw.nombre) return;
    const metaPrioridad = Boolean(raw._metaPrioridad);
    const metaLink = Boolean(raw._metaLink);
    const norm = limpiarMetaFlagsSubcliente(raw);
    const key = `${claveMarcaSubcliente(norm.marca)}::${claveSubcliente(norm.nombre)}`;
    if (!mapa.has(key)) {
      mapa.set(key, norm);
      return;
    }
    if (!preferIncoming) return;
    const prev = mapa.get(key);
    mapa.set(key, {
      ...prev,
      marca: norm.marca || prev.marca,
      nombre: preferirCasingSubcliente(prev.nombre, norm.nombre),
      prioridad: metaPrioridad ? norm.prioridad : (prev.prioridad || norm.prioridad || "Media"),
      link: metaLink ? norm.link : (prev.link || norm.link || "")
    });
  };
  (base || []).forEach((item) => add(item, false));
  (extra || []).forEach((item) => add(item, true));
  return Array.from(mapa.values()).sort((a, b) => {
    const marcaCmp = String(a.marca || "").localeCompare(String(b.marca || ""), "es");
    if (marcaCmp !== 0) return marcaCmp;
    return a.nombre.localeCompare(b.nombre, "es");
  });
}

function obtenerListaSubclientesDefecto() {
  return SUBCLIENTES_CATALOGO.map((s) => limpiarMetaFlagsSubcliente(normalizarEntradaSubcliente(s))).filter(Boolean);
}

function obtenerEntradaSubcliente(lista, marca, nombre) {
  const marcaKey = claveMarcaSubcliente(marca);
  const nombreKey = claveSubcliente(nombre);
  if (!nombreKey) return null;
  return (lista || []).find((s) => {
    if (!s) return false;
    if (marcaKey && claveMarcaSubcliente(s.marca) !== marcaKey) return false;
    return claveSubcliente(s.nombre) === nombreKey;
  }) || null;
}

function actualizarMetaSubclienteEnLista(lista, marca, nombre, meta = {}) {
  const entradaBase = normalizarEntradaSubcliente({
    marca,
    nombre,
    prioridad: meta.prioridad,
    link: meta.link
  });
  if (!entradaBase) return lista || [];
  const limpia = limpiarMetaFlagsSubcliente(entradaBase);
  const key = `${claveMarcaSubcliente(limpia.marca)}::${claveSubcliente(limpia.nombre)}`;
  let encontrado = false;
  const next = (lista || []).map((s) => {
    const k = `${claveMarcaSubcliente(s.marca)}::${claveSubcliente(s.nombre)}`;
    if (k !== key) return s;
    encontrado = true;
    return {
      ...s,
      ...limpia,
      nombre: preferirCasingSubcliente(s.nombre, limpia.nombre),
      prioridad: meta.prioridad != null ? limpia.prioridad : (s.prioridad || limpia.prioridad),
      link: meta.link != null ? limpia.link : (s.link || limpia.link)
    };
  });
  if (!encontrado) next.push(limpia);
  return guardarListaSubclientes(next);
}

function cargarClavesSubclientesEliminados() {
  try {
    const raw = getLocalStorageItemSafe(SUBCLIENTES_ELIMINADOS_KEY, null);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch (_) {
    return [];
  }
}

function guardarClavesSubclientesEliminados(claves) {
  const unicas = Array.from(new Set((claves || []).map(String).filter(Boolean)));
  try {
    setLocalStorageItemSafe(SUBCLIENTES_ELIMINADOS_KEY, JSON.stringify(unicas));
  } catch (_) {}
  return unicas;
}

function filtrarSubclientesNoEliminados(lista, eliminadosOpt) {
  const eliminados = eliminadosOpt instanceof Set
    ? eliminadosOpt
    : new Set(eliminadosOpt || cargarClavesSubclientesEliminados());
  return (lista || []).filter((s) => {
    const key = claveEntradaSubcliente(s);
    return Boolean(key) && !eliminados.has(key);
  });
}

function cargarListaSubclientes() {
  try {
    const raw = getLocalStorageItemSafe(SUBCLIENTES_STORAGE_KEY, null);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        return filtrarSubclientesNoEliminados(
          fusionarListasSubclientes(obtenerListaSubclientesDefecto(), parsed)
        );
      }
    }
  } catch (e) {}
  return filtrarSubclientesNoEliminados(obtenerListaSubclientesDefecto());
}

function guardarListaSubclientes(lista) {
  const fusionada = filtrarSubclientesNoEliminados(
    fusionarListasSubclientes(obtenerListaSubclientesDefecto(), lista || [])
  );
  try {
    setLocalStorageItemSafe(SUBCLIENTES_STORAGE_KEY, JSON.stringify(fusionada));
  } catch (e) {}
  return fusionada;
}

function registrarSubclientesEnLista(listaActual, entradas, opciones = {}) {
  const forzar = Boolean(opciones && opciones.forzar);
  const eliminados = new Set(cargarClavesSubclientesEliminados());
  let nuevas = (entradas || [])
    .map(normalizarEntradaSubcliente)
    .filter(Boolean);
  if (forzar && nuevas.length) {
    const keysForzar = new Set(nuevas.map((n) => claveEntradaSubcliente(n)).filter(Boolean));
    if (keysForzar.size) {
      guardarClavesSubclientesEliminados(
        [...eliminados].filter((k) => !keysForzar.has(k))
      );
    }
  } else if (eliminados.size) {
    nuevas = nuevas.filter((n) => !eliminados.has(claveEntradaSubcliente(n)));
  }
  if (!nuevas.length) {
    return filtrarSubclientesNoEliminados(listaActual || []);
  }
  return guardarListaSubclientes(fusionarListasSubclientes(listaActual, nuevas));
}

function eliminarSubclienteDeLista(listaActual, marca, nombre) {
  const entrada = normalizarEntradaSubcliente({ marca, nombre });
  if (!entrada || !entrada.nombre) return filtrarSubclientesNoEliminados(listaActual || []);
  const key = claveEntradaSubcliente(entrada);
  if (key) {
    const eliminados = cargarClavesSubclientesEliminados();
    if (!eliminados.includes(key)) {
      guardarClavesSubclientesEliminados([...eliminados, key]);
    }
  }
  const filtrada = (listaActual || []).filter((s) => claveEntradaSubcliente(s) !== key);
  return guardarListaSubclientes(filtrada);
}

function listarTareasDeSubcliente(tareas, marca, nombre) {
  const nombreNorm = normalizarNombreSubcliente(nombre);
  if (!nombreNorm) return [];
  return (tareas || []).filter((t) => {
    if (!t) return false;
    if (marca && typeof marcasCoinciden === "function" && !marcasCoinciden(t.marca, marca)) return false;
    return subclientesCoinciden(obtenerSubclienteTarea(t), nombreNorm);
  });
}

function contarTareasDeSubcliente(tareas, marca, nombre) {
  return listarTareasDeSubcliente(tareas, marca, nombre).length;
}

function aplicarNuevoSubclienteATarea(tarea, nuevoSubcliente) {
  if (!tarea || typeof tarea !== "object") return tarea;
  const subNorm = normalizarNombreSubcliente(nuevoSubcliente);
  let parsed = {
    notas: "",
    notes: "",
    subtareas: [],
    historial: [],
    link: "",
    flujo: "",
    importKey: "",
    envioTipo: "",
    pendienteCor: false,
    medidas: null
  };
  try {
    if (typeof parseDetalles === "function") {
      parsed = parseDetalles(tarea.detalles || "") || parsed;
    }
  } catch (_) {}
  const extras = typeof extrasDetallesCon === "function"
    ? extrasDetallesCon(parsed)
    : {
      flujo: parsed.flujo || "",
      importKey: parsed.importKey || "",
      envioTipo: parsed.envioTipo || "",
      pendienteCor: Boolean(parsed.pendienteCor),
      medidas: parsed.medidas || null
    };
  const detalles = typeof serializeDetalles === "function"
    ? serializeDetalles(
      parsed.notas || parsed.notes || "",
      parsed.subtareas || [],
      parsed.historial || [],
      parsed.link || tarea.link || "",
      subNorm,
      extras
    )
    : (tarea.detalles || "");
  return {
    ...tarea,
    subcliente: subNorm,
    detalles
  };
}

function listarSubclientesPorMarca(lista, marca) {
  const clave = claveMarcaSubcliente(marca);
  if (!clave) return [];
  return (lista || []).filter((s) => claveMarcaSubcliente(s.marca) === clave);
}

function recolectarSubclientesDeTareas(tareas, marca) {
  const nombres = [];
  (tareas || []).forEach((t) => {
    if (marca && typeof marcasCoinciden === "function" && !marcasCoinciden(t.marca, marca)) return;
    const nombre = obtenerSubclienteTarea(t);
    if (!nombre) return;
    if (!nombres.some((n) => subclientesCoinciden(n, nombre))) {
      nombres.push(nombre);
    }
  });
  return nombres.sort((a, b) => a.localeCompare(b, "es"));
}

function claveEntradaSubcliente(item) {
  const norm = normalizarEntradaSubcliente(item);
  if (!norm || !norm.nombre) return "";
  return `${claveMarcaSubcliente(norm.marca)}::${claveSubcliente(norm.nombre)}`;
}

function recolectarEntradasSubclientesDeTareas(tareas) {
  const mapa = new Map();
  (tareas || []).forEach((t) => {
    const nombre = obtenerSubclienteTarea(t);
    if (!nombre) return;
    const marca = typeof normalizarMarca === "function"
      ? normalizarMarca(t.marca || "")
      : String(t.marca || "").trim();
    if (!marca) return;
    const entrada = { marca, nombre };
    const key = claveEntradaSubcliente(entrada);
    if (key && !mapa.has(key)) mapa.set(key, entrada);
  });
  return Array.from(mapa.values());
}

function filtrarEntradasSubclientesNuevas(lista, entradas) {
  const existentes = new Set(
    (lista || []).map((s) => claveEntradaSubcliente(s)).filter(Boolean)
  );
  return (entradas || [])
    .map(normalizarEntradaSubcliente)
    .filter((n) => n && n.nombre && n.marca && !existentes.has(claveEntradaSubcliente(n)));
}

function listarSubclientesDisponiblesParaMarca(lista, marca, tareas) {
  const eliminados = new Set(cargarClavesSubclientesEliminados());
  const delCatalogo = listarSubclientesPorMarca(lista, marca).map((s) => s.nombre);
  const deTareas = recolectarSubclientesDeTareas(tareas, marca);
  const mapa = new Map();
  [...delCatalogo, ...deTareas].forEach((nombre) => {
    const norm = normalizarNombreSubcliente(nombre);
    if (!norm) return;
    const keyEntrada = claveEntradaSubcliente({ marca, nombre: norm });
    if (keyEntrada && eliminados.has(keyEntrada)) return;
    const key = claveSubcliente(norm);
    if (!mapa.has(key)) {
      mapa.set(key, norm);
      return;
    }
    if (typeof preferirCasingSubcliente === "function") {
      mapa.set(key, preferirCasingSubcliente(mapa.get(key), norm));
    }
  });
  return Array.from(mapa.values()).sort((a, b) => a.localeCompare(b, "es"));
}

function marcaTieneSubclientes(lista, marca, tareas) {
  return listarSubclientesDisponiblesParaMarca(lista, marca, tareas).length > 0;
}

function agruparTareasPorSubcliente(tareas, marca) {
  const grupos = new Map();
  (tareas || []).forEach((t) => {
    if (marca && typeof marcasCoinciden === "function" && !marcasCoinciden(t.marca, marca)) return;
    const nombre = obtenerSubclienteTarea(t);
    if (!nombre) return;
    const key = claveSubcliente(nombre);
    if (!grupos.has(key)) {
      grupos.set(key, { nombre, tareas: [] });
    } else if (typeof preferirCasingSubcliente === "function") {
      grupos.get(key).nombre = preferirCasingSubcliente(grupos.get(key).nombre, nombre);
    }
    grupos.get(key).tareas.push(t);
  });
  return Array.from(grupos.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

async function cargarSubclientesRemotos() {
  if (typeof isSupabaseConfigured !== "function" || !isSupabaseConfigured()) return null;
  const url = typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "";
  if (!url) return null;

  try {
    const res = await fetch(
      `${url}/rest/v1/robin_subclientes?select=marca,nombre,prioridad,link&order=marca.asc,nombre.asc`,
      { headers: typeof getSupabaseRestHeaders === "function" ? getSupabaseRestHeaders() : {} }
    );
    if (!res.ok) {
      // Fallback si la migración de meta aún no está aplicada
      const resBasic = await fetch(
        `${url}/rest/v1/robin_subclientes?select=marca,nombre&order=marca.asc,nombre.asc`,
        { headers: typeof getSupabaseRestHeaders === "function" ? getSupabaseRestHeaders() : {} }
      );
      if (!resBasic.ok) return null;
      const dataBasic = await resBasic.json();
      if (!Array.isArray(dataBasic)) return null;
      return dataBasic.map((row) => limpiarMetaFlagsSubcliente(normalizarEntradaSubcliente(row))).filter(Boolean);
    }
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    return data.map((row) => limpiarMetaFlagsSubcliente(normalizarEntradaSubcliente(row))).filter(Boolean);
  } catch (e) {
    console.warn("ROBIN: error cargando subclientes remotos", e);
    return null;
  }
}

function pesoEstadoHermanasSubcliente(tarea) {
  const estado = typeof cleanEstado === "function" ? cleanEstado(tarea?.estado) : "";
  if (estado === "completada" || estado === "suspendido") return 2;
  if (estado === "en pausa") return 1;
  return 0;
}

function listarTareasMismoSubcliente(tarea, tareas, opciones = {}) {
  const sub = opciones.subcliente != null
    ? normalizarNombreSubcliente(opciones.subcliente)
    : obtenerSubclienteTarea(tarea);
  const marca = opciones.marca != null ? opciones.marca : tarea?.marca;
  if (!sub) return [];

  return (tareas || [])
    .filter((t) => {
      if (!t) return false;
      if (typeof sonLaMismaTarea === "function" && sonLaMismaTarea(tarea, t)) return false;
      if (typeof marcasCoinciden === "function" && !marcasCoinciden(marca, t.marca)) return false;
      return subclientesCoinciden(sub, obtenerSubclienteTarea(t));
    })
    .sort((a, b) => {
      const pa = pesoEstadoHermanasSubcliente(a);
      const pb = pesoEstadoHermanasSubcliente(b);
      if (pa !== pb) return pa - pb;
      const ta = typeof obtenerTiempoFecha === "function" ? obtenerTiempoFecha(a.deadline) : Infinity;
      const tb = typeof obtenerTiempoFecha === "function" ? obtenerTiempoFecha(b.deadline) : Infinity;
      if (ta !== tb) return ta - tb;
      const tituloA = typeof tituloDisplayTarea === "function" ? tituloDisplayTarea(a) : String(a.info || "");
      const tituloB = typeof tituloDisplayTarea === "function" ? tituloDisplayTarea(b) : String(b.info || "");
      return tituloA.localeCompare(tituloB, "es");
    });
}

async function insertarSubclienteRemoto(marca, nombre, meta = {}) {
  if (typeof isSupabaseConfigured !== "function" || !isSupabaseConfigured()) return false;
  const url = typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "";
  if (!url) return false;

  const entrada = limpiarMetaFlagsSubcliente(normalizarEntradaSubcliente({
    marca,
    nombre,
    prioridad: meta.prioridad,
    link: meta.link
  }));
  if (!entrada || !entrada.marca || !entrada.nombre) return false;

  const body = {
    marca: entrada.marca,
    nombre: entrada.nombre,
    prioridad: entrada.prioridad || "Media",
    link: entrada.link || ""
  };

  try {
    const res = await fetch(`${url}/rest/v1/robin_subclientes`, {
      method: "POST",
      headers: typeof getSupabaseRestHeaders === "function"
        ? getSupabaseRestHeaders("return=minimal")
        : { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (res.ok || res.status === 409) return true;
    // Fallback sin columnas meta
    const resBasic = await fetch(`${url}/rest/v1/robin_subclientes`, {
      method: "POST",
      headers: typeof getSupabaseRestHeaders === "function"
        ? getSupabaseRestHeaders("return=minimal")
        : { "Content-Type": "application/json" },
      body: JSON.stringify({ marca: entrada.marca, nombre: entrada.nombre })
    });
    return resBasic.ok || resBasic.status === 409;
  } catch (e) {
    console.warn("ROBIN: error guardando subcliente remoto", e);
    return false;
  }
}

async function actualizarSubclienteRemoto(marca, nombre, meta = {}) {
  if (typeof isSupabaseConfigured !== "function" || !isSupabaseConfigured()) return false;
  const url = typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "";
  if (!url) return false;

  const entrada = limpiarMetaFlagsSubcliente(normalizarEntradaSubcliente({ marca, nombre }));
  if (!entrada || !entrada.marca || !entrada.nombre) return false;

  const patch = {};
  if (meta.prioridad != null) patch.prioridad = normalizarPrioridadSubcliente(meta.prioridad);
  if (meta.link != null) patch.link = normalizarLinkSubcliente(meta.link);
  if (!Object.keys(patch).length) return true;

  try {
    const qs = new URLSearchParams({
      marca: `eq.${entrada.marca}`,
      nombre: `eq.${entrada.nombre}`
    });
    const res = await fetch(`${url}/rest/v1/robin_subclientes?${qs.toString()}`, {
      method: "PATCH",
      headers: typeof getSupabaseRestHeaders === "function"
        ? getSupabaseRestHeaders("return=minimal")
        : { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(patch)
    });
    if (res.ok) return true;
    // Si no existe fila aún, insertar con meta
    if (res.status === 404 || res.status === 406) {
      return insertarSubclienteRemoto(entrada.marca, entrada.nombre, {
        prioridad: patch.prioridad,
        link: patch.link
      });
    }
    return false;
  } catch (e) {
    console.warn("ROBIN: error actualizando subcliente remoto", e);
    return false;
  }
}

async function eliminarSubclienteRemoto(marca, nombre) {
  if (typeof isSupabaseConfigured !== "function" || !isSupabaseConfigured()) return false;
  const url = typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "";
  if (!url) return false;

  const entrada = normalizarEntradaSubcliente({ marca, nombre });
  if (!entrada || !entrada.marca || !entrada.nombre) return false;

  try {
    const qs = new URLSearchParams({
      marca: `eq.${entrada.marca}`,
      nombre: `eq.${entrada.nombre}`
    });
    const res = await fetch(`${url}/rest/v1/robin_subclientes?${qs.toString()}`, {
      method: "DELETE",
      headers: typeof getSupabaseRestHeaders === "function"
        ? getSupabaseRestHeaders("return=minimal")
        : { "Content-Type": "application/json", Prefer: "return=minimal" }
    });
    return res.ok || res.status === 404;
  } catch (e) {
    console.warn("ROBIN: error eliminando subcliente remoto", e);
    return false;
  }
}
