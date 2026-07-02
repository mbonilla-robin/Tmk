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
      texto: "Prioridad alta pendiente. Toca una tarjeta para abrir la tarea.",
      placement: "bottom",
      pagina: "home"
    },
    {
      id: "resumen-area",
      target: "resumen-area",
      titulo: "Resumen del área",
      texto: "Totales de activos, completados y atrasados de un vistazo.",
      placement: "bottom",
      pagina: "home"
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
      placement: "right",
      pagina: "home",
      opcional: true
    },
    {
      id: "nav-lista",
      target: "nav-lista",
      titulo: "Lista completa",
      texto: "Todos los entregables con filtros y búsqueda.",
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
        titulo: "Estatus y equipos",
        texto: "Genera estatus para clientes y revisa carga por persona.",
        placement: "right",
        pagina: "home",
        opcional: true
      },
      {
        id: "nav-clientes",
        target: "nav-clientes",
        titulo: "Clientes",
        texto: "Fichas e información de cada cliente.",
        placement: "right",
        pagina: "home",
        opcional: true
      }
    );
  }

  pasos.push(
    {
      id: "dashboard-filtros",
      target: "dashboard-filtros",
      titulo: "Filtros",
      texto: "Por cliente, estado, prioridad y persona. En móvil: icono de embudo.",
      placement: "bottom",
      pagina: "dashboard",
      onEntrar: "limpiarFiltrosDashboard"
    },
    {
      id: "dashboard-buscar",
      target: "dashboard-buscar",
      titulo: "Buscar",
      texto: "Encuentra entregables por título o detalle.",
      placement: "bottom",
      pagina: "dashboard"
    },
    {
      id: "dashboard-vistas",
      target: "dashboard-vistas",
      titulo: "Lista o tablero",
      texto: "Lista agrupada o tablero Kanban por estado.",
      placement: "bottom",
      pagina: "dashboard"
    },
    {
      id: "dashboard-tiempo",
      target: "dashboard-tiempo",
      titulo: "Hoy y atrasados",
      texto: "«Hoy» filtra lo del día. «Atrasados» lo vencido sin completar.",
      placement: "bottom",
      pagina: "dashboard",
      onEntrar: "limpiarFiltrosDashboard",
      mobileAbrirFiltros: true
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
        texto: "Ejecutivos y diseñadores reciben la tarea en sus filtros y notificaciones.",
        placement: "top",
        pagina: "agregar"
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
      titulo: "Comentarios",
      texto: "Al abrir una tarea, comenta abajo para coordinar con el equipo.",
      placement: "center",
      pagina: "home"
    },
    {
      id: "seleccion-masiva",
      titulo: "Selección múltiple",
      texto: "Marca varias tareas en la lista para cambiar la fecha de entrega en lote.",
      placement: "center",
      pagina: "dashboard",
      onEntrar: "limpiarFiltrosDashboard"
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
      texto: "Ya puedes usar ROBIN. Para repasar: Ajustes → Opciones avanzadas → Ver inducción.",
      placement: "center",
      pagina: "home"
    }
  );

  return pasos;
}

function encontrarElementoInduccion(targetId) {
  if (!targetId || typeof document === "undefined") return null;
  const nodes = document.querySelectorAll(`[data-induccion="${targetId}"]`);
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") continue;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return el;
  }
  return nodes[0] || null;
}

function acotarRectInduccion(rect, maxW, maxH) {
  if (!rect) return rect;
  if (rect.width <= maxW && rect.height <= maxH) return rect;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const w = Math.min(rect.width, maxW);
  const h = Math.min(rect.height, maxH);
  return {
    top: cy - h / 2,
    left: cx - w / 2,
    width: w,
    height: h
  };
}

function acotarRectInduccionDesdeArriba(rect, maxW, maxH) {
  if (!rect) return rect;
  if (rect.width <= maxW && rect.height <= maxH) return rect;
  const w = Math.min(rect.width, maxW);
  const h = Math.min(rect.height, maxH);
  const cx = rect.left + rect.width / 2;
  return {
    top: rect.top,
    left: cx - w / 2,
    width: w,
    height: h
  };
}
