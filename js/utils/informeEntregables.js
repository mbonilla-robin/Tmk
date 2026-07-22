/**
 * Informe de entregables — ejes de gestión (macro / micro), métricas y textos IA.
 */

const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

const INFORME_COLORES_DISTRIBUCION = [
  "#FFFFFF",
  "#FFD6D6",
  "#FFB4B4",
  "#F08A8A",
  "#E5E5E5",
  "#FFF1F1"
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
    ejecutablesHechos: 0
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
      ejecutablesHechos: Number(e?.ejecutablesHechos) || 0
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
      ? base.sugerenciasBullets
        .map((s) => ({
          icon: String(s?.icon || "spark"),
          text: String(s?.text || "").trim()
        }))
        .filter((s) => s.text)
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
        text: "Mejorar las fechas de entrega de los proyectos para asegurar una implementación oportuna."
      },
      {
        icon: "flag",
        text: "Establecer fechas claras para la recepción de assets de los clientes para agilizar el proceso de diseño y producción."
      },
      {
        icon: "users",
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
      { icon: "clock", text: "Acortar los ciclos de aprobación con el cliente para proteger fechas de piso." },
      { icon: "improve", text: "Documentar un brief estándar para eventualidades fuera de FII." },
      { icon: "shield", text: "Anticipar stock y proveedores de materiales soft de alta rotación." },
      { icon: "users", text: "Alinear pricing con el equipo comercial antes de abrir producción." }
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

function sugerenciasABulletsIA(texto) {
  const partes = partirLineasNotas(texto);
  if (partes.length === 0) return [];
  return partes.slice(0, 8).map((p, i) => ({
    icon: INFORME_ICONOS_SUGERENCIA[i % INFORME_ICONOS_SUGERENCIA.length],
    text: pulirFraseInforme(p)
  }));
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

  if (keepRedactado && Array.isArray(informe.sugerenciasBullets) && informe.sugerenciasBullets.length) {
    next.sugerenciasBullets = informe.sugerenciasBullets;
  } else if (String(informe.sugerenciasNotas || "").trim()) {
    next.sugerenciasBullets = sugerenciasABulletsIA(informe.sugerenciasNotas);
  } else {
    next.sugerenciasBullets = Array.isArray(informe.sugerenciasBullets) ? informe.sugerenciasBullets : [];
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
