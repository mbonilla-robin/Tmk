const SUBCLIENTES_STORAGE_KEY = "robin_subclientes_v1";

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

function normalizarEntradaSubcliente(item) {
  if (!item) return null;
  if (typeof item === "string") {
    const nombre = normalizarNombreSubcliente(item);
    if (!nombre) return null;
    return { marca: "", nombre };
  }
  const nombre = normalizarNombreSubcliente(item.nombre);
  if (!nombre) return null;
  const marca = typeof normalizarMarca === "function"
    ? normalizarMarca(item.marca || "")
    : String(item.marca || "").trim();
  return { marca, nombre };
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

function fusionarListasSubclientes(base, extra) {
  const mapa = new Map();
  const add = (item) => {
    const norm = normalizarEntradaSubcliente(item);
    if (!norm || !norm.nombre) return;
    const key = `${claveMarcaSubcliente(norm.marca)}::${claveSubcliente(norm.nombre)}`;
    if (!mapa.has(key)) mapa.set(key, norm);
  };
  (base || []).forEach(add);
  (extra || []).forEach(add);
  return Array.from(mapa.values()).sort((a, b) => {
    const marcaCmp = String(a.marca || "").localeCompare(String(b.marca || ""), "es");
    if (marcaCmp !== 0) return marcaCmp;
    return a.nombre.localeCompare(b.nombre, "es");
  });
}

function obtenerListaSubclientesDefecto() {
  return SUBCLIENTES_CATALOGO.map((s) => ({ ...s }));
}

function cargarListaSubclientes() {
  try {
    const raw = getLocalStorageItemSafe(SUBCLIENTES_STORAGE_KEY, null);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        return fusionarListasSubclientes(obtenerListaSubclientesDefecto(), parsed);
      }
    }
  } catch (e) {}
  return obtenerListaSubclientesDefecto();
}

function guardarListaSubclientes(lista) {
  const fusionada = fusionarListasSubclientes(obtenerListaSubclientesDefecto(), lista || []);
  try {
    setLocalStorageItemSafe(SUBCLIENTES_STORAGE_KEY, JSON.stringify(fusionada));
  } catch (e) {}
  return fusionada;
}

function registrarSubclientesEnLista(listaActual, entradas) {
  const nuevas = (entradas || [])
    .map(normalizarEntradaSubcliente)
    .filter(Boolean);
  return guardarListaSubclientes(fusionarListasSubclientes(listaActual, nuevas));
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
  const delCatalogo = listarSubclientesPorMarca(lista, marca).map((s) => s.nombre);
  const deTareas = recolectarSubclientesDeTareas(tareas, marca);
  const mapa = new Map();
  [...delCatalogo, ...deTareas].forEach((nombre) => {
    const norm = normalizarNombreSubcliente(nombre);
    if (!norm) return;
    const key = claveSubcliente(norm);
    if (!mapa.has(key)) mapa.set(key, norm);
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
      `${url}/rest/v1/robin_subclientes?select=marca,nombre&order=marca.asc,nombre.asc`,
      { headers: typeof getSupabaseRestHeaders === "function" ? getSupabaseRestHeaders() : {} }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    return data.map((row) => normalizarEntradaSubcliente(row)).filter(Boolean);
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

async function insertarSubclienteRemoto(marca, nombre) {
  if (typeof isSupabaseConfigured !== "function" || !isSupabaseConfigured()) return false;
  const url = typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "";
  if (!url) return false;

  const entrada = normalizarEntradaSubcliente({ marca, nombre });
  if (!entrada || !entrada.marca || !entrada.nombre) return false;

  try {
    const res = await fetch(`${url}/rest/v1/robin_subclientes`, {
      method: "POST",
      headers: typeof getSupabaseRestHeaders === "function"
        ? getSupabaseRestHeaders("return=minimal")
        : { "Content-Type": "application/json" },
      body: JSON.stringify({
        marca: entrada.marca,
        nombre: entrada.nombre
      })
    });
    return res.ok || res.status === 409;
  } catch (e) {
    console.warn("ROBIN: error guardando subcliente remoto", e);
    return false;
  }
}
