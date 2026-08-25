const CATEGORIAS_STORAGE_KEY = "robin_categorias_v2";
const SEPARADOR_TITULO_CATEGORIA = " | ";

const PALETA_COLORES_CATEGORIA = [
  "violet", "emerald", "sky", "pink", "indigo", "orange", "amber", "teal", "rose", "cyan", "lime", "zinc"
];

const ESTILOS_CATEGORIA = {
  violet: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  sky: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", dot: "bg-sky-500" },
  pink: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200", dot: "bg-pink-500" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", dot: "bg-indigo-500" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-500" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
  teal: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200", dot: "bg-teal-500" },
  rose: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500" },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200", dot: "bg-cyan-500" },
  lime: { bg: "bg-lime-50", text: "text-lime-700", border: "border-lime-200", dot: "bg-lime-500" },
  zinc: { bg: "bg-zinc-100", text: "text-zinc-600", border: "border-zinc-200", dot: "bg-zinc-400" }
};

const CATEGORIAS_CATALOGO = [
  { nombre: "Solicitud", color: "sky", orden: 1 },
  { nombre: "Arte", color: "pink", orden: 2 },
  { nombre: "Reunión", color: "cyan", orden: 3 },
  { nombre: "Propuesta", color: "violet", orden: 4 },
  { nombre: "Robin", color: "orange", orden: 5 },
  { nombre: "Ideas", color: "lime", orden: 6 },
  { nombre: "Diseño", color: "indigo", orden: 7 },
  { nombre: "Finanzas", color: "emerald", orden: 8 },
  { nombre: "Proyecto", color: "teal", orden: 9 },
  { nombre: "PDV", color: "amber", orden: 10 },
  { nombre: "Presupuesto", color: "rose", orden: 11 },
  { nombre: "POP", color: "zinc", orden: 12 },
  { nombre: "ODC", color: "zinc", orden: 13 },
  { nombre: "Adaptación", color: "orange", orden: 14 },
  { nombre: "Otro", color: "zinc", orden: 15 }
];

const CATEGORIAS_SHEET_VALIDAS = ["Reunión", "Solicitud", "Visita PDV", "Ideas", "Otro", "Robin"];

function categoriaParaSheet(categoria) {
  const parsed = parseCategoriasTarea(categoria);
  const primera = parsed.principal || (parsed.subcategorias && parsed.subcategorias[0]) || "";
  const raw = String(primera || categoria || "").trim().replace(/^[,;\s]+/, "");
  if (CATEGORIAS_SHEET_VALIDAS.includes(raw)) return raw;
  const clave = claveCategoria(raw);
  if (clave === "reunion") return "Reunión";
  if (clave === "solicitud") return "Solicitud";
  if (clave === "visitapdv" || clave === "pdv" || clave === "visita") return "Visita PDV";
  if (clave === "ideas") return "Ideas";
  if (clave === "robin") return "Robin";
  if (clave === "otro") return "Otro";
  return "Solicitud";
}

const CATEGORIAS_INVALIDAS = new Set([
  "pagopendiente",
  "status",
  "contenido",
  "produccion",
  "revision"
]);

function claveCategoria(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
}

const CATEGORIAS_ALIAS_A_CANONICA = (() => {
  const map = {};
  const add = (alias, canonico) => {
    const clave = claveCategoria(alias);
    if (clave) map[clave] = canonico;
  };

  CATEGORIAS_CATALOGO.forEach((c) => add(c.nombre, c.nombre));

  add("ROBIN", "Robin");
  add("Reunion", "Reunión");
  add("Diseno", "Diseño");
  add("Adaptacion", "Adaptación");
  add("PPTO", "Presupuesto");
  add("Ppto", "Presupuesto");
  add("PPTO Totem", "Presupuesto");
  add("Cotizacion", "Presupuesto");
  add("Cotización", "Presupuesto");
  add("Visita PDV", "PDV");
  add("Visita", "PDV");
  add("visita", "PDV");
  add("POP", "POP");
  add("Pop", "POP");
  add("ODC", "ODC");
  add("Odc", "ODC");
  add("Solicitud a finanzas para garantizar pago a proveedor", "Finanzas");

  add("Pago pendiente", null);
  add("Status", null);

  return map;
})();

function resolverCategoriaCanonica(valor) {
  const clave = claveCategoria(valor);
  if (!clave || CATEGORIAS_INVALIDAS.has(clave)) return null;
  if (Object.prototype.hasOwnProperty.call(CATEGORIAS_ALIAS_A_CANONICA, clave)) {
    return CATEGORIAS_ALIAS_A_CANONICA[clave];
  }
  if (clave.length > 24) return null;
  return null;
}

function normalizarNombreCategoria(valor) {
  const canon = resolverCategoriaCanonica(valor);
  if (canon) return canon;
  const limpio = String(valor || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!limpio || limpio.length > 24 || /\s/.test(limpio)) return "";
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

function esNombreCategoriaNuevaValido(valor) {
  const limpio = String(valor || "").trim();
  if (!limpio || limpio.length > 24) return false;
  if (/,|;|\|/.test(limpio)) return false;
  if (limpio.split(/\s+/).length > 1) return false;
  return Boolean(normalizarNombreCategoria(limpio) || resolverCategoriaCanonica(limpio));
}

function parseCategoriasTarea(raw) {
  if (!raw) return { principal: "", subcategorias: [] };
  const str = String(raw).trim();
  // Prefijo ", ..." = categorías sin principal (no van al título).
  const sinPrincipal = /^[,;]/.test(str);
  const partes = str.split(/[,;]|\s+y\s+/i);
  const unicas = [];
  partes.forEach((p) => {
    const canon = resolverCategoriaCanonica(p.trim()) || normalizarNombreCategoria(p.trim());
    if (canon && !unicas.some((u) => claveCategoria(u) === claveCategoria(canon))) {
      unicas.push(canon);
    }
  });
  if (sinPrincipal || unicas.length === 0) {
    return { principal: "", subcategorias: unicas };
  }
  return {
    principal: unicas[0] || "",
    subcategorias: unicas.slice(1)
  };
}

function serializarCategoriasTarea(principal, subcategorias) {
  const principalNorm = resolverCategoriaCanonica(principal) || normalizarNombreCategoria(principal) || "";
  const resto = (subcategorias || [])
    .map((c) => resolverCategoriaCanonica(c) || normalizarNombreCategoria(c))
    .filter(Boolean);
  const unicas = [];
  const push = (p) => {
    if (p && !unicas.some((u) => claveCategoria(u) === claveCategoria(p))) unicas.push(p);
  };
  if (principalNorm) {
    push(principalNorm);
    resto.forEach(push);
    return unicas.join(", ");
  }
  resto.forEach(push);
  // Sin estrella: guardar con coma inicial para no tratar la primera como principal.
  return unicas.length ? `, ${unicas.join(", ")}` : "";
}

function partesCampoCategorias(raw) {
  const { principal, subcategorias } = parseCategoriasTarea(raw);
  return [principal, ...subcategorias].filter(Boolean);
}

function aplicarCategoriaAlTitulo(tituloLimpio, categoriaPrincipal) {
  const limpio = String(tituloLimpio || "").trim();
  const cat = resolverCategoriaCanonica(categoriaPrincipal) || normalizarNombreCategoria(categoriaPrincipal);
  if (!cat) return limpio;
  const sinPrefijo = extraerTituloLimpio(limpio, cat);
  if (!sinPrefijo) return `${cat}${SEPARADOR_TITULO_CATEGORIA}`;
  return `${cat}${SEPARADOR_TITULO_CATEGORIA}${sinPrefijo}`;
}

function extraerTituloLimpio(info, categoriaHint) {
  const raw = String(info || "").trim();
  if (!raw) return "";

  const hint = typeof categoriaHint === "string"
    ? (parseCategoriasTarea(categoriaHint).principal || categoriaHint)
    : "";
  const cat = resolverCategoriaCanonica(hint) || normalizarNombreCategoria(hint);

  if (cat) {
    const prefijo = `${cat}${SEPARADOR_TITULO_CATEGORIA}`;
    if (raw.toLowerCase().startsWith(prefijo.toLowerCase())) {
      return raw.slice(prefijo.length).trim();
    }
  }

  const match = raw.match(/^([^|]+)\s*\|\s*(.+)$/);
  if (match) return match[2].trim();

  return raw;
}

function limpiarTareaCategorias(tarea) {
  let parsed = parseCategoriasTarea(tarea.categoria);
  let infoBase = String(tarea.info || "").trim();

  const match = infoBase.match(/^([^|]+)\s*\|\s*(.+)$/);
  if (match) {
    const desdeTitulo = resolverCategoriaCanonica(match[1].trim()) || normalizarNombreCategoria(match[1].trim());
    infoBase = match[2].trim();
    if (desdeTitulo) {
      if (!parsed.principal) {
        parsed = { principal: desdeTitulo, subcategorias: parsed.subcategorias };
      } else if (
        claveCategoria(desdeTitulo) !== claveCategoria(parsed.principal) &&
        !parsed.subcategorias.some((s) => claveCategoria(s) === claveCategoria(desdeTitulo))
      ) {
        parsed = {
          principal: parsed.principal,
          subcategorias: [desdeTitulo, ...parsed.subcategorias]
        };
      }
    }
  }

  const categoria = serializarCategoriasTarea(parsed.principal, parsed.subcategorias);
  const info = aplicarCategoriaAlTitulo(extraerTituloLimpio(infoBase, categoria), parsed.principal);
  return { ...tarea, categoria, info };
}

function prepararTareaConCategoria(tarea) {
  return limpiarTareaCategorias(tarea);
}

function normalizarEntradaCategoria(entrada) {
  if (!entrada) return null;
  if (typeof entrada === "string") {
    const nombre = resolverCategoriaCanonica(entrada) || normalizarNombreCategoria(entrada);
    if (!nombre) return null;
    return { nombre, color: asignarColorCategoria(nombre, CATEGORIAS_CATALOGO) };
  }
  const nombre = resolverCategoriaCanonica(entrada.nombre) || normalizarNombreCategoria(entrada.nombre);
  if (!nombre) return null;
  return {
    nombre,
    color: entrada.color && ESTILOS_CATEGORIA[entrada.color] ? entrada.color : asignarColorCategoria(nombre, CATEGORIAS_CATALOGO)
  };
}

function asignarColorCategoria(nombre, listaExistente) {
  const existente = (listaExistente || []).find((c) => claveCategoria(c.nombre) === claveCategoria(nombre));
  if (existente && existente.color) return existente.color;
  const clave = claveCategoria(nombre);
  let hash = 0;
  for (let i = 0; i < clave.length; i++) {
    hash = ((hash << 5) - hash) + clave.charCodeAt(i);
    hash |= 0;
  }
  return PALETA_COLORES_CATEGORIA[Math.abs(hash) % PALETA_COLORES_CATEGORIA.length];
}

function obtenerEstiloCategoria(color) {
  return ESTILOS_CATEGORIA[color] || ESTILOS_CATEGORIA.zinc;
}

function obtenerEstiloCategoriaPorNombre(nombre, listaCategorias) {
  const clave = claveCategoria(nombre);
  const encontrada = (listaCategorias || []).find((c) => claveCategoria(c.nombre) === clave);
  return obtenerEstiloCategoria(encontrada ? encontrada.color : asignarColorCategoria(nombre, listaCategorias));
}

function fusionarListasCategorias(base, extra) {
  const mapa = new Map();
  (base || []).forEach((item) => {
    const norm = normalizarEntradaCategoria(item);
    if (norm) mapa.set(claveCategoria(norm.nombre), norm);
  });
  (extra || []).forEach((item) => {
    const norm = normalizarEntradaCategoria(item);
    if (norm && !mapa.has(claveCategoria(norm.nombre))) {
      mapa.set(claveCategoria(norm.nombre), norm);
    }
  });
  return Array.from(mapa.values()).sort((a, b) => {
    const ordenA = a.orden || 999;
    const ordenB = b.orden || 999;
    if (ordenA !== ordenB) return ordenA - ordenB;
    return a.nombre.localeCompare(b.nombre, "es");
  });
}

function obtenerListaCategoriasDefecto() {
  return CATEGORIAS_CATALOGO.map((c) => ({ ...c }));
}

function cargarListaCategorias() {
  try {
    const raw = getLocalStorageItemSafe(CATEGORIAS_STORAGE_KEY, null);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        return fusionarListasCategorias(obtenerListaCategoriasDefecto(), parsed);
      }
    }
  } catch (e) {}
  return obtenerListaCategoriasDefecto();
}

function guardarListaCategorias(lista) {
  const fusionada = fusionarListasCategorias(obtenerListaCategoriasDefecto(), lista || []);
  try {
    setLocalStorageItemSafe(CATEGORIAS_STORAGE_KEY, JSON.stringify(fusionada));
    removeLocalStorageItemSafe("robin_categorias_v1");
  } catch (e) {}
  return fusionada;
}

function registrarCategoriasEnLista(listaActual, entradas) {
  const nuevas = (entradas || [])
    .map(normalizarEntradaCategoria)
    .filter(Boolean);
  return guardarListaCategorias(fusionarListasCategorias(listaActual, nuevas));
}

async function cargarCategoriasRemotas() {
  if (typeof isSupabaseConfigured !== "function" || !isSupabaseConfigured()) return null;
  const url = typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "";
  if (!url) return null;

  try {
    const res = await fetch(
      `${url}/rest/v1/robin_categorias?select=nombre,color,orden&order=orden.asc,nombre.asc`,
      { headers: typeof getSupabaseRestHeaders === "function" ? getSupabaseRestHeaders() : {} }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    return data.map((row) => normalizarEntradaCategoria(row)).filter(Boolean);
  } catch (e) {
    console.warn("ROBIN: error cargando categorías remotas", e);
    return null;
  }
}

async function insertarCategoriaRemota(nombre, color) {
  if (typeof isSupabaseConfigured !== "function" || !isSupabaseConfigured()) return false;
  const url = typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "";
  if (!url) return false;

  const entrada = normalizarEntradaCategoria({ nombre, color });
  if (!entrada) return false;

  try {
    const res = await fetch(`${url}/rest/v1/robin_categorias`, {
      method: "POST",
      headers: typeof getSupabaseRestHeaders === "function"
        ? getSupabaseRestHeaders("return=minimal")
        : { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: entrada.nombre,
        color: entrada.color,
        orden: 100
      })
    });
    return res.ok || res.status === 409;
  } catch (e) {
    console.warn("ROBIN: error guardando categoría remota", e);
    return false;
  }
}
