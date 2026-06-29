const MARCAS_CANONICAS = {
  "LA SANTE": "La Santé",
  "DIAGEO": "Diageo",
  "GAMA": "Gama",
  "ROBIN": "Robin",
  "TMK": "Trade & Shopper Marketing"
};

// Nombre exacto de la pestaña en Google Sheets (puede diferir del nombre mostrado en la UI).
const MARCAS_SHEET_TAB = {
  "LA SANTE": "La Santé",
  "DIAGEO": "DIAGEO",
  "GAMA": "GAMA",
  "ROBIN": "ROBIN",
  "TMK": "TMK"
};

function normalizarMarcaKey(marca) {
  if (!marca) return "";
  return String(marca)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function formatearMarca(marca) {
  if (!marca) return "Otros";
  const key = normalizarMarcaKey(marca);
  return MARCAS_CANONICAS[key] || String(marca).trim();
}

function normalizarMarca(marca) {
  return formatearMarca(marca);
}

function marcasCoinciden(a, b) {
  return normalizarMarcaKey(a) === normalizarMarcaKey(b);
}

function resolverClaveMarca(marcaName) {
  const clean = normalizarMarcaKey(marcaName);
  if (!clean) return "";

  if (MARCAS_COLORES[clean]) return clean;

  for (const [clave, display] of Object.entries(MARCAS_CANONICAS)) {
    if (normalizarMarcaKey(display) === clean) return clave;
  }

  if (clean === "TRADE" || clean.startsWith("TRADE ")) return "TMK";

  return "";
}

function marcaParaSheet(marca) {
  const clave = resolverClaveMarca(marca);
  if (clave && MARCAS_SHEET_TAB[clave]) return MARCAS_SHEET_TAB[clave];
  return String(marca || "").trim();
}

function getMarcaStyle(marcaName) {
  const clave = resolverClaveMarca(marcaName);
  const cfg = MARCAS_COLORES[clave] || MARCAS_COLORES_DEFAULT;

  return {
    clave: clave || "",
    accent: cfg.accent,
    bg: `marca-bg-${cfg.id}`,
    text: `marca-text-${cfg.id}`,
    border: `marca-border-${cfg.id}`,
    surface: `marca-surface-${cfg.id}`
  };
}

function obtenerMarcasUnicas(fuentes) {
  const keys = new Set();
  const resultado = [];
  fuentes.forEach(m => {
    if (!m) return;
    const key = normalizarMarcaKey(m);
    if (!key || keys.has(key)) return;
    keys.add(key);
    resultado.push(formatearMarca(m));
  });
  return resultado;
}

function metadataMarcaVacia() {
  return {
    clienteDirecto: "",
    ejecutivos: [],
    disenadores: [],
    contentEquipo: [],
    notas: ""
  };
}

function parseListaNombres(str) {
  if (!str) return [];
  return String(str)
    .split(/\s*\|\s*|\s+y\s+|\s*,\s*/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(nombre => ({ nombre }));
}

function parseDisenadores(str) {
  if (!str) return [];
  return String(str)
    .split(/\s*\|\s*/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(parte => {
      const match = parte.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
      if (match) return { nombre: match[1].trim(), tipo: match[2].trim() };
      return { nombre: parte, tipo: "" };
    });
}

function normalizarListaPersonas(lista) {
  if (!Array.isArray(lista)) return [];
  return lista
    .map(p => {
      if (typeof p === "string") return { nombre: p.trim(), tipo: "" };
      return { nombre: (p.nombre || "").trim(), tipo: (p.tipo || "").trim() };
    })
    .filter(p => p.nombre);
}

function normalizarMetadataMarcaEntry(raw) {
  if (!raw) return metadataMarcaVacia();

  if (typeof raw === "string") {
    try {
      return normalizarMetadataMarcaEntry(JSON.parse(raw));
    } catch (e) {
      return metadataMarcaVacia();
    }
  }

  if (raw.metadataJson) {
    try {
      return normalizarMetadataMarcaEntry(JSON.parse(raw.metadataJson));
    } catch (e) {}
  }

  const base = metadataMarcaVacia();
  base.clienteDirecto = (raw.clienteDirecto || "").trim();
  base.notas = (raw.notas || "").trim();

  if (Array.isArray(raw.ejecutivos)) {
    base.ejecutivos = normalizarListaPersonas(raw.ejecutivos);
  } else if (raw.ejecutivo) {
    base.ejecutivos = parseListaNombres(raw.ejecutivo);
  }

  if (Array.isArray(raw.disenadores)) {
    base.disenadores = normalizarListaPersonas(raw.disenadores);
  } else if (raw.disenador) {
    base.disenadores = parseDisenadores(raw.disenador);
  }

  if (Array.isArray(raw.contentEquipo)) {
    base.contentEquipo = normalizarListaPersonas(raw.contentEquipo);
  } else if (raw.content) {
    const contentStr = String(raw.content).trim();
    if (contentStr.includes("\n") || contentStr.length > 140) {
      if (!base.notas) base.notas = contentStr;
    } else {
      base.contentEquipo = parseListaNombres(contentStr);
    }
  }

  return base;
}

function obtenerMetadataMarca(marcasMetadata, marca) {
  if (!marcasMetadata || !marca) return metadataMarcaVacia();
  if (marcasMetadata[marca]) return normalizarMetadataMarcaEntry(marcasMetadata[marca]);
  const key = Object.keys(marcasMetadata).find(k => marcasCoinciden(k, marca));
  return key ? normalizarMetadataMarcaEntry(marcasMetadata[key]) : metadataMarcaVacia();
}

function serializarMetadataParaApi(meta) {
  const m = normalizarMetadataMarcaEntry(meta);
  return {
    clienteDirecto: m.clienteDirecto,
    ejecutivo: m.ejecutivos.map(e => e.nombre).join(" | "),
    disenador: m.disenadores.map(d => d.tipo ? `${d.nombre} (${d.tipo})` : d.nombre).join(" | "),
    content: m.contentEquipo.map(c => c.nombre).join(" | "),
    notas: m.notas,
    metadataJson: JSON.stringify(m)
  };
}

function formatearPersonasLista(lista) {
  if (!lista || lista.length === 0) return "Sin asignar";
  return lista.map(p => p.nombre).join(", ");
}

function formatearDisenadoresLista(lista) {
  if (!lista || lista.length === 0) return "Sin asignar";
  return lista.map(p => p.tipo ? `${p.nombre} · ${p.tipo}` : p.nombre).join(", ");
}

function esMarcaCanonicaConocida(marca) {
  const key = normalizarMarcaKey(marca);
  if (!key) return false;
  if (MARCAS_CANONICAS[key]) return true;
  return Boolean(resolverClaveMarca(marca));
}

function inferirMarcaDesdeTituloWidget(titulo) {
  const t = normalizarMarcaKey(titulo);
  if (!t) return "";

  let mejorMarca = "";
  let mejorLongitud = 0;

  for (const [key, display] of Object.entries(MARCAS_CANONICAS)) {
    const variantes = [normalizarMarcaKey(key), normalizarMarcaKey(display)];
    for (const variante of variantes) {
      if (!variante || variante.length < 3) continue;
      if (t.includes(variante) && variante.length > mejorLongitud) {
        mejorMarca = formatearMarca(display);
        mejorLongitud = variante.length;
      }
    }
  }

  return mejorMarca;
}

function resolverMarcaWidget(widget) {
  if (!widget) return "";
  const explicita = String(widget.marca || widget.widgetMarca || "").trim();
  if (explicita && esMarcaCanonicaConocida(explicita)) {
    return formatearMarca(explicita);
  }
  return inferirMarcaDesdeTituloWidget(widget.titulo || "");
}

function ajustarColorHex(hex, amount) {
  const raw = String(hex || "").replace("#", "").trim();
  if (raw.length !== 6) return hex || "#2F7A4E";
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  const mix = (channel) => {
    if (amount < 0) return Math.round(channel * (1 + amount));
    return Math.round(channel + (255 - channel) * amount);
  };
  const toHex = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

function obtenerGradienteMarcaHeader(marcaName) {
  const accent = getMarcaStyle(marcaName).accent || "#2F7A4E";
  const deep = ajustarColorHex(accent, -0.42);
  const mid = ajustarColorHex(accent, -0.12);
  const bright = ajustarColorHex(accent, 0.08);
  const glow = ajustarColorHex(accent, 0.22);
  return `linear-gradient(128deg, ${deep} 0%, ${mid} 38%, ${bright} 68%, ${glow} 100%)`;
}

function hexToRgba(hex, alpha) {
  const raw = String(hex || "").replace("#", "").trim();
  if (raw.length !== 6) return `rgba(113, 113, 122, ${alpha})`;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function obtenerGradientesMarcaTarjeta(marcaName) {
  const accent = getMarcaStyle(marcaName).accent || "#71717A";
  const deep = ajustarColorHex(accent, -0.38);
  const shade = ajustarColorHex(accent, -0.14);
  const mid = accent;
  const vivid = ajustarColorHex(accent, 0.14);
  const glow = ajustarColorHex(accent, 0.26);

  const card = `linear-gradient(128deg, ${deep} 0%, ${shade} 32%, ${mid} 62%, ${vivid} 88%, ${glow} 100%)`;

  return {
    card,
    border: hexToRgba(ajustarColorHex(accent, 0.22), 0.45),
    shadow: hexToRgba(deep, 0.32)
  };
}
