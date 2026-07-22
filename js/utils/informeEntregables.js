/**
 * Informe de entregables — ejes de gestión (macro / micro), métricas y textos IA.
 */

const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

const INFORME_COLORES_DISTRIBUCION = [
  "#FFFFFF",
  "#FFC8C8",
  "#FF8A8A",
  "#FF5C5C",
  "#F0F0F0"
];

const INFORME_ICONOS_SUGERENCIA = [
  "improve", "target", "chart", "spark", "users", "flag", "shield", "clock"
];

function uidInforme(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function parseMesInput(valor) {
  if (!valor || !/^\d{4}-\d{2}$/.test(String(valor))) return null;
  const [y, m] = String(valor).split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;
  return { year: y, month: m };
}

function formatearRangoMesesInforme(mesDesde, mesHasta) {
  const a = parseMesInput(mesDesde);
  const b = parseMesInput(mesHasta) || a;
  if (!a) return "";
  const cap = (n) => `${n.charAt(0).toUpperCase()}${n.slice(1)}`;
  const nombreA = cap(MESES_ES[a.month - 1] || "");
  const nombreB = cap(MESES_ES[b.month - 1] || "");
  if (a.year === b.year && a.month === b.month) {
    return `${nombreA} ${a.year}`;
  }
  if (a.year === b.year) {
    return `${nombreA} - ${nombreB} ${a.year}`;
  }
  return `${nombreA} ${a.year} - ${nombreB} ${b.year}`;
}

function crearEjeVacio(tipo = "macro") {
  return {
    id: uidInforme(tipo === "micro" ? "mic" : "mac"),
    titulo: "",
    notas: "",
    redactado: "",
    fechaFin: "",
    trabajos: "",
    piezas: [],
    propuestas: 0,
    ejecutablesHechos: 0,
    enEjecucion: false
  };
}

function crearInformeVacio(marca = "Gama") {
  const ahora = new Date();
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, "0");
  const m2 = String(((ahora.getMonth() + 1) % 12) + 1).padStart(2, "0");
  const y2 = ahora.getMonth() === 11 ? y + 1 : y;
  return {
    marca,
    titulo: "INFORME ENTREGABLES",
    mesDesde: `${y}-${m}`,
    mesHasta: `${y2}-${m2}`,
    macros: [],
    micros: [],
    sugerenciasNotas: "",
    sugerenciasBullets: [],
    aiGenerado: false,
    aiGeneradoAt: null
  };
}

function clonarInforme(informe) {
  if (!informe) return null;
  try {
    return JSON.parse(JSON.stringify(informe));
  } catch {
    return null;
  }
}

/** Restaura piezas/campos al cargar un borrador para que no se pierda nada. */
function normalizarInformeDesdeBorrador(informe) {
  const base = clonarInforme(informe) || crearInformeVacio(informe?.marca || "Gama");
  const mapEje = (e) => {
    const piezas = typeof parsePiezasSeleccionadas === "function"
      ? parsePiezasSeleccionadas(e?.piezas || e?.trabajos || [])
      : (Array.isArray(e?.piezas) ? e.piezas : []);
    const trabajos = typeof serializarPiezasSeleccionadas === "function"
      ? serializarPiezasSeleccionadas(piezas)
      : String(e?.trabajos || "");
    return {
      id: e?.id || uidInforme("eje"),
      titulo: String(e?.titulo || ""),
      notas: String(e?.notas || ""),
      redactado: String(e?.redactado || ""),
      fechaFin: String(e?.fechaFin || ""),
      trabajos,
      piezas,
      propuestas: Number(e?.propuestas) || 0,
      ejecutablesPropuestos: Number(e?.ejecutablesPropuestos) || 0,
      ejecutablesHechos: Number(e?.ejecutablesHechos) || 0,
      enEjecucion: Boolean(e?.enEjecucion)
    };
  };
  return {
    ...base,
    marca: base.marca || "Gama",
    titulo: String(base.titulo || "INFORME ENTREGABLES"),
    mesDesde: String(base.mesDesde || ""),
    mesHasta: String(base.mesHasta || ""),
    macros: Array.isArray(base.macros) ? base.macros.map(mapEje) : [],
    micros: Array.isArray(base.micros) ? base.micros.map(mapEje) : [],
    sugerenciasNotas: String(base.sugerenciasNotas || ""),
    sugerenciasBullets: Array.isArray(base.sugerenciasBullets)
      ? base.sugerenciasBullets.map(normalizarSugerenciaInforme).filter(Boolean)
      : [],
    aiGenerado: Boolean(base.aiGenerado),
    aiGeneradoAt: base.aiGeneradoAt || null
  };
}

const INFORME_DRAFT_KEY = "robin_informe_borrador_v1";

function guardarBorradorInforme(informe) {
  if (!informe) return null;
  const copia = normalizarInformeDesdeBorrador(informe);
  const payload = {
    savedAt: new Date().toISOString(),
    informe: copia
  };
  const json = JSON.stringify(payload);
  if (typeof setLocalStorageItemSafe === "function") setLocalStorageItemSafe(INFORME_DRAFT_KEY, json);
  else {
    try { localStorage.setItem(INFORME_DRAFT_KEY, json); } catch (_) { /* ignore */ }
  }
  return payload;
}

function cargarBorradorInforme() {
  try {
    const raw = typeof getLocalStorageItemSafe === "function"
      ? getLocalStorageItemSafe(INFORME_DRAFT_KEY)
      : localStorage.getItem(INFORME_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.informe) return null;
    return {
      savedAt: parsed.savedAt || null,
      informe: normalizarInformeDesdeBorrador(parsed.informe)
    };
  } catch {
    return null;
  }
}

function borrarBorradorInforme() {
  if (typeof removeLocalStorageItemSafe === "function") removeLocalStorageItemSafe(INFORME_DRAFT_KEY);
  else {
    try { localStorage.removeItem(INFORME_DRAFT_KEY); } catch (_) { /* ignore */ }
  }
}

function formatearFechaBorrador(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/** Borrador recuperado desde el PDF exportado (Junio–Agosto 2026). */
function informeRecuperadoGamaJunAgo2026() {
  const piezas = (lista) => (
    typeof parsePiezasSeleccionadas === "function" ? parsePiezasSeleccionadas(lista) : lista
  );
  const serial = (lista) => (
    typeof serializarPiezasSeleccionadas === "function"
      ? serializarPiezasSeleccionadas(lista)
      : lista.map((p) => (p.versiones > 1 ? `${p.nombre} x${p.versiones}` : p.nombre)).join(" · ")
  );

  const mundialPiezas = piezas([
    { nombre: "Floor graphic", versiones: 1 },
    { nombre: "Cenefas", versiones: 1 },
    { nombre: "Microperforado", versiones: 1 },
    { nombre: "Danglers", versiones: 1 },
    { nombre: "Habladores", versiones: 1 },
    { nombre: "Habladores | Carnicería", versiones: 1 }
  ]);
  const gamaniaPiezas = piezas([
    { nombre: "Puntas de gondola", versiones: 1 },
    { nombre: "Danglers", versiones: 1 },
    { nombre: "Habladores", versiones: 1 },
    { nombre: "Cenefas", versiones: 1 },
    { nombre: "Cartilla", versiones: 1 }
  ]);
  const pricingPiezas = piezas([
    { nombre: "Plantillas", versiones: 5 },
    { nombre: "Microperforado", versiones: 3 },
    { nombre: "Rompetráficos", versiones: 3 },
    { nombre: "Preciadores", versiones: 5 },
    { nombre: "Separadores neveras", versiones: 2 },
    { nombre: "Separadores PROCAMP", versiones: 3 },
    { nombre: "Soportes A4", versiones: 5 }
  ]);
  const vinosPiezas = piezas([
    { nombre: "Tótem", versiones: 1 },
    { nombre: "Habladores", versiones: 1 }
  ]);

  return normalizarInformeDesdeBorrador({
    marca: "Gama",
    titulo: "INFORME ENTREGABLES",
    mesDesde: "2026-06",
    mesHasta: "2026-08",
    aiGenerado: true,
    aiGeneradoAt: "2026-07-22T14:00:00.000Z",
    macros: [
      {
        id: "mac-recup-mundial",
        titulo: "Mundial Gama",
        fechaFin: "2026-06",
        notas: "Despliegue en piso de venta para Mundial Gama entre junio y julio 2026.",
        redactado:
          "Despliegue en piso de venta para la activación Mundial Gama entre junio y julio 2026, orientado a potenciar descuentos y ofertas especiales.\n• Promoción de descuentos y ofertas especiales en PDV.\n• Diseño y distribución de materiales POP: floor graphics, cenefas y microperforados.\n• Mejora de la experiencia de compra con habladores y danglers atractivos.",
        piezas: mundialPiezas,
        trabajos: serial(mundialPiezas),
        propuestas: 6,
        ejecutablesHechos: 0
      },
      {
        id: "mac-recup-gamania",
        titulo: "Gamania",
        fechaFin: "2026-07",
        notas: "Alianza estratégica Gama Club / Gamania.",
        redactado:
          "Activación alineada a la alianza estratégica con Gama Club y el proyecto Gamania, con foco en visibilidad y tráfico en góndola.\n• Generación de espacio con puntas de góndola.\n• Distribución de habladores y danglers en zonas clave.\n• Inclusión de cartilla promocional de apoyo.",
        piezas: gamaniaPiezas,
        trabajos: serial(gamaniaPiezas),
        propuestas: 5,
        ejecutablesHechos: 0
      }
    ],
    micros: [
      {
        id: "mic-recup-pricing",
        titulo: "Pricing",
        fechaFin: "2026-07",
        notas: "Reestructuración de la comunicación de precios en piso de venta.",
        redactado:
          "Proyecto de reestructuración de la comunicación de precios en piso de venta, con piezas de soporte para claridad y consistencia visual.\n• Actualización de plantillas y preciadores.\n• Refuerzo con microperforados, rompetráficos y separadores.\n• Soportes A4 para comunicación puntual en PDV.",
        piezas: pricingPiezas,
        trabajos: serial(pricingPiezas),
        propuestas: 26,
        ejecutablesHechos: 4
      },
      {
        id: "mic-recup-vinos",
        titulo: "Vinos Exclusivos",
        fechaFin: "2026-07",
        notas: "Promoción de vinos de alta calidad con materiales POP.",
        redactado:
          "Promoción de vinos exclusivos de alta calidad mediante materiales POP de alto impacto en PDV.\n• Tótem de marca para destacar la selección.\n• Habladores de apoyo en góndola.",
        piezas: vinosPiezas,
        trabajos: serial(vinosPiezas),
        propuestas: 2,
        ejecutablesHechos: 0
      }
    ],
    sugerenciasNotas:
      "mejorar fechas de entrega, fechas claras de assets del cliente, feedback constante entre equipos",
    sugerenciasBullets: [
      {
        icon: "clock",
        titulo: "Fechas de entrega",
        text: "Mejorar las fechas de entrega de los proyectos para asegurar una implementación oportuna en piso de venta."
      },
      {
        icon: "flag",
        titulo: "Assets del cliente",
        text: "Establecer fechas claras para la recepción de assets de los clientes y así agilizar el proceso de diseño y producción."
      },
      {
        icon: "users",
        titulo: "Feedback entre equipos",
        text: "Fomentar un feedback constante y abierto entre los equipos para garantizar la calidad y eficacia de los proyectos."
      }
    ]
  });
}

function seedInformeEjemploGama() {
  return {
    marca: "Gama",
    titulo: "INFORME ENTREGABLES",
    mesDesde: "2026-08",
    mesHasta: "2026-09",
    macros: [
      {
        id: "mac-demo-1",
        titulo: "Temporada Mundialista",
        notas: "identidad de tienda, freezer, cenefas, stickers, banners fachada",
        redactado:
          "Planificación de identidad de tienda desde fachada hasta zonas clave.\n• Materiales de freezer y cenefas alineados a la temporada.\n• Experiencia interactiva de intercambio de stickers con banners.\n• Ajustes de producción para proteger fechas de implementación en PDV.",
        trabajos: "Fachada, freezer, cenefas, stickers, banners",
        propuestas: 12,
        ejecutablesPropuestos: 40,
        ejecutablesHechos: 30
      },
      {
        id: "mac-demo-2",
        titulo: "Campaña 57 Aniversario",
        notas: "despliegue integral espacios clave danglers habladores cajas",
        redactado:
          "Despliegue integral con dominio de espacios clave.\n• Visibilidad estandarizada (danglers, habladores, marcos A4).\n• Adaptación de cajas, fachada microperforada y básculas.\n• Versiones y ajustes listos para producción física.",
        trabajos: "Danglers, habladores, cajas, fachada, básculas",
        propuestas: 9,
        ejecutablesPropuestos: 28,
        ejecutablesHechos: 28
      }
    ],
    micros: [
      {
        id: "mic-demo-1",
        titulo: "Proyecto Pricing (fuera de FII)",
        notas: "piezas de precios activaciones comerciales fuera FII",
        redactado:
          "Proyecto especial fuera del marco FII orientado a pricing en PDV.\n• Piezas de comunicación de estructura de precios.\n• Soporte visual para activaciones comerciales puntuales.\n• Coordinación ágil con el equipo para respuesta a eventualidades.",
        trabajos: "Preciadores, pop pricing, activaciones",
        propuestas: 4,
        ejecutablesPropuestos: 10,
        ejecutablesHechos: 8
      },
      {
        id: "mic-demo-2",
        titulo: "Gamma Nida",
        notas: "acompañamiento creativo línea Nida",
        redactado:
          "Acompañamiento creativo y operativo de la línea Nida.\n• Coherencia de marca en piezas de piso.\n• Desarrollo de entregables asociados a la temporalidad del periodo.\n• Seguimiento de ajustes hasta implementación.",
        trabajos: "Piezas Nida, adaptaciones PDV",
        propuestas: 3,
        ejecutablesPropuestos: 6,
        ejecutablesHechos: 5
      }
    ],
    sugerenciasNotas:
      "mejorar tiempos de aprobación con el cliente, documentar brief de eventualidades, anticipar stock de materiales soft, alinear pricing con el equipo comercial",
    sugerenciasBullets: [
      {
        icon: "clock",
        titulo: "Ciclos de aprobación",
        text: "Acortar los ciclos de aprobación con el cliente para proteger fechas de implementación en piso."
      },
      {
        icon: "improve",
        titulo: "Brief de eventualidades",
        text: "Documentar un brief estándar para eventualidades fuera de FII y alinear expectativas con el equipo."
      },
      {
        icon: "shield",
        titulo: "Stock de materiales soft",
        text: "Anticipar stock y proveedores de materiales soft de alta rotación para no frenar producción."
      },
      {
        icon: "users",
        titulo: "Alineación de pricing",
        text: "Alinear pricing con el equipo comercial antes de abrir producción y evitar retrabajos."
      }
    ]
  };
}

function pesoEjeInforme(eje) {
  const p = Number(eje.propuestas) || 0;
  const eh = Number(eje.ejecutablesHechos) || 0;
  return Math.max(1, p * 2 + eh);
}

function todosLosEjes(informe) {
  const macros = (informe.macros || []).map((e) => ({ ...e, _tipo: "macro" }));
  const micros = (informe.micros || []).map((e) => ({ ...e, _tipo: "micro" }));
  return [...macros, ...micros].filter((e) => e.titulo || e.notas || e.redactado);
}

/** Porcentajes de distribución ponderados por propuestas + ejecutables (IA local). */
function calcularDistribucionEntregables(informe) {
  const ejes = todosLosEjes(informe);
  if (ejes.length === 0) return [];
  const pesos = ejes.map((e) => ({
    label: e.titulo || "Sin título",
    value: pesoEjeInforme(e),
    propuestas: Number(e.propuestas) || 0,
    hechos: Number(e.ejecutablesHechos) || 0
  }));
  const total = pesos.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  return pesos.map((x, i) => {
    let pct = Math.round((x.value / total) * 1000) / 10;
    if (i === pesos.length - 1) pct = Math.round((100 - acc) * 10) / 10;
    else acc += pct;
    return {
      label: x.label,
      value: x.value,
      pct: Math.max(0, pct),
      color: INFORME_COLORES_DISTRIBUCION[i % INFORME_COLORES_DISTRIBUCION.length],
      propuestas: x.propuestas,
      hechos: x.hechos
    };
  });
}

function seriesPropuestasPorEje(informe) {
  return todosLosEjes(informe).map((e, i) => ({
    label: e.titulo || `Eje ${i + 1}`,
    value: Number(e.propuestas) || 0,
    color: INFORME_COLORES_DISTRIBUCION[i % INFORME_COLORES_DISTRIBUCION.length]
  }));
}

function seriesEjecutablesComparativa(informe) {
  return todosLosEjes(informe).map((e, i) => ({
    label: e.titulo || `Eje ${i + 1}`,
    propuestos: Number(e.propuestas) || 0,
    hechos: Number(e.ejecutablesHechos) || 0,
    color: INFORME_COLORES_DISTRIBUCION[i % INFORME_COLORES_DISTRIBUCION.length]
  }));
}

function totalesMetricasInforme(informe) {
  const ejes = todosLosEjes(informe);
  return ejes.reduce(
    (acc, e) => {
      acc.propuestas += Number(e.propuestas) || 0;
      acc.ejecutablesHechos += Number(e.ejecutablesHechos) || 0;
      return acc;
    },
    { propuestas: 0, ejecutablesHechos: 0 }
  );
}

function partirLineasNotas(texto) {
  return String(texto || "")
    .split(/[\n•\-–—]+|,(?=\s)|;(?=\s)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

/** Ortografía / mayúsculas / gramática básica sin API. */
function pulirFraseInforme(texto) {
  let t = String(texto || "").replace(/\s+/g, " ").trim();
  if (!t) return "";

  const correcciones = [
    [/\bse ejecuto\b/gi, "se ejecutó"],
    [/\bse realizo\b/gi, "se realizó"],
    [/\bse desarrollo\b/gi, "se desarrolló"],
    [/\bse elaboro\b/gi, "se elaboró"],
    [/\bse presento\b/gi, "se presentó"],
    [/\bse adapto\b/gi, "se adaptó"],
    [/\bse implemento\b/gi, "se implementó"],
    [/\bse coordino\b/gi, "se coordinó"],
    [/\bse trabajo\b/gi, "se trabajó"],
    [/\btambien\b/gi, "también"],
    [/\bademas\b/gi, "además"],
    [/\basi\b/gi, "así"],
    [/\bmas\b/gi, "más"],
    [/\binformacion\b/gi, "información"],
    [/\bproduccion\b/gi, "producción"],
    [/\bpromocion\b/gi, "promoción"],
    [/\bpromociones\b/gi, "promociones"],
    [/\bpdv\b/gi, "PDV"],
    [/\bpop\b/gi, "POP"],
    [/\bfii\b/gi, "FII"],
    [/\batl\b/gi, "ATL"],
    [/([a-záéíóúñ])\s+y\s+y\s+/gi, "$1 y "],
    [/\s+,/g, ","],
    [/,([^\s])/g, ", $1"],
    [/\s+\./g, "."],
    [/\.([a-záéíóúñ])/gi, ". $1"],
    [/\s{2,}/g, " "]
  ];

  correcciones.forEach(([re, rep]) => {
    t = t.replace(re, rep);
  });

  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (!/[.!?…]$/.test(t)) t += ".";
  return t;
}

function pulirTituloInforme(texto) {
  let t = String(texto || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t
    .split(" ")
    .map((w, i) => {
      if (!w) return w;
      if (i > 0 && /^(x|de|del|la|las|los|y|e|o|en|para|por|con|a)$/i.test(w)) {
        return w.toLowerCase();
      }
      if (/^(pdv|pop|fii|atl|gama)$/i.test(w)) return w.toUpperCase() === "GAMA" ? "Gama" : w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

/**
 * Organiza notas en párrafo + bullets de valor (sin listar piezas;
 * las piezas van aparte con sus versiones).
 */
function redactarTemporalidadIA(eje) {
  const base = String(eje.notas || "").trim();
  // Si ya hay redactado previo que no sea solo lista de piezas, partimos de notas frescas
  const partes = partirLineasNotas(base).filter((p) => {
    const n = informeNorm(p);
    return n && !n.startsWith("trabajos:") && !n.startsWith("piezas:");
  });

  if (partes.length === 0) {
    const titulo = pulirTituloInforme(eje.titulo);
    return titulo
      ? pulirFraseInforme(`Se trabajó la temporalidad ${titulo} con foco en ejecución en PDV`)
      : "";
  }

  if (partes.length === 1) {
    return pulirFraseInforme(partes[0]);
  }

  const intro = pulirFraseInforme(partes[0]);
  const bullets = partes.slice(1, 6).map((p) => `• ${pulirFraseInforme(p)}`);
  return [intro, ...bullets].join("\n");
}

function elegirIconoSugerencia(titulo, text) {
  const n = informeNorm(`${titulo || ""} ${text || ""}`);
  if (!n) return "spark";
  if (/fecha|plazo|tiempo|entrega|deadline|calendario|cronograma|atraso|oportuno/.test(n)) return "clock";
  if (/equipo|feedback|colabor|comunic|aline|reunion|coordin/.test(n)) return "users";
  if (/calidad|riesgo|proteger|stock|proveedor|seguro|control|valid/.test(n)) return "shield";
  if (/meta|objetivo|foco|prioridad|alcance|brief/.test(n)) return "target";
  if (/dato|indicador|metric|reporte|analisis|medicion|kpi/.test(n)) return "chart";
  if (/hito|campana|lanzamiento|flag|prioridad comercial/.test(n)) return "flag";
  if (/material|pieza|inventario|produccion|pdv|pop|impres/.test(n)) return "box";
  if (/capa|estructura|organiz|proceso|flujo/.test(n)) return "layers";
  if (/mejor|oportunidad|propuesta|siguiente|aprendizaje|afinar/.test(n)) return "improve";
  return "spark";
}

function iconoSugerenciaPermitido(icon) {
  const allowed = new Set([
    ...INFORME_ICONOS_SUGERENCIA,
    "box", "layers", "grid", "lightbulb", "check"
  ]);
  const k = String(icon || "").trim();
  return allowed.has(k) ? k : "";
}

function normalizarSugerenciaInforme(item) {
  if (!item) return null;
  if (typeof item === "string") {
    const text = String(item).trim();
    if (!text) return null;
    const titulo = tituloTematicoDesdeSugerencia(text);
    return {
      icon: elegirIconoSugerencia(titulo, text),
      titulo,
      text: quitarTituloDuplicadoDelCuerpo(titulo, text)
    };
  }
  const textRaw = String(item.text || item.desarrollo || item.body || "").trim();
  let titulo = String(item.titulo || item.subtitulo || item.title || "").trim();
  if (!textRaw && !titulo) return null;

  const textBase = textRaw || titulo;
  if (!titulo || tituloRepiteCuerpo(titulo, textBase)) {
    titulo = tituloTematicoDesdeSugerencia(textBase);
  } else {
    // Mantener título corto: máx. ~8 palabras
    const palabras = titulo.split(/\s+/).filter(Boolean);
    if (palabras.length > 8 || titulo.length > 56) {
      titulo = tituloTematicoDesdeSugerencia(textBase);
    } else {
      titulo = pulirTituloInforme(titulo) || titulo;
    }
  }

  const textFinal = quitarTituloDuplicadoDelCuerpo(titulo, textBase);
  const icon = iconoSugerenciaPermitido(item.icon) || elegirIconoSugerencia(titulo, textFinal);
  return {
    icon,
    titulo,
    text: textFinal || textBase
  };
}

/** True si el subtítulo copia (o casi) el inicio / cuerpo de la sugerencia. */
function tituloRepiteCuerpo(titulo, text) {
  const t = informeNorm(titulo);
  const body = informeNorm(text);
  if (!t || !body) return false;
  if (t.length < 8) return false;
  if (body.startsWith(t)) return true;

  const primeraLinea = informeNorm(
    String(text || "")
      .split("\n")
      .map((l) => l.replace(/^[•\-\*\d.)]+\s*/, "").trim())
      .find((l) => l.length > 3) || ""
  );
  if (primeraLinea && (primeraLinea.startsWith(t) || t.startsWith(primeraLinea))) return true;
  if (primeraLinea && t.length >= 18 && primeraLinea.includes(t)) return true;

  const head = body.slice(0, 180);
  if (t.length >= 18 && head.includes(t)) return true;

  const tw = t.split(/\s+/).filter((w) => w.length > 3);
  if (tw.length >= 4) {
    const overlap = tw.filter((w) => head.includes(w)).length;
    if (overlap / tw.length >= 0.8) return true;
  }
  return false;
}

/**
 * Subtítulo temático corto (etiqueta), no una frase del cuerpo.
 * Resume el tema de los bullets en pocas palabras.
 */
function tituloTematicoDesdeSugerencia(texto) {
  const raw = String(texto || "").trim();
  if (!raw) return "Sugerencia";
  const n = informeNorm(raw);

  // Etiqueta explícita "Tema:" al inicio
  const conDosPuntos = raw.match(/^([^\n:]{3,40}):\s*\n?/);
  if (conDosPuntos) {
    const label = conDosPuntos[1].trim();
    if (label.split(/\s+/).length <= 6 && !tituloRepiteCuerpo(label, raw.slice(conDosPuntos[0].length))) {
      return pulirTituloInforme(label) || label;
    }
  }

  if (/fecha|plazo|tiempo|entrega|calendario|cronograma|asset|deadline/.test(n)) {
    return "Fechas y assets";
  }
  if (/feedback|equipo|colabor|comunic|aline|coordin|reunion/.test(n)) {
    return "Alineación de equipos";
  }
  if (/brief|briefing|briefing|alcance|kick.?off|requerim/.test(n)) {
    return "Brief y alcance";
  }
  if (/stock|proveedor|inventario|material soft|materiales soft/.test(n)) {
    return "Stock y proveedores";
  }
  if (/aprobacion|aprobación|validacion|validación|cliente|sign.?off/.test(n)) {
    return "Ciclos de aprobación";
  }
  if (/pricing|precio|comercial|trade marketing/.test(n)) {
    return "Alineación comercial";
  }
  if (/calidad|control|revision|revisión|qa|chequeo/.test(n)) {
    return "Control de calidad";
  }
  if (/produccion|producción|impres|implementacion|implementación|pdv|piso/.test(n)) {
    return "Producción e implementación";
  }
  if (/metric|indicador|reporte|medicion|kpi|dato/.test(n)) {
    return "Seguimiento e indicadores";
  }
  if (/proceso|flujo|organiz|estandar|estándar|metodolog/.test(n)) {
    return "Procesos de trabajo";
  }
  if (/pieza|pop|dangler|hablador|cenefa|material/.test(n)) {
    return "Materiales Trade";
  }
  if (/mejor|oportunidad|aprendizaje|siguiente paso|proximo/.test(n)) {
    return "Mejora continua";
  }

  // Fallback: 3–5 palabras clave de la primera línea (sin frase completa larga)
  const primera = raw
    .split("\n")
    .map((l) => l.replace(/^[•\-\*\d.)]+\s*/, "").replace(/:+$/, "").trim())
    .find((l) => l.length > 3) || raw;
  const stop = new Set([
    "para", "con", "los", "las", "del", "una", "uno", "que", "por", "como",
    "este", "esta", "estos", "estas", "sobre", "entre", "desde", "hacia",
    "mejorar", "asegurar", "garantizar", "establecer", "fomentar", "definir"
  ]);
  const words = informeNorm(primera)
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stop.has(w))
    .slice(0, 4);
  if (words.length >= 2) {
    const label = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    return pulirTituloInforme(label) || label;
  }
  return "Sugerencia de mejora";
}

/** Quita del cuerpo un inicio que solo repite el subtítulo. */
function quitarTituloDuplicadoDelCuerpo(titulo, text) {
  let body = String(text || "").replace(/\r\n?/g, "\n").trim();
  const t = String(titulo || "").trim();
  if (!t || !body) return body;

  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  body = body.replace(new RegExp(`^${esc}\\s*[:.\\-–—]?\\s*`, "i"), "").trim();

  // Primera línea idéntica o casi al título
  const lines = body.split("\n");
  if (lines.length > 1) {
    const first = lines[0].replace(/^[•\-\*]\s*/, "").trim();
    if (informeNorm(first) === informeNorm(t) || tituloRepiteCuerpo(t, first)) {
      body = lines.slice(1).join("\n").replace(/^\n+/, "").trim();
    }
  }
  return body;
}

/** @deprecated usar tituloTematicoDesdeSugerencia */
function tituloCortoDesdeTexto(texto) {
  return tituloTematicoDesdeSugerencia(texto);
}

/** Pule gramática línea a línea sin aplastar párrafos ni bullets. */
function pulirTextoSugerenciaLargo(texto) {
  return String(texto || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => {
      const raw = line.replace(/\s+$/g, "");
      if (!raw.trim()) return "";
      const indent = raw.match(/^\s*/)?.[0] || "";
      const t = raw.trim();
      if (/^[•]\s+/.test(t)) {
        const body = t.replace(/^[•]\s+/, "");
        return `${indent}• ${pulirFraseInforme(body) || body}`;
      }
      if (/^[-*]\s+/.test(t)) {
        const body = t.replace(/^[-*]\s+/, "");
        return `${indent}• ${pulirFraseInforme(body) || body}`;
      }
      if (/^\d+[.)]\s+/.test(t)) {
        const m = t.match(/^(\d+[.)])\s*(.*)$/);
        return `${indent}${m[1]} ${pulirFraseInforme(m[2]) || m[2]}`;
      }
      return `${indent}${pulirFraseInforme(t) || t}`;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Parte notas de sugerencias en temas mayores.
 * Conserva párrafos multi-línea con bullets; no parte cada línea.
 */
function partirSugerenciasNotas(texto) {
  const limpio = String(texto || "").replace(/\r\n?/g, "\n").trim();
  if (!limpio) return [];

  let partes = limpio.split(/\n\s*\n+/).map((s) => s.trim()).filter(Boolean);

  // Listado numerado de temas (1. 2. 3.) aunque vengan sin línea en blanco
  if (partes.length === 1 && /(?:^|\n)\s*\d+[.)]\s+\S/.test(limpio)) {
    const numbered = limpio
      .split(/(?=(?:^|\n)\s*\d+[.)]\s+)/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (numbered.length > 1) partes = numbered;
  }

  // Encabezados tipo "Tema:" seguidos de desarrollo (separados por línea en blanco ya cubierto)
  return partes.length ? partes : [limpio];
}

function sugerenciasABulletsIA(texto) {
  const partes = partirSugerenciasNotas(texto);
  if (partes.length === 0) return [];
  return partes.slice(0, 10).map((p) => {
    let bloque = String(p || "")
      .replace(/^\d+[.)]\s*/, "")
      .trim();
    const conTitulo = bloque.match(/^([^\n:]{3,40}):\s*\n?([\s\S]+)$/);
    let body;
    let tituloHint = "";
    if (conTitulo && conTitulo[2].trim().length > 12 && conTitulo[1].trim().split(/\s+/).length <= 6) {
      tituloHint = conTitulo[1].trim();
      body = pulirTextoSugerenciaLargo(conTitulo[2]);
    } else {
      body = pulirTextoSugerenciaLargo(bloque);
    }
    // Siempre etiqueta temática; el hint "Tema:" solo si no copia el cuerpo
    let titulo = tituloTematicoDesdeSugerencia(bloque);
    if (tituloHint && !tituloRepiteCuerpo(tituloHint, body)) {
      titulo = pulirTituloInforme(tituloHint) || tituloHint;
    }
    return normalizarSugerenciaInforme({
      icon: elegirIconoSugerencia(titulo, body),
      titulo,
      text: body
    });
  }).filter(Boolean);
}

function ordenarEjesPorFecha(lista) {
  const mesKey = (v) => {
    const m = String(v || "").match(/^(\d{4})-(\d{2})/);
    if (!m) return Number.POSITIVE_INFINITY;
    return Number(m[1]) * 100 + Number(m[2]);
  };
  return (lista || []).slice().sort((a, b) => {
    const da = mesKey(a.fechaFin);
    const db = mesKey(b.fechaFin);
    if (da !== db) return da - db;
    return String(a.titulo || "").localeCompare(String(b.titulo || ""), "es");
  });
}

function normalizarPiezasEje(eje) {
  const piezas = parsePiezasSeleccionadas(eje.piezas || eje.trabajos || []);
  return {
    piezas,
    trabajos: serializarPiezasSeleccionadas(piezas)
  };
}

/** Se ejecuta al pasar a vista previa: organiza textos, fechas y piezas.
 *  opts.keepRedactado: conserva redacción IA ya guardada (ahorra tokens).
 */
function prepararInformeParaVista(informe, opts = {}) {
  const keepRedactado = Boolean(opts.keepRedactado);
  const next = { ...informe };
  next.titulo = String(informe.titulo || "INFORME ENTREGABLES").trim().toUpperCase() || "INFORME ENTREGABLES";

  const mapEje = (e) => {
    const { piezas, trabajos } = normalizarPiezasEje(e);
    const suma = typeof sumaVersionesPiezas === "function" ? sumaVersionesPiezas(piezas) : 0;
    const redactadoExistente = String(e.redactado || "").trim();
    return {
      ...e,
      titulo: pulirTituloInforme(e.titulo) || e.titulo,
      fechaFin: e.fechaFin || "",
      piezas,
      trabajos,
      propuestas: suma > 0 ? suma : (Number(e.propuestas) || 0),
      redactado: keepRedactado && redactadoExistente
        ? redactadoExistente
        : redactarTemporalidadIA({ ...e, piezas, trabajos })
    };
  };

  next.macros = ordenarEjesPorFecha((informe.macros || []).map(mapEje));
  next.micros = ordenarEjesPorFecha((informe.micros || []).map(mapEje));

  if (String(informe.sugerenciasNotas || "").trim()) {
    const desdeNotas = sugerenciasABulletsIA(informe.sugerenciasNotas);
    const guardadas = Array.isArray(informe.sugerenciasBullets)
      ? informe.sugerenciasBullets.map(normalizarSugerenciaInforme).filter(Boolean)
      : [];
    const lenNotas = String(informe.sugerenciasNotas || "").trim().length;
    const lenGuardadas = guardadas.reduce((s, b) => s + String(b.text || "").length, 0);
    // Si las notas son claramente más ricas que lo guardado (p. ej. IA resumió de más), regenerar
    if (!keepRedactado || !guardadas.length || lenNotas > Math.max(120, lenGuardadas * 1.25)) {
      next.sugerenciasBullets = desdeNotas.length ? desdeNotas : guardadas;
    } else {
      next.sugerenciasBullets = guardadas;
    }
  } else if (Array.isArray(informe.sugerenciasBullets)) {
    next.sugerenciasBullets = informe.sugerenciasBullets.map(normalizarSugerenciaInforme).filter(Boolean);
  } else {
    next.sugerenciasBullets = [];
  }
  return next;
}

function informeTieneRedaccionAi(informe) {
  if (!informe) return false;
  if (informe.aiGenerado) return true;
  const ejes = [...(informe.macros || []), ...(informe.micros || [])];
  return ejes.some((e) => String(e.redactado || "").trim().length > 40);
}

function parseRedactadoABloques(redactado) {
  const lines = String(redactado || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const intro = [];
  const bullets = [];
  lines.forEach((l) => {
    if (/^[•\-\*]\s*/.test(l)) bullets.push(l.replace(/^[•\-\*]\s*/, ""));
    else intro.push(l);
  });
  return { intro: intro.join(" "), bullets };
}

function informeNorm(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function informeTituloTarea(t) {
  if (typeof tituloDisplayTarea === "function") return tituloDisplayTarea(t) || String(t?.info || "").trim();
  return String(t?.info || "").trim();
}

function detectarEjeSugerido(texto) {
  const n = informeNorm(texto);
  if (!n) return { tipo: "otro", eje: "Otros entregables" };
  if (n.includes("mundial") || n.includes("fifa")) return { tipo: "macro", eje: "Temporada Mundialista" };
  if (n.includes("aniversario")) return { tipo: "macro", eje: "Campaña Aniversario" };
  if (n.includes("madre")) return { tipo: "macro", eje: "Día de la Madre" };
  if (n.includes("pricing") || n.includes("precio")) return { tipo: "micro", eje: "Proyecto Pricing" };
  if (n.includes("nida")) return { tipo: "micro", eje: "Gamma Nida" };
  if (n.includes("fii")) return { tipo: "macro", eje: "Proyectos FII" };
  if (/(eventual|especial|bienestar|micro)/.test(n)) {
    return { tipo: "micro", eje: "Microtemporalidades y proyectos especiales" };
  }
  return { tipo: "macro", eje: "Visibilidades PDV" };
}

function filtrarTareasParaInforme(tareas, { marca, desde, hasta } = {}) {
  const lista = Array.isArray(tareas) ? tareas : [];
  return lista.filter((t) => {
    if (!t) return false;
    if (marca && typeof marcasCoinciden === "function" && !marcasCoinciden(t.marca, marca)) return false;
    const fecha = t.deadline || t.fechaFin || t.fecha || t.createdAt || "";
    if (!fecha || (!desde && !hasta)) return true;
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return true;
    if (desde) {
      const a = new Date(desde);
      if (!Number.isNaN(a.getTime()) && d < a) return false;
    }
    if (hasta) {
      const b = new Date(hasta);
      if (!Number.isNaN(b.getTime())) {
        b.setHours(23, 59, 59, 999);
        if (d > b) return false;
      }
    }
    return true;
  });
}

/** Recomendaciones opcionales desde tareas (nunca obligatorias). */
function sugerirAnexosDesdeTareas(tareas, opts = {}) {
  const filtradas = filtrarTareasParaInforme(tareas, opts);
  const porEje = new Map();
  filtradas.forEach((t) => {
    const titulo = informeTituloTarea(t);
    const { tipo, eje } = detectarEjeSugerido(`${t.categoria || ""} ${titulo} ${t.subcliente || ""}`);
    if (!porEje.has(eje)) {
      porEje.set(eje, {
        id: `sug-${informeNorm(eje).replace(/\s+/g, "-")}`,
        tipo,
        eje,
        titulos: [],
        count: 0
      });
    }
    const bucket = porEje.get(eje);
    bucket.count += 1;
    if (bucket.titulos.length < 6 && titulo) bucket.titulos.push(titulo);
  });
  return Array.from(porEje.values())
    .sort((a, b) => b.count - a.count)
    .map((s) => ({
      ...s,
      razon: `Hay ${s.count} tarea${s.count === 1 ? "" : "s"} relacionadas. Puedes anexarlas como eje opcional.`
    }));
}

window.uidInforme = uidInforme;
window.formatearRangoMesesInforme = formatearRangoMesesInforme;
window.crearEjeVacio = crearEjeVacio;
window.crearInformeVacio = crearInformeVacio;
window.clonarInforme = clonarInforme;
window.normalizarInformeDesdeBorrador = normalizarInformeDesdeBorrador;
window.guardarBorradorInforme = guardarBorradorInforme;
window.cargarBorradorInforme = cargarBorradorInforme;
window.borrarBorradorInforme = borrarBorradorInforme;
window.formatearFechaBorrador = formatearFechaBorrador;
window.informeRecuperadoGamaJunAgo2026 = informeRecuperadoGamaJunAgo2026;
window.seedInformeEjemploGama = seedInformeEjemploGama;
window.calcularDistribucionEntregables = calcularDistribucionEntregables;
window.seriesPropuestasPorEje = seriesPropuestasPorEje;
window.seriesEjecutablesComparativa = seriesEjecutablesComparativa;
window.totalesMetricasInforme = totalesMetricasInforme;
window.redactarTemporalidadIA = redactarTemporalidadIA;
window.sugerenciasABulletsIA = sugerenciasABulletsIA;
window.normalizarSugerenciaInforme = normalizarSugerenciaInforme;
window.elegirIconoSugerencia = elegirIconoSugerencia;
window.pulirTextoSugerenciaLargo = pulirTextoSugerenciaLargo;
window.prepararInformeParaVista = prepararInformeParaVista;
window.informeTieneRedaccionAi = informeTieneRedaccionAi;
window.ordenarEjesPorFecha = ordenarEjesPorFecha;
window.pulirFraseInforme = pulirFraseInforme;
window.pulirTituloInforme = pulirTituloInforme;
window.parseRedactadoABloques = parseRedactadoABloques;
window.todosLosEjes = todosLosEjes;
window.sugerirAnexosDesdeTareas = sugerirAnexosDesdeTareas;
window.filtrarTareasParaInforme = filtrarTareasParaInforme;
window.INFORME_COLORES_DISTRIBUCION = INFORME_COLORES_DISTRIBUCION;
window.MESES_ES = MESES_ES;
