const ESTATUS_CLIENTE_MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

const ESTATUS_CLIENTE_ETAPAS = [
  { id: "diseno", key: "diseno", label: "En diseño" },
  { id: "por-enviar", key: "enviar", label: "Próximo envío" },
  { id: "cliente", key: "cliente", label: "En espera de comentarios" }
];

function fechaCorteEstatusCliente(fechaRef) {
  const d = fechaRef instanceof Date ? fechaRef : new Date();
  return `${d.getDate()} de ${ESTATUS_CLIENTE_MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

function coloresEtapasEstatusCliente(accent) {
  const base = String(accent || "#37352F").trim() || "#37352F";
  return {
    diseno: base,
    "por-enviar": "#EA580C",
    cliente: "#0F766E"
  };
}

function fechaCortaEstatusCliente(val) {
  if (!val || val === "—" || (typeof esDeadlineTbd === "function" && esDeadlineTbd(val))) {
    return typeof DEADLINE_TBD !== "undefined" ? DEADLINE_TBD : "TBD";
  }
  if (typeof parsearFechaLibre === "function") {
    const parsed = parsearFechaLibre(val);
    if (parsed) {
      return `${String(parsed.dia).padStart(2, "0")}/${String(parsed.mes).padStart(2, "0")}/${parsed.anio}`;
    }
  }
  const iso = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return String(val);
}

function tituloEntregableClienteEstatus(info, cadena, tarea) {
  let base = "";
  if (typeof textoEstatusEntregable === "function") {
    base = textoEstatusEntregable(info, cadena) || "";
  } else {
    base = String(info || "").replace(/\s+/g, " ").trim();
  }
  if (typeof extraerTituloLimpio === "function" && tarea) {
    base = extraerTituloLimpio(base, tarea.categoria) || base;
  }
  base = String(base || "").replace(/\s+/g, " ").trim();
  const sinLimpieza = base;
  base = base
    .replace(/\s+\d+\s+\d+[,.]\d+\s+\d+[,.]\d+\s*$/g, "")
    .replace(/\bancho\b[^|]*/gi, "")
    .replace(/\balto\b[^|]*/gi, "")
    .replace(/\b\d+[,.]?\d*\s*x\s*\d+[,.]?\d*(\s*(cm|m|mm))?/gi, "")
    .replace(/\bful color\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!base) base = sinLimpieza;
  if (base.length > 56) base = `${base.slice(0, 55).trim()}…`;
  return base || "Sin título";
}

function claveCadenaClienteEstatus(nombre) {
  if (typeof claveSubcliente === "function") return claveSubcliente(nombre) || "__sin__";
  return String(nombre || "").trim().toLowerCase() || "__sin__";
}

function filaDesdeItemClienteEstatus(item, etapa, label) {
  const tarea = item?.tarea;
  const cadena = String(item?.cadena || "").trim() || "Sin cadena";
  const atrasado = etapa !== "cliente"
    && typeof cuentaComoAtrasada === "function"
    && cuentaComoAtrasada(tarea);
  return {
    cadena,
    entregable: tituloEntregableClienteEstatus(item?.entregable || tarea?.info, cadena, tarea),
    etapa,
    estado: label,
    fecha: fechaCortaEstatusCliente(tarea?.deadline || tarea?.fechaInicio || item?.fecha),
    atrasado: Boolean(atrasado)
  };
}

function construirDatosEstatusCliente(tareas, opciones) {
  const opts = opciones || {};
  const listas = typeof listasOperativasEstatus === "function"
    ? listasOperativasEstatus(tareas)
    : { faltaHacer: [], porEnviar: [], esperaCliente: [] };

  const bloques = [
    { etapa: "diseno", items: listas.faltaHacer || [], label: "En diseño" },
    { etapa: "por-enviar", items: listas.porEnviar || [], label: "Próximo envío" },
    { etapa: "cliente", items: listas.esperaCliente || [], label: "En espera" }
  ];

  const filas = [];
  bloques.forEach(({ etapa, items, label }) => {
    (items || []).forEach((item) => {
      filas.push(filaDesdeItemClienteEstatus(item, etapa, label));
    });
  });

  const peso = { diseno: 0, "por-enviar": 1, cliente: 2 };
  const map = new Map();
  filas.forEach((fila) => {
    const key = claveCadenaClienteEstatus(fila.cadena);
    if (!map.has(key)) {
      map.set(key, {
        nombre: fila.cadena,
        filas: [],
        diseno: 0,
        enviar: 0,
        cliente: 0
      });
    } else if (typeof preferirCasingSubcliente === "function") {
      map.get(key).nombre = preferirCasingSubcliente(map.get(key).nombre, fila.cadena);
    }
    const grupo = map.get(key);
    grupo.filas.push(fila);
    if (fila.etapa === "diseno") grupo.diseno += 1;
    else if (fila.etapa === "por-enviar") grupo.enviar += 1;
    else grupo.cliente += 1;
  });

  const grupos = Array.from(map.values())
    .map((grupo) => ({
      ...grupo,
      total: grupo.filas.length,
      filas: grupo.filas.slice().sort((a, b) => (
        (peso[a.etapa] - peso[b.etapa])
        || String(a.entregable).localeCompare(String(b.entregable), "es")
      ))
    }))
    .sort((a, b) => {
      if (a.nombre === "Sin cadena") return 1;
      if (b.nombre === "Sin cadena") return -1;
      return b.total - a.total || String(a.nombre).localeCompare(String(b.nombre), "es");
    });

  const cadenas = grupos
    .slice()
    .sort((a, b) => b.total - a.total || String(a.nombre).localeCompare(String(b.nombre), "es"));

  const kpis = {
    diseno: (listas.faltaHacer || []).length,
    enviar: (listas.porEnviar || []).length,
    cliente: (listas.esperaCliente || []).length
  };
  kpis.total = kpis.diseno + kpis.enviar + kpis.cliente;

  const marcaNombre = String(opts.nombreMarca || "").trim()
    || (typeof formatearMarca === "function" ? formatearMarca(opts.marca) : opts.marca)
    || "Marca";
  const accent = opts.accent || "#37352F";
  const claveMarca = typeof resolverClaveMarca === "function"
    ? resolverClaveMarca(opts.marca || marcaNombre)
    : "";

  return {
    marca: marcaNombre,
    marcaRaw: opts.marca || "",
    claveMarca,
    corte: fechaCorteEstatusCliente(),
    accent,
    logo: typeof obtenerLogoMarca === "function" ? (obtenerLogoMarca(opts.marca) || "") : "",
    logoTipo: typeof obtenerLogoMarcaTipo === "function" ? obtenerLogoMarcaTipo(opts.marca) : "transparente",
    kpis,
    colores: coloresEtapasEstatusCliente(accent),
    etapas: ESTATUS_CLIENTE_ETAPAS,
    grupos,
    cadenas
  };
}
