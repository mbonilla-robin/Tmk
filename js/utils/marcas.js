const MARCAS_CANONICAS = {
  "LA SANTE": "La Santé",
  "DIAGEO": "Diageo",
  "GAMA": "Gama",
  "ROBIN": "Robin",
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

function marcasCoinciden(a, b) {
  return normalizarMarcaKey(a) === normalizarMarcaKey(b);
}

function getMarcaStyle(marcaName) {
  if (!marcaName) {
    return { bg: "bg-zinc-100", text: "text-zinc-700", border: "border-zinc-200" };
  }
  const clean = normalizarMarcaKey(marcaName);
  return MARCAS_COLORES[clean] || { bg: "bg-zinc-100", text: "text-zinc-700", border: "border-zinc-200" };
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
