const WIDGET_SECCIONES = {
  robin: { id: "robin", label: "Robin" },
  clientes: { id: "clientes", label: "Clientes" }
};

function formatearTituloWidget(titulo) {
  let t = String(titulo || "").trim();
  t = t.replace(/\s*[-–—]\s*(robin|cliente|clientes)\s*$/i, "");
  t = t.replace(/\s{2,}/g, " ").trim();
  return t || String(titulo || "").trim();
}

function normalizarSeccionWidget(seccion) {
  const key = String(seccion || "").trim().toLowerCase();
  if (key === "clientes" || key === "cliente") return "clientes";
  return "robin";
}

function empaquetarWidgetCategoria(seccion, icon) {
  return `${normalizarSeccionWidget(seccion)}:${String(icon || "link").trim()}`;
}

function desempaquetarWidgetCategoria(categoria) {
  const raw = String(categoria || "").trim();
  if (raw.includes(":")) {
    const sep = raw.indexOf(":");
    return {
      seccion: normalizarSeccionWidget(raw.slice(0, sep)),
      icon: raw.slice(sep + 1) || "link"
    };
  }
  return { seccion: "robin", icon: raw || "link" };
}

function normalizarWidgetDesdeApi(widget) {
  if (!widget) return null;
  const empaquetado = desempaquetarWidgetCategoria(widget.icon || widget.categoria);
  const marcaRaw = widget.marca || widget.widgetMarca || widget.marcaCliente || "";
  const marcaExplicita = marcaRaw ? formatearMarca(marcaRaw) : "";
  const marca = esMarcaCanonicaConocida(marcaExplicita)
    ? marcaExplicita
    : inferirMarcaDesdeTituloWidget(widget.titulo || "");
  return {
    id: widget.id,
    titulo: widget.titulo || "",
    link: widget.link || "",
    icon: empaquetado.icon,
    color: widget.color || "sky",
    seccion: normalizarSeccionWidget(widget.seccion || empaquetado.seccion),
    marca
  };
}

function widgetVisibleEnMarca(widget, marca) {
  if (!widget || !marca) return false;
  const wm = resolverMarcaWidget(widget);
  if (!wm) return false;
  return marcasCoinciden(wm, marca);
}

function filtrarWidgetsPorMarca(widgets, marca) {
  const visibles = filtrarWidgetsReales(widgets || [])
    .map(normalizarWidgetDesdeApi)
    .filter(Boolean)
    .filter(w => widgetVisibleEnMarca(w, marca));

  return {
    robin: visibles.filter(w => w.seccion === "robin"),
    clientes: visibles.filter(w => w.seccion === "clientes")
  };
}

function agruparWidgetsPorSeccion(widgets) {
  const visibles = filtrarWidgetsReales(widgets || [])
    .map(normalizarWidgetDesdeApi)
    .filter(Boolean);

  return {
    robin: visibles.filter(w => w.seccion === "robin"),
    clientes: visibles.filter(w => w.seccion === "clientes")
  };
}

function widgetsRecientesStorageKey(username) {
  const user = typeof normalizeUsername === "function"
    ? normalizeUsername(username)
    : String(username || "").replace(/^@/, "").trim().toLowerCase();
  return `robin_widgets_recientes_${user || "anon"}`;
}

function obtenerIdsWidgetsRecientes(username) {
  try {
    const raw = getLocalStorageItemSafe(widgetsRecientesStorageKey(username), "[]");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch (e) {
    return [];
  }
}

function registrarUsoWidget(username, widgetId) {
  if (!widgetId) return;
  const id = String(widgetId);
  let ids = obtenerIdsWidgetsRecientes(username).filter(x => x !== id);
  ids.unshift(id);
  ids = ids.slice(0, 50);
  setLocalStorageItemSafe(widgetsRecientesStorageKey(username), JSON.stringify(ids));
}

function seleccionarWidgetsDestacados(widgets, username, limite = 5) {
  const lista = (widgets || []).filter(Boolean);
  if (lista.length === 0) return [];

  const porId = new Map(lista.map(w => [String(w.id), w]));
  const recientesIds = obtenerIdsWidgetsRecientes(username);
  const destacados = [];
  const usados = new Set();

  for (const id of recientesIds) {
    if (destacados.length >= limite) break;
    const w = porId.get(String(id));
    if (w) {
      destacados.push(w);
      usados.add(String(w.id));
    }
  }

  for (const w of lista) {
    if (destacados.length >= limite) break;
    if (!usados.has(String(w.id))) {
      destacados.push(w);
      usados.add(String(w.id));
    }
  }

  return destacados;
}

function listarTodosWidgetsAplanados(widgetsAgrupados) {
  if (!widgetsAgrupados) return [];
  return [...(widgetsAgrupados.robin || []), ...(widgetsAgrupados.clientes || [])];
}

function obtenerOpcionesSeccionWidget() {
  return Object.values(WIDGET_SECCIONES);
}

const WIDGET_COLORES_PASTEL = {
  mint: {
    label: "Menta",
    button: "widget-tone widget-tone--mint"
  },
  lavender: {
    label: "Lavanda",
    button: "widget-tone widget-tone--lavender"
  },
  peach: {
    label: "Durazno",
    button: "widget-tone widget-tone--peach"
  },
  sky: {
    label: "Cielo",
    button: "widget-tone widget-tone--sky"
  },
  rose: {
    label: "Rosa",
    button: "widget-tone widget-tone--rose"
  },
  lemon: {
    label: "Limón",
    button: "widget-tone widget-tone--lemon"
  },
  lilac: {
    label: "Lila",
    button: "widget-tone widget-tone--lilac"
  }
};

function resolverClaveColorWidget(colorRaw) {
  const color = String(colorRaw || "").trim().toLowerCase();
  if (!color) return "sky";
  if (WIDGET_COLORES_PASTEL[color]) return color;

  if (color.includes("emerald") || color.includes("edfb") || color.includes("green")) return "mint";
  if (color.includes("indigo") || color.includes("purple") || color.includes("eefc") || color.includes("lavender")) return "lavender";
  if (color.includes("amber") || color.includes("orange") || color.includes("fef6") || color.includes("peach")) return "peach";
  if (color.includes("blue") || color.includes("ebf5") || color.includes("sky")) return "sky";
  if (color.includes("red") || color.includes("fdf0") || color.includes("rose")) return "rose";
  if (color.includes("yellow") || color.includes("lemon")) return "lemon";
  if (color.includes("lilac")) return "lilac";

  return "sky";
}

function getWidgetEstilo(colorRaw) {
  const clave = resolverClaveColorWidget(colorRaw);
  return WIDGET_COLORES_PASTEL[clave] || WIDGET_COLORES_PASTEL.sky;
}

function obtenerOpcionesColorWidget() {
  return Object.entries(WIDGET_COLORES_PASTEL).map(([id, cfg]) => ({
    id,
    label: cfg.label,
    button: cfg.button
  }));
}
