// Rollout actual de la inducción. Súbelo solo si quieres mostrarla otra vez a todo el equipo.
// Usuarios con induccionVersion >= este número no la ven automáticamente (solo usuarios nuevos o quien reinicie desde Ajustes).
const INDUCCION_VERSION = 4;
const INDUCCION_HABILITADA = true;

function usuarioDebeVerInduccion(prefs) {
  if (!INDUCCION_HABILITADA) return false;
  const versionVista = Number(prefs?.induccionVersion) || 0;
  return versionVista < INDUCCION_VERSION;
}

function marcarInduccionCompletada(username) {
  if (!username) return;
  saveUserData(username, {
    induccionVersion: INDUCCION_VERSION,
    induccionCompletadaAt: new Date().toISOString()
  });
  if (typeof flushRemoteUserSettings === "function") {
    flushRemoteUserSettings(username).catch(() => {});
  }
}

function reiniciarInduccionUsuario(username) {
  if (!username) return;
  saveUserData(username, {
    induccionVersion: 0,
    induccionCompletadaAt: null
  });
}

function esPlataformaMobile() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}

function esDispositivoTactil() {
  if (typeof window === "undefined") return false;
  return (
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches ||
    "ontouchstart" in window
  );
}

/** Móvil, tablet, iPad y pantallas táctiles con layout desktop. */
function esPlataformaPullRefresh() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(max-width: 1023px)").matches) return true;
  return esDispositivoTactil();
}

function obtenerViewportInduccion() {
  const vv = window.visualViewport;
  return {
    width: vv?.width || window.innerWidth,
    height: vv?.height || window.innerHeight,
    offsetTop: vv?.offsetTop || 0,
    offsetLeft: vv?.offsetLeft || 0,
    scale: vv?.scale || 1
  };
}

function construirPasosInduccion({ esDisenador = false } = {}) {
  const pasos = [
    {
      id: "nav-home",
      target: "nav-home",
      titulo: "Home",
      texto: "Tu resumen diario: urgentes, accesos rápidos y calendario.",
      placement: "right",
      pagina: "home"
    },
    {
      id: "accesos-rapidos",
      target: "accesos-rapidos",
      titulo: "Accesos rápidos",
      texto: "Enlaces a herramientas del equipo. En móvil, toca «Ver más».",
      placement: "bottom",
      pagina: "home",
      opcional: true
    },
    {
      id: "urgentes",
      target: "urgentes",
      titulo: "Urgentes",
      texto: "Prioridad alta en Pendiente o En progreso. Toca una tarjeta para abrir la tarea.",
      placement: "bottom",
      pagina: "home"
    },
    {
      id: "resumen-area",
      target: "resumen-area",
      titulo: "Resumen del área",
      texto: "Totales de activos, completados y atrasados de un vistazo.",
      placement: "bottom",
      pagina: "home",
      scrollTarget: true
    },
    {
      id: "calendario",
      target: "calendario",
      titulo: "Cronograma",
      texto: "Fechas de entrega por día. El color identifica al cliente.",
      placement: "bottom",
      pagina: "home"
    },
    {
      id: "calendario-vistas",
      target: "calendario-vistas",
      targetMobile: "calendario-vistas-mobile",
      titulo: "Semana o mes",
      texto: "Alterna la vista y usa las flechas para navegar.",
      placement: "bottom",
      pagina: "home",
      opcional: true
    },
    {
      id: "panel-hoy",
      target: "panel-hoy",
      titulo: "Panel de hoy",
      texto: "Entregas y tareas para avanzar hoy. Cambia entre tuyas y del equipo.",
      placement: "left",
      pagina: "home",
      soloDesktop: true,
      opcional: true
    },
    {
      id: "presencia",
      target: "presencia",
      titulo: "En línea",
      texto: "Quién está conectado ahora en ROBIN.",
      placement: "bottom",
      pagina: "home",
      opcional: true,
      scrollTarget: true
    },
    {
      id: "nav-lista",
      target: "nav-lista",
      titulo: "Estatus",
      texto: "Estatus general de todas las marcas: resumen, carga y pendientes. Como el de cada cliente, pero de un toque.",
      placement: "right",
      pagina: "home"
    }
  ];

  if (!esDisenador) {
    pasos.push({
      id: "nav-agregar",
      target: "nav-agregar",
      titulo: "Añadir",
      texto: "Crea un entregable nuevo desde aquí.",
      placement: "top",
      pagina: "home"
    });
  }

  pasos.push(
    {
      id: "nav-marcas",
      target: "nav-marcas",
      targetMobile: "nav-clientes",
      titulo: "Por cliente",
      texto: "Filtra entregables de una marca o cliente.",
      placement: "right",
      pagina: "home",
      opcional: true
    },
    {
      id: "sync",
      target: "sync",
      titulo: "Sincronización",
      texto: "Verde: conectado. Ámbar: pendiente. Rojo: sin conexión. Toca para detalles.",
      placement: "bottom",
      pagina: "home"
    },
    {
      id: "notificaciones",
      target: "notificaciones",
      titulo: "Notificaciones",
      texto: "Avisos de asignaciones y comentarios. Toca para ir a la tarea.",
      placement: "bottom",
      pagina: "home"
    }
  );

  if (!esDisenador) {
    pasos.push(
      {
        id: "estatus-equipos",
        target: "estatus-equipos",
        targetMobile: "estatus-equipos-mobile",
        titulo: "Generar y equipos",
        texto: "Genera el texto de estatus para clientes y revisa carga por persona.",
        placement: "right",
        pagina: "home",
        opcional: true,
        mobileAbrirAccesos: true
      },
      {
        id: "nav-clientes",
        target: "nav-clientes",
        titulo: "Clientes",
        texto: "Fichas e información de cada cliente.",
        placement: "right",
        pagina: "home",
        opcional: true,
        soloDesktop: true
      }
    );
  }

  pasos.push(
    {
      id: "dashboard-filtros",
      target: "dashboard-filtros",
      targetMobile: "dashboard-filtros-mobile",
      titulo: "Filtros",
      texto: "Por cliente, estado, prioridad y persona. En móvil: icono de embudo.",
      placement: "bottom",
      pagina: "dashboard",
      onEntrar: "limpiarFiltrosDashboard",
      mobileVistaLista: true
    },
    {
      id: "dashboard-buscar",
      target: "dashboard-buscar",
      titulo: "Buscar",
      texto: "Encuentra entregables por título o detalle.",
      placement: "bottom",
      pagina: "dashboard",
      mobileVistaLista: true
    },
    {
      id: "dashboard-vistas",
      target: "dashboard-vistas",
      targetMobile: "dashboard-vistas-mobile",
      titulo: "Lista o tablero",
      texto: "Lista agrupada o tablero Kanban por estado.",
      placement: "bottom",
      pagina: "dashboard",
      mobileVistaLista: true
    },
    {
      id: "dashboard-tiempo",
      target: "dashboard-tiempo",
      targetMobile: "dashboard-tiempo-mobile",
      titulo: "Hoy y atrasados",
      texto: "«Hoy» filtra lo del día. «Atrasados» lo vencido sin completar.",
      placement: "bottom",
      pagina: "dashboard",
      onEntrar: "limpiarFiltrosDashboard",
      mobileVistaLista: true
    }
  );

  if (!esDisenador) {
    pasos.push(
      {
        id: "form-crear",
        target: "form-crear",
        titulo: "Nuevo entregable",
        texto: "Título, cliente, fechas y prioridad. Lo obligatorio lleva asterisco.",
        placement: "bottom",
        pagina: "agregar"
      },
      {
        id: "form-personas",
        target: "form-personas",
        titulo: "Asignar personas",
        texto: "Ejecutivos, contenido y diseñadores reciben la tarea en sus filtros y notificaciones.",
        placement: "top",
        pagina: "agregar",
        scrollTarget: true
      },
      {
        id: "form-notas",
        target: "form-notas",
        titulo: "Notas",
        texto: "Contexto del entregable y subtareas si hace falta desglosar.",
        placement: "top",
        pagina: "agregar"
      }
    );
  }

  pasos.push(
    {
      id: "comentarios",
      target: "comentarios-demo",
      titulo: "Comentarios",
      texto: "Al abrir una tarea, comenta abajo para coordinar con el equipo.",
      placement: "top",
      pagina: "home",
      demoComentarios: true
    },
    {
      id: "seleccion-masiva",
      target: "seleccion-masiva",
      titulo: "Selección múltiple",
      texto: "Marca el cuadrito a la izquierda de cada tarea. Con varias seleccionadas, cambia la fecha de entrega en lote.",
      placement: "bottom",
      pagina: "dashboard",
      onEntrar: "limpiarFiltrosDashboard",
      mobileVistaLista: true,
      scrollTarget: true
    },
    {
      id: "nav-config",
      target: "nav-config",
      titulo: "Ajustes",
      texto: "Perfil, sincronización y opciones avanzadas (tema, guía de uso).",
      placement: "top",
      pagina: "home"
    },
    {
      id: "fin",
      titulo: "¡Listo!",
      texto: "Ya puedes usar ROBIN con tu equipo.\nPara repasar: Ajustes → Ver inducción.",
      placement: "center",
      estiloIntro: true,
      introFinal: true,
      pagina: "home"
    }
  );

  return pasos;
}

let induccionRecalcToken = 0;

function programarRecalculoInduccion() {
  if (typeof window === "undefined") return;
  const token = ++induccionRecalcToken;
  const emitir = () => {
    if (token !== induccionRecalcToken) return;
    window.dispatchEvent(new CustomEvent("induccion-recalc"));
  };
  requestAnimationFrame(emitir);
  setTimeout(emitir, 280);
  setTimeout(emitir, 650);
}

function esLayoutMobileInduccion() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}

function obtenerTargetIdInduccion(paso) {
  if (!paso) return null;
  if (esLayoutMobileInduccion() && paso.targetMobile) return paso.targetMobile;
  return paso.target || null;
}

function areaVisibleElemento(el) {
  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const visibleW = Math.max(0, Math.min(rect.right, vw) - Math.max(rect.left, 0));
  const visibleH = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
  return visibleW * visibleH;
}

function elementoInduccionEnDom(el, minArea = 144) {
  if (!el || typeof window === "undefined") return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
    return false;
  }

  let parent = el.parentElement;
  while (parent) {
    const ps = window.getComputedStyle(parent);
    if (ps.display === "none" || ps.visibility === "hidden") return false;
    parent = parent.parentElement;
  }

  const rect = el.getBoundingClientRect();
  if (rect.width < 12 || rect.height < 12) return false;
  return rect.width * rect.height >= minArea;
}

function elementoInduccionVisible(el, minArea = 144) {
  if (!elementoInduccionEnDom(el, minArea)) return false;
  return areaVisibleElemento(el) >= Math.min(minArea, 400);
}

function puntuarElementoInduccion(el, targetId) {
  const mobile = esLayoutMobileInduccion();
  let score = areaVisibleElemento(el);

  if (mobile) {
    if (el.closest(".md\\:hidden, .mobile-nav-bar, .mobile-top-bar, .mobile-top-actions, .home-mobile-stack, .home-cronograma, .home-presence-chip, .home-area-stats, .cal-mobile-toolbar, .mobile-dash-toolbar, .notion-dash-search, .notion-task-list, .notion-group-header, .induccion-demo-comentarios")) {
      score += 1e6;
    }
    if (el.closest(".mobile-dash-toolbar")) {
      score += 5e6;
    }
    if (
      targetId === "dashboard-filtros-mobile" &&
      el.matches('[data-induccion="dashboard-filtros-mobile"]')
    ) {
      score += 5e7;
    }
    if (
      targetId === "dashboard-vistas-mobile" &&
      el.matches('[data-induccion="dashboard-vistas-mobile"]')
    ) {
      score += 5e7;
    }
    if (el.closest(".robin-sidebar, .robin-desktop-only, .hidden.md\\:flex, .hidden.md\\:block, .cal-header-desktop")) {
      score -= 1e7;
    }
  } else if (el.closest(".robin-sidebar, .app-header-bar, .robin-desktop-only, .cal-header-desktop")) {
    score += 1e6;
  }

  if (el.closest(".md\\:hidden") && !mobile) score -= 5e5;
  return score;
}

function encontrarElementoInduccion(targetId) {
  if (!targetId || typeof document === "undefined") return null;
  const nodes = document.querySelectorAll(`[data-induccion="${targetId}"]`);
  const requiereMobile = targetId.endsWith("-mobile");
  let mejor = null;
  let mejorScore = -Infinity;

  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    if (requiereMobile && !el.closest(".robin-mobile-only, .md\\:hidden")) continue;
    if (!elementoInduccionEnDom(el)) continue;
    const score = puntuarElementoInduccion(el, targetId);
    if (score > mejorScore) {
      mejorScore = score;
      mejor = el;
    }
  }

  return mejor;
}

function elementoEstaEnViewportInduccion(el, headerReserve = 0, chromeBottom = 0) {
  if (!el) return false;
  const raw = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  if (raw.width < 8 || raw.height < 8) return false;
  const visibleW = Math.max(0, Math.min(raw.right, vw) - Math.max(raw.left, 0));
  const visibleH = Math.max(0, Math.min(raw.bottom, vh - chromeBottom) - Math.max(raw.top, headerReserve));
  return visibleW >= 18 && visibleH >= 18;
}

function scrollContenedorPrincipalInduccion() {
  if (typeof document === "undefined") return;
  const main = document.querySelector(".robin-mobile-main");
  if (main) main.scrollTo({ top: 0, behavior: "auto" });
}

function scrollTargetInduccion(targetId) {
  if (!targetId || typeof document === "undefined") return;
  if (targetId.includes("dashboard-") && targetId.endsWith("-mobile")) {
    scrollContenedorPrincipalInduccion();
  }
  const el = encontrarElementoInduccion(targetId);
  if (!el) return;
  const nodo = obtenerElementoHighlightInduccion(el, targetId) || el;
  nodo.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
}

function unionarRects(rects) {
  const validos = rects.filter((r) => r && r.width > 0 && r.height > 0);
  if (!validos.length) return null;
  const top = Math.min(...validos.map((r) => r.top));
  const left = Math.min(...validos.map((r) => r.left));
  const bottom = Math.max(...validos.map((r) => r.bottom));
  const right = Math.max(...validos.map((r) => r.right));
  return {
    top,
    left,
    width: right - left,
    height: bottom - top
  };
}

function obtenerElementoHighlightInduccion(el, targetId) {
  if (!el) return null;
  if (targetId === "form-personas") {
    return el;
  }
  if (targetId === "dashboard-filtros-mobile" || targetId === "dashboard-filtros") {
    return el.matches("[data-induccion]") ? el : el.querySelector("[data-induccion], .mobile-icon-btn") || el;
  }
  if (targetId === "dashboard-vistas-mobile" || targetId === "dashboard-vistas") {
    return el;
  }
  if (targetId === "dashboard-buscar") {
    return el.closest(".notion-dash-search") || el;
  }
  if (targetId === "seleccion-masiva") {
    return el.closest(".notion-group-header") || el.closest(".notion-task-row") || el;
  }
  if (targetId === "comentarios-demo") {
    return el.closest(".induccion-demo-comentarios") || el;
  }
  return el;
}

function obtenerRectHighlightInduccion(el, targetId, padding = 5) {
  const nodo = obtenerElementoHighlightInduccion(el, targetId);
  if (!nodo) return null;
  const raw = nodo.getBoundingClientRect();
  if (raw.width < 8 || raw.height < 8) return null;

  const style = window.getComputedStyle(nodo);
  const valores = [
    style.borderTopLeftRadius,
    style.borderTopRightRadius,
    style.borderBottomRightRadius,
    style.borderBottomLeftRadius
  ].map((v) => parseFloat(v) || 0);

  return {
    top: raw.top - padding,
    left: raw.left - padding,
    width: raw.width + padding * 2,
    height: raw.height + padding * 2,
    radius: Math.max(...valores, 8) + 2
  };
}

function acotarRectInduccion(rect, maxW, maxH, viewportW, viewportH, margin = 10) {
  if (!rect) return rect;
  if (rect.width <= maxW && rect.height <= maxH) return rect;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const w = Math.min(rect.width, maxW);
  const h = Math.min(rect.height, maxH);
  const resultado = {
    top: cy - h / 2,
    left: cx - w / 2,
    width: w,
    height: h
  };
  if (viewportW && viewportH) {
    resultado.left = Math.min(Math.max(margin, resultado.left), viewportW - w - margin);
    resultado.top = Math.min(Math.max(margin, resultado.top), viewportH - h - margin);
  }
  return resultado;
}

function acotarRectInduccionDesdeArriba(rect, maxW, maxH, viewportW, viewportH, margin = 10) {
  if (!rect) return rect;
  if (rect.width <= maxW && rect.height <= maxH) return rect;
  const w = Math.min(rect.width, maxW);
  const h = Math.min(rect.height, maxH);
  const cx = rect.left + rect.width / 2;
  const resultado = {
    top: rect.top,
    left: cx - w / 2,
    width: w,
    height: h
  };
  if (viewportW && viewportH) {
    resultado.left = Math.min(Math.max(margin, resultado.left), viewportW - w - margin);
    resultado.top = Math.min(Math.max(margin, resultado.top), viewportH - h - margin);
  }
  return resultado;
}
