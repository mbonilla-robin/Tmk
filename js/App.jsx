function App() {
  const [usuario, setUsuario] = useState(() => (hasRobinApiSession() ? getInicialUsuario() : null));
  const [initialPrefs] = useState(() => {
    try {
      return getInitialUserPrefs(getInicialUsuario());
    } catch (e) {
      console.error("ROBIN: error cargando preferencias", e);
      return {};
    }
  });

  const [loginError, setLoginError] = useState("");
  const [claveInput, setClaveInput] = useState("");

  const isAdmin = useMemo(() => isRobinAdmin(usuario), [usuario]);
  const canEditFichas = useMemo(() => isRobinConfigOnlyAdmin(usuario), [usuario]);
  const isConfigOnlyAdmin = useMemo(() => isRobinConfigOnlyAdmin(usuario), [usuario]);
  
  const [listaEjecutivos, setListaEjecutivos] = useState(() => {
    const DEFAULT_EXECUTIVOS = getDefaultExecutiveUsers();
    const setDisDefault = new Set((Array.isArray(ROBIN_DESIGNER_USERNAMES) ? ROBIN_DESIGNER_USERNAMES : []).map(normalizeRobinUsername));
    const setContentDefault = new Set(getDefaultContentUsers().map(normalizeRobinUsername));
    try {
      const guardadosEjecutivos = getLocalStorageItemSafe("robin_lista_ejecutivos", null);
      const guardadosDisenadores = getLocalStorageItemSafe("robin_lista_disenadores", null);
      const guardadosContenido = getLocalStorageItemSafe("robin_lista_contenido", null);
      const contenidoLocal = guardadosContenido
        ? (JSON.parse(guardadosContenido) || []).map(normalizeRobinUsername).filter(Boolean)
        : getDefaultContentUsers();
      const setContentLocal = new Set([...setContentDefault, ...contenidoLocal]);

      // Si existe la llave nueva, úsala. Solo limpiamos exclusividad si ya existe la lista de diseñadores.
      if (guardadosEjecutivos) {
        const ejecutivos = (JSON.parse(guardadosEjecutivos) || [])
          .map(normalizeRobinUsername)
          .filter(Boolean);
        const disenadores = guardadosDisenadores ? (JSON.parse(guardadosDisenadores) || []).map(normalizeRobinUsername).filter(Boolean) : [];
        const setDisLocal = new Set(disenadores);

        const limpios = Array.from(new Set(ejecutivos))
          .filter((u) => u === "admin" || (!setDisDefault.has(u) && !setDisLocal.has(u) && !setContentLocal.has(u)));

        return limpios.length ? limpios : DEFAULT_EXECUTIVOS;
      }

      // Migración desde el esquema anterior: robin_lista_usuarios.
      const legado = getLocalStorageItemSafe("robin_lista_usuarios", null);
      if (legado) {
        const arr = JSON.parse(legado) || [];
        const exec = [];
        arr.forEach((u) => {
          const user = normalizeRobinUsername(u);
          if (!user) return;
          if (user === "admin") {
            exec.push(user);
            return;
          }
          if (setDisDefault.has(user) || setContentLocal.has(user)) return;
          exec.push(user);
        });
        const finalExec = Array.from(new Set(exec));
        setLocalStorageItemSafe("robin_lista_ejecutivos", JSON.stringify(finalExec));
        return finalExec.length ? finalExec : DEFAULT_EXECUTIVOS;
      }

      return DEFAULT_EXECUTIVOS;
    } catch (e) {
      return DEFAULT_EXECUTIVOS;
    }
  });

  const [listaContenido, setListaContenido] = useState(() => {
    const DEFAULT_CONTENIDO = getDefaultContentUsers();
    try {
      const guardadosContenido = getLocalStorageItemSafe("robin_lista_contenido", null);
      if (guardadosContenido) {
        const contenido = (JSON.parse(guardadosContenido) || [])
          .map(normalizeRobinUsername)
          .filter(Boolean)
          .filter((u) => u !== "admin");
        return Array.from(new Set(contenido.length ? contenido : DEFAULT_CONTENIDO));
      }

      // Migración: sacar de ejecutivos guardados a quienes son contenido por defecto.
      const setContentDefault = new Set(DEFAULT_CONTENIDO);
      const guardadosEjecutivos = getLocalStorageItemSafe("robin_lista_ejecutivos", null);
      if (guardadosEjecutivos) {
        const ejecutivos = (JSON.parse(guardadosEjecutivos) || []).map(normalizeRobinUsername).filter(Boolean);
        const desdeExec = ejecutivos.filter((u) => setContentDefault.has(u));
        const fusion = Array.from(new Set([...DEFAULT_CONTENIDO, ...desdeExec]));
        setLocalStorageItemSafe("robin_lista_contenido", JSON.stringify(fusion));
        return fusion;
      }

      setLocalStorageItemSafe("robin_lista_contenido", JSON.stringify(DEFAULT_CONTENIDO));
      return DEFAULT_CONTENIDO;
    } catch (e) {
      return DEFAULT_CONTENIDO;
    }
  });

  const [listaDisenadores, setListaDisenadores] = useState(() => {
    const setDisDefault = new Set((Array.isArray(ROBIN_DESIGNER_USERNAMES) ? ROBIN_DESIGNER_USERNAMES : []).map(normalizeRobinUsername));
    try {
      const guardadosDisenadores = getLocalStorageItemSafe("robin_lista_disenadores", null);
      if (guardadosDisenadores) {
        const disenadores = (JSON.parse(guardadosDisenadores) || [])
          .map(normalizeRobinUsername)
          .filter(Boolean)
          .filter((u) => u !== "admin");
        return Array.from(new Set(disenadores));
      }

      // Migración desde el esquema anterior: robin_lista_usuarios.
      const legado = getLocalStorageItemSafe("robin_lista_usuarios", null);
      if (legado) {
        const arr = JSON.parse(legado) || [];
        const dis = [];
        arr.forEach((u) => {
          const user = normalizeRobinUsername(u);
          if (!user || user === "admin") return;
          if (setDisDefault.has(user)) dis.push(user);
        });
        const finalDis = Array.from(new Set(dis));
        setLocalStorageItemSafe("robin_lista_disenadores", JSON.stringify(finalDis));
        return finalDis.length ? finalDis : (Array.isArray(ROBIN_DESIGNER_USERNAMES) ? ROBIN_DESIGNER_USERNAMES.slice() : []);
      }

      return Array.isArray(ROBIN_DESIGNER_USERNAMES) ? ROBIN_DESIGNER_USERNAMES.slice() : [];
    } catch (e) {
      return Array.isArray(ROBIN_DESIGNER_USERNAMES) ? ROBIN_DESIGNER_USERNAMES.slice() : [];
    }
  });

  const isDesigner = useMemo(() => isRobinDesigner(usuario, listaDisenadores), [usuario, listaDisenadores]);

  const [nuevoEjecutivoInput, setNuevoEjecutivoInput] = useState("");
  const [nuevoContenidoInput, setNuevoContenidoInput] = useState("");
  const [nuevoDisenadorInput, setNuevoDisenadorInput] = useState("");

  const [theme, setTheme] = useState(() => {
    try {
      return typeof getBootTheme === "function" ? getBootTheme() : (initialPrefs.theme || "notion");
    } catch (e) {
      return "notion";
    }
  });
  const [pwaIconVariant, setPwaIconVariant] = useState(() =>
    initialPrefs.pwaIconVariant || initialPrefs.logoVariant || "naranja"
  );
  const currentTheme = useMemo(() => TEMAS[theme] || TEMAS.notion, [theme]);

  const [tareas, setTareas] = useState(() => cargarTareasLocales());
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [apiErrorDetail, setApiErrorDetail] = useState("");
  const [ultimaSyncOk, setUltimaSyncOk] = useState(null);
  const [hayPendientesLocales, setHayPendientesLocales] = useState(() => calcularHayPendientesLocales());
  const [importandoEstatus, setImportandoEstatus] = useState(false);
  const syncMutexRef = useRef(false);
  const syncTimerRef = useRef(null);
  const guardandoRef = useRef(false);
  const csvEstatusInputRef = useRef(null);
  const restauroEstatusRef = useRef(0);
  const alineadasEstatusRef = useRef(new Set());
  
  const [filtroTiempo, setFiltroTiempo] = useState(() => initialPrefs.filtroTiempo || "TODAS"); 
  const [filtroMarca, setFiltroMarca] = useState(() => initialPrefs.filtroMarca || "TODAS");
  const [filtroEstado, setFiltroEstado] = useState(() => initialPrefs.filtroEstado || "TODOS");
  const [filtroPrioridad, setFiltroPrioridad] = useState(() => initialPrefs.filtroPrioridad || "TODAS"); 
  const [filtroPersona, setFiltroPersona] = useState(() => initialPrefs.filtroPersona || "TODAS");
  const [searchQuery, setSearchQuery] = useState(() => initialPrefs.searchQuery || "");
  
  const [paginaActiva, setPaginaActiva] = useState(() =>
    resolvePaginaActivaForUser(getInicialUsuario(), initialPrefs)
  ); 
  const [vistaModo, setVistaModo] = useState(() => initialPrefs.vistaModo || "TABLE"); 
  const [listaAgrupacion, setListaAgrupacion] = useState(() => initialPrefs.listaAgrupacion || "estado");
  const [kanbanOrdenPrioridad, setKanbanOrdenPrioridad] = useState(() => initialPrefs.kanbanOrdenPrioridad || "desc");

  const [activeTask, setActiveTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [taskToComplete, setTaskToComplete] = useState(null);
  const [clientesReset, setClientesReset] = useState(0);
  const [clientesDetalleMarca, setClientesDetalleMarca] = useState(null);
  const [notificaciones, setNotificaciones] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [notifCargando, setNotifCargando] = useState(false);
  const [tareasSeleccionadas, setTareasSeleccionadas] = useState(() => new Set());
  const [relacionesTareas, setRelacionesTareas] = useState(() => cargarRelacionesIniciales());
  const [bulkDeadline, setBulkDeadline] = useState("");

  const [nombreCompleto, setNombreCompleto] = useState(() => {
    const p = migrarNombreCompletoAPerfil(initialPrefs);
    return construirNombreCompletoPerfil(p.perfilNombre, p.perfilApellido) || p.nombreCompleto || "";
  });
  const [perfilNombre, setPerfilNombre] = useState(() => migrarNombreCompletoAPerfil(initialPrefs).perfilNombre || "");
  const [perfilApellido, setPerfilApellido] = useState(() => migrarNombreCompletoAPerfil(initialPrefs).perfilApellido || "");
  const [perfilCorreo, setPerfilCorreo] = useState(() => migrarNombreCompletoAPerfil(initialPrefs).perfilCorreo || "");
  const [perfilAvatar, setPerfilAvatar] = useState(() => migrarNombreCompletoAPerfil(initialPrefs).perfilAvatar || "");

  const [marcasMetadata, setMarcasMetadata] = useState({});
  const [widgets, setWidgets] = useState([]);

  const [usuariosConectados, setUsuariosConectados] = useState([]);
  const [presenceEstado, setPresenceEstado] = useState("idle");

  const [syncDetalleVisible, setSyncDetalleVisible] = useState(false);
  const [dashboardMobileVista, setDashboardMobileVista] = useState(() => initialPrefs.dashboardMobileVista || "lista");
  const [configSeccion, setConfigSeccion] = useState(null);
  const [configOrigenSeccion, setConfigOrigenSeccion] = useState(null);
  const [configUiBump, setConfigUiBump] = useState(0);
  const [showGeneradorEstatus, setShowGeneradorEstatus] = useState(false);
  const [formularioRapidoVisible, setFormularioRapidoVisible] = useState(false);
  const [noticiasTmk, setNoticiasTmk] = useState([]);
  const [cargandoNoticiasTmk, setCargandoNoticiasTmk] = useState(false);
  const [noticiasTmkArchivo, setNoticiasTmkArchivo] = useState([]);
  const [cargandoNoticiasTmkArchivo, setCargandoNoticiasTmkArchivo] = useState(false);
  const [noticiaTmkAbierta, setNoticiaTmkAbierta] = useState(null);
  const [panelTmkNewsVisible, setPanelTmkNewsVisible] = useState(false);
  const [sidebarMarcasAbierto, setSidebarMarcasAbierto] = useState(true);
  const [sidebarEnLineaAbierto, setSidebarEnLineaAbierto] = useState(true);
  const [prefsReady, setPrefsReady] = useState(() => !getInicialUsuario());
  const [induccionActiva, setInduccionActiva] = useState(false);
  const [induccionBienvenidaVisible, setInduccionBienvenidaVisible] = useState(false);
  const [induccionPaso, setInduccionPaso] = useState(0);
  const [induccionPendiente, setInduccionPendiente] = useState(false);
  const induccionReplayRef = useRef(false);

  const [listaPersonas, setListaPersonas] = useState(() => cargarListaPersonas());
  const [listaCategorias, setListaCategorias] = useState(() => cargarListaCategorias());
  const [listaSubclientes, setListaSubclientes] = useState(() => cargarListaSubclientes());

  const palabraEstadoSync = useMemo(() => {
    if (!isApiConfigured()) return "Sin API";
    if (hayPendientesLocales) return "Pendiente";
    if (loading || syncing) return "Sincronizando";
    if (apiError) return "Sin conexión";
    return "Sincronizado";
  }, [loading, syncing, apiError, hayPendientesLocales]);

  const filtrosDashboardActivos = useMemo(() => {
    return filtroMarca !== "TODAS" ||
      filtroEstado !== "TODOS" ||
      filtroPrioridad !== "TODAS" ||
      filtroPersona !== "TODAS" ||
      filtroTiempo !== "TODAS" ||
      searchQuery.trim() !== "";
  }, [filtroMarca, filtroEstado, filtroPrioridad, filtroPersona, filtroTiempo, searchQuery]);

  const pasosInduccion = useMemo(
    () => (typeof construirPasosInduccion === "function" ? construirPasosInduccion({ esDisenador: isDesigner }) : []),
    [isDesigner]
  );

  const pasosInduccionFiltrados = useMemo(() => {
    const mobile = typeof esPlataformaMobile === "function" && esPlataformaMobile();
    return pasosInduccion.filter((p) => !(p.soloDesktop && mobile));
  }, [pasosInduccion]);

  const [nuevaTarea, setNuevaTarea] = useState(() => (
    typeof window.crearNuevaTareaVacia === "function"
      ? window.crearNuevaTareaVacia()
      : (typeof crearNuevaTareaVacia === "function" ? crearNuevaTareaVacia() : {
          marca: "La Santé", categoria: "", subcliente: "", info: "", personas: "", detalles: "",
          link: "", estado: "Pendiente", deadline: "", fechaInicio: "", prioridad: "Media"
        })
  ));

  // 🚨 UBICACIÓN CORRECTA DE VARIABLES COMPUTADAS Y useMemo (Evita ReferenceError y TDZ)
  const tareasVisibles = useMemo(() => {
    if (!isDesigner || !usuario) return tareas;
    return filtrarTareasAsignadasADisenador(tareas, usuario);
  }, [tareas, isDesigner, usuario]);

  const marcasDisponibles = useMemo(() => {
    return obtenerMarcasUnicas([
      ...Object.keys(marcasMetadata),
      ...tareasVisibles.map(t => t.marca).filter(Boolean)
    ]);
  }, [tareasVisibles, marcasMetadata]);

  const tareasActivasCount = useMemo(() => {
    return tareasVisibles.filter(t => !esTareaCompletada(t) && !esTareaSuspendida(t)).length;
  }, [tareasVisibles]);

  const tareasFiltradas = useMemo(() => {
    const hoy = new Date();
    const tHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
    
    return tareasVisibles.filter(t => {
      const tDeadline = obtenerTiempoFecha(t.deadline);
      const esCompletada = cleanEstado(t.estado) === "completada";
      const esSuspendida = esTareaSuspendida(t);

      if (esSuspendida) return false;
      
      if (filtroTiempo === "HOY") {
        if (!esRelevanteHoyTarea(t, tHoy)) return false;
      } else if (filtroTiempo === "ATRASADAS") {
        if (!cuentaComoAtrasada(t, tHoy)) return false;
      } else if (filtroTiempo === "FUTURAS") {
        const esFutura = tDeadline !== Infinity && tDeadline > tHoy;
        if (!esFutura) return false;
      }

      if (filtroMarca !== "TODAS" && !marcasCoinciden(t.marca, filtroMarca)) return false;
      if (filtroEstado !== "TODOS") {
        if (cleanEstado(t.estado) !== cleanEstado(filtroEstado)) return false;
      } else if (esCompletada) {
        return false;
      }
      if (filtroPrioridad !== "TODAS" && normalizarPrioridad(t.prioridad) !== normalizarPrioridad(filtroPrioridad)) return false;
      if (filtroPersona === "SIN_DISENADOR") {
        if (!tareaSinDisenadorAsignado(t)) return false;
      } else if (filtroPersona !== "TODAS" && !tareaIncluyePersonaFiltro(t.personas || "", filtroPersona)) return false;

      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        return (
          (t.info || "").toLowerCase().includes(q) ||
          (t.detalles && (t.detalles || "").toLowerCase().includes(q)) ||
          (t.personas && (t.personas || "").toLowerCase().includes(q)) ||
          (t.categoria && (t.categoria || "").toLowerCase().includes(q)) ||
          (obtenerSubclienteTarea(t) || "").toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [tareasVisibles, filtroTiempo, filtroMarca, filtroEstado, filtroPrioridad, filtroPersona, searchQuery]);

  const metricaCounters = useMemo(() => {
    const tHoy = obtenerTiempoHoyLocal();
    const entregasHoy = tareasVisibles.filter(t => esEntregaHoyTarea(t, tHoy)).length;
    const trabajarHoy = tareasVisibles.filter(t => esTrabajarHoyTarea(t, tHoy)).length;
    const activasHoy = entregasHoy + trabajarHoy;

    const atrasadas = tareasVisibles.filter(t => cuentaComoAtrasada(t, tHoy)).length;
    
    return { activasHoy, entregasHoy, trabajarHoy, atrasadas };
  }, [tareasVisibles]);

  const atajoFiltroActivo = useMemo(() => {
    if (filtroMarca !== "TODAS") return null;
    if (filtroTiempo === "HOY" && filtroEstado === "TODOS" && filtroPersona === "TODAS") return "hoy";
    if (filtroTiempo === "ATRASADAS" && filtroEstado === "TODOS" && filtroPersona === "TODAS") return "atrasadas";
    if (filtroTiempo === "TODAS" && cleanEstado(filtroEstado) === "en revision" && filtroPersona === "TODAS") return "revision";
    if (filtroPersona === "SIN_DISENADOR") return "sin-disenador";
    if (isDesigner && usuario) {
      const handle = usuario.startsWith("@") ? usuario : `@${usuario}`;
      if (filtroPersona === handle && filtroTiempo === "TODAS" && filtroEstado === "TODOS") return "mias";
    }
    return null;
  }, [filtroMarca, filtroTiempo, filtroEstado, filtroPersona, isDesigner, usuario]);

  // getMarcaStyle definido en js/utils/marcas.js
  // =========================================================================

  const estadoSyncResumen = useMemo(() => resumirEstadoSyncRobin({
    apiError,
    apiErrorDetail,
    syncing,
    loading,
    colaPendiente: typeof cargarColaSync === "function" ? cargarColaSync().length : 0
  }), [apiError, apiErrorDetail, syncing, loading, hayPendientesLocales, tareas.length]);

  const otrosUsuariosEnLinea = useMemo(() => {
    const yo = String(usuario || "").replace(/^@/, "").toLowerCase();
    return usuariosConectados.filter(u => String(u.username || "").replace(/^@/, "").toLowerCase() !== yo);
  }, [usuariosConectados, usuario]);

  const refrescarNotificaciones = useCallback(async (opts) => {
    if (!usuario || isConfigOnlyAdmin) return;
    const soloActualizarUi = opts?.soloActualizarUi === true;
    setNotifCargando(true);
    try {
      const [lista, count] = await Promise.all([
        fetchNotificacionesUsuario(usuario),
        contarNotificacionesNoLeidas(usuario)
      ]);

      setNotificaciones(lista);
      setUnreadNotifCount(count);
    } finally {
      setNotifCargando(false);
    }
  }, [usuario, isConfigOnlyAdmin]);

  const cargarNoticiasTmk = useCallback(async () => {
    setCargandoNoticiasTmk(true);
    try {
      const lista = await fetchNoticiasTmk({ dias: TMK_NEWS_DIAS_HOME });
      setNoticiasTmk(lista);
    } finally {
      setCargandoNoticiasTmk(false);
    }
  }, []);

  const cargarNoticiasTmkArchivo = useCallback(async () => {
    setCargandoNoticiasTmkArchivo(true);
    try {
      const lista = await fetchNoticiasTmk({ dias: TMK_NEWS_DIAS_ARCHIVO });
      setNoticiasTmkArchivo(lista);
    } finally {
      setCargandoNoticiasTmkArchivo(false);
    }
  }, []);

  useEffect(() => {
    if (!usuario) return undefined;
    if (paginaActiva !== "home" && !(paginaActiva === "configuracion" && configSeccion === "news")) {
      return undefined;
    }
    cargarNoticiasTmk();
    return undefined;
  }, [usuario, paginaActiva, configSeccion, cargarNoticiasTmk]);

  useEffect(() => {
    if (!usuario || paginaActiva !== "tmknews") return undefined;
    cargarNoticiasTmkArchivo();
    return undefined;
  }, [usuario, paginaActiva, cargarNoticiasTmkArchivo]);

  const abrirPanelTmkNews = useCallback(() => {
    let esDesktop = false;
    try {
      esDesktop = window.matchMedia("(min-width: 768px)").matches;
    } catch (e) {
      esDesktop = false;
    }

    if (esDesktop) {
      setPanelTmkNewsVisible(true);
      return;
    }

    setConfigOrigenSeccion("home");
    setPaginaActiva("configuracion");
    setSyncDetalleVisible(false);
    setConfigSeccion("news");
  }, []);

  const handleConfigSubpageBack = useCallback(() => {
    if (configSeccion === "news" && configOrigenSeccion === "home") {
      setConfigOrigenSeccion(null);
      setConfigSeccion(null);
      setPaginaActiva("home");
      setSyncDetalleVisible(false);
      return;
    }
    setConfigSeccion(null);
  }, [configSeccion, configOrigenSeccion]);

  useEffect(() => {
    if (!usuario || isConfigOnlyAdmin) return undefined;
    refrescarNotificaciones();
    const interval = setInterval(refrescarNotificaciones, NOTIF_POLL_MS);
    return () => clearInterval(interval);
  }, [usuario, isConfigOnlyAdmin, refrescarNotificaciones]);

  useEffect(() => {
    if (!usuario || isConfigOnlyAdmin) return undefined;

    const alVolverVisible = () => {
      if (document.visibilityState !== "visible") return;
      refrescarNotificaciones({ soloActualizarUi: true });
    };

    document.addEventListener("visibilitychange", alVolverVisible);
    return () => document.removeEventListener("visibilitychange", alVolverVisible);
  }, [usuario, isConfigOnlyAdmin, refrescarNotificaciones]);

  useEffect(() => {
    if (!usuario || !hasRobinApiSession()) return;

    const apiUrl = getConfiguredApiUrl();
    if (!isApiConfigured()) {
      setPresenceEstado("error");
      return;
    }

    setPresenceEstado("connecting");
    enviarHeartbeatPresencia(apiUrl, usuario, nombreCompleto);
    setPresenceEstado("ready");

    const heartbeatInterval = setInterval(() => {
      enviarHeartbeatPresencia(apiUrl, usuario, nombreCompleto);
    }, 20000);

    const presencePollInterval = setInterval(() => {
      sincronizarEnSegundoPlano();
    }, 60000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(presencePollInterval);
      setUsuariosConectados([]);
      setPresenceEstado("idle");
    };
  }, [usuario, nombreCompleto]);

  useEffect(() => {
    if (isConfigOnlyAdmin && paginaActiva !== "configuracion") {
      setPaginaActiva("configuracion");
    }
  }, [usuario, paginaActiva, isConfigOnlyAdmin]);

  useEffect(() => {
    if (!isDesigner) return;
    const paginasRestringidas = ["clientes", "agregar", "equipos", "informes"];
    if (paginasRestringidas.includes(paginaActiva)) {
      setPaginaActiva("home");
    }
  }, [usuario, paginaActiva, isDesigner]);

  useEffect(() => {
    const stored = getInicialUsuario();
    if (stored && hasRobinApiSession()) {
      repararColaSyncMarcas();
      repararColaSyncActualizacionesFantasma();
      repararFlagsSyncSinCola();
      setHayPendientesLocales(calcularHayPendientesLocales());
      setUsuario(stored);
      return;
    }
    if (stored && !hasRobinApiSession()) {
      clearRobinApiSession();
      setUsuario(null);
    }
  }, []);

  const aplicarPreferenciasUsuario = async (userClean) => {
    const prefs = await mergeAndSyncUserPrefs(userClean);
    applyPrefsToReactState(prefs, {
      setNombreCompleto,
      setPerfilNombre,
      setPerfilApellido,
      setPerfilCorreo,
      setPerfilAvatar,
      setTheme,
      setPwaIconVariant,
      setVistaModo,
      setFiltroTiempo,
      setFiltroMarca,
      setFiltroEstado,
      setFiltroPrioridad,
      setFiltroPersona,
      setSearchQuery,
      setDashboardMobileVista,
      setPaginaActiva
    }, userClean);
  };

  useEffect(() => {
    if (!usuario) {
      setPrefsReady(true);
      return;
    }

    let cancelled = false;
    setPrefsReady(false);

    mergeAndSyncUserPrefs(usuario).then(prefs => {
      if (cancelled) return;
      applyPrefsToReactState(prefs, {
        setNombreCompleto,
        setPerfilNombre,
        setPerfilApellido,
        setPerfilCorreo,
        setPerfilAvatar,
        setTheme,
        setPwaIconVariant,
        setVistaModo,
        setFiltroTiempo,
        setFiltroMarca,
        setFiltroEstado,
        setFiltroPrioridad,
        setFiltroPersona,
        setSearchQuery,
        setDashboardMobileVista,
        setListaAgrupacion,
        setPaginaActiva
      }, usuario);
      if (typeof invalidarCachePerfilUsuario === "function") {
        invalidarCachePerfilUsuario(usuario);
      }
      setPrefsReady(true);
    }).catch((e) => {
      console.warn("ROBIN: fallo al sincronizar preferencias al iniciar", e);
      if (!cancelled) setPrefsReady(true);
    });

    const resyncAlVolver = () => {
      if (document.visibilityState !== "visible" || cancelled) return;
      mergeAndSyncUserPrefs(usuario).then(prefs => {
        if (cancelled) return;
        applyPrefsToReactState(prefs, {
          setNombreCompleto,
          setPerfilNombre,
          setPerfilApellido,
          setPerfilCorreo,
          setPerfilAvatar,
          setTheme,
          setPwaIconVariant,
          setVistaModo,
          setFiltroTiempo,
          setFiltroMarca,
          setFiltroEstado,
          setFiltroPrioridad,
          setFiltroPersona,
          setSearchQuery,
          setDashboardMobileVista,
          setPaginaActiva
        }, usuario);
        if (typeof invalidarCachePerfilUsuario === "function") {
          invalidarCachePerfilUsuario(usuario);
        }
      });
    };
    document.addEventListener("visibilitychange", resyncAlVolver);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", resyncAlVolver);
    };
  }, [usuario]);

  useEffect(() => {
    if (["tema", "logo", "usuarios"].includes(configSeccion)) {
      setConfigSeccion("avanzadas");
    }
  }, [configSeccion]);

  useEffect(() => {
    if (paginaActiva !== "configuracion" || configSeccion) return;
    const esDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (esDesktop) {
      setConfigSeccion(isConfigOnlyAdmin ? "api" : "perfil");
    }
  }, [paginaActiva, configSeccion, isConfigOnlyAdmin]);

  useEffect(() => {
    if (typeof applyPwaIconVariant === "function") {
      applyPwaIconVariant(pwaIconVariant);
    }
  }, [pwaIconVariant]);

  useEffect(() => {
    if (!usuario || !prefsReady) return;
    try {
      setLocalStorageItemSafe("robin_theme", theme);
    } catch (e) { /* ignore */ }
    saveUserData(usuario, {
      nombreCompleto,
      theme,
      pwaIconVariant,
      paginaActiva,
      vistaModo,
      listaAgrupacion,
      kanbanOrdenPrioridad,
      filtroTiempo,
      filtroMarca,
      filtroEstado,
      filtroPrioridad,
      filtroPersona,
      searchQuery,
      dashboardMobileVista
    });
  }, [
    usuario,
    prefsReady,
    nombreCompleto,
    theme,
    pwaIconVariant,
    paginaActiva,
    vistaModo,
    listaAgrupacion,
    kanbanOrdenPrioridad,
    filtroTiempo,
    filtroMarca,
    filtroEstado,
    filtroPrioridad,
    filtroPersona,
    searchQuery,
    dashboardMobileVista
  ]);

  useEffect(() => {
    if (usuario && hasRobinApiSession()) {
      fetchData(false).finally(() => sincronizarEnSegundoPlano());
    }
  }, [usuario]);

  useEffect(() => {
    if (!usuario || !hasRobinApiSession()) return;
    const autoRefreshInterval = setInterval(() => {
      sincronizarEnSegundoPlano();
    }, typeof AUTO_SYNC_INTERVAL_MS !== "undefined" ? AUTO_SYNC_INTERVAL_MS : 35000);
    return () => clearInterval(autoRefreshInterval);
  }, [usuario]);

  useEffect(() => {
    if (!usuario || !hasRobinApiSession()) return;
    const reconectarAlVolver = () => {
      if (document.visibilityState === "visible") {
        sincronizarEnSegundoPlano();
      }
    };
    document.addEventListener("visibilitychange", reconectarAlVolver);
    return () => document.removeEventListener("visibilitychange", reconectarAlVolver);
  }, [usuario]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSyncClick = () => {
    setSyncDetalleVisible((prev) => !prev);
  };

  const persistTareas = (updater) => {
    setTareas((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      guardarTareasLocales(next);
      return next;
    });
  };

  const navegarA = (pagina, extraFn = null) => {
    if (isConfigOnlyAdmin && pagina !== "configuracion") {
      setPaginaActiva("configuracion");
      showToast("Función restringida para el administrador de ajustes", "info");
      return;
    }
    if (isDesigner && ["clientes", "agregar", "equipos"].includes(pagina)) {
      showToast("Función no disponible en modo diseño", "info");
      return;
    }
    setPaginaActiva(pagina);
    setSyncDetalleVisible(false);
    if (pagina !== "dashboard") {
      limpiarSeleccionTareas();
      setDashboardMobileVista("lista");
    }
    if (pagina !== "configuracion") {
      setConfigSeccion(null);
      setConfigOrigenSeccion(null);
    }
    if (pagina === "clientes") setClientesReset(n => n + 1);
    if (extraFn) extraFn();
  };

  const irATareasPersona = (personaHandle, estado) => {
    navegarA("dashboard", () => {
      setFiltroTiempo("TODAS");
      setFiltroMarca("TODAS");
      setFiltroEstado(estado || "TODOS");
      setFiltroPrioridad("TODAS");
      setFiltroPersona(personaHandle);
      setSearchQuery("");
    });
  };

  const handleAbrirMarcaCliente = (marca) => {
    navegarA("dashboard", () => {
      setFiltroMarca(marca);
      setFiltroTiempo("TODAS");
      setFiltroEstado("TODOS");
      setFiltroPrioridad("TODAS");
      setFiltroPersona("TODAS");
      setSearchQuery("");
      setDashboardMobileVista("lista");
    });
  };

  const limpiarFiltrosDashboardInduccion = useCallback(() => {
    setFiltroTiempo("TODAS");
    setFiltroMarca("TODAS");
    setFiltroEstado("TODOS");
    setFiltroPrioridad("TODAS");
    setFiltroPersona("TODAS");
    setSearchQuery("");
    setDashboardMobileVista("lista");
  }, []);

  const aplicarAtajoFiltro = useCallback((atajo) => {
    const aplicar = () => {
      setFiltroMarca("TODAS");
      setFiltroPrioridad("TODAS");
      setSearchQuery("");
      setDashboardMobileVista("lista");

      if (atajo === "hoy") {
        setFiltroTiempo("HOY");
        setFiltroEstado("TODOS");
        setFiltroPersona("TODAS");
      } else if (atajo === "atrasadas") {
        setFiltroTiempo("ATRASADAS");
        setFiltroEstado("TODOS");
        setFiltroPersona("TODAS");
      } else if (atajo === "revision") {
        setFiltroTiempo("TODAS");
        setFiltroEstado("En revision");
        setFiltroPersona("TODAS");
      } else if (atajo === "sin-disenador") {
        setFiltroTiempo("TODAS");
        setFiltroEstado("TODOS");
        setFiltroPersona("SIN_DISENADOR");
      } else if (atajo === "mias" && usuario) {
        setFiltroTiempo("TODAS");
        setFiltroEstado("TODOS");
        setFiltroPersona(usuario.startsWith("@") ? usuario : `@${usuario}`);
      } else if (atajo === "activos") {
        setFiltroTiempo("TODAS");
        setFiltroEstado("En progreso");
        setFiltroPersona("TODAS");
      } else if (atajo === "listos") {
        setFiltroTiempo("TODAS");
        setFiltroEstado("Completada");
        setFiltroPersona("TODAS");
      } else if (atajo === "urgentes") {
        setFiltroTiempo("TODAS");
        setFiltroEstado("TODOS");
        setFiltroPersona("TODAS");
        setFiltroPrioridad("Alta");
      } else if (atajo === "total") {
        setFiltroTiempo("TODAS");
        setFiltroEstado("TODOS");
        setFiltroPersona("TODAS");
      }
    };

    if (paginaActiva === "dashboard") {
      aplicar();
    } else {
      navegarA("dashboard", aplicar);
    }
  }, [usuario, paginaActiva]);

  const aplicarEntradaPasoInduccion = useCallback((paso) => {
    if (!paso) return;

    if (paso.onEntrar === "limpiarFiltrosDashboard") {
      limpiarFiltrosDashboardInduccion();
    }
    if (paso.mobileAbrirFiltros && typeof esPlataformaMobile === "function" && esPlataformaMobile()) {
      setDashboardMobileVista("filtros");
    }
    if (paso.mobileVistaLista && typeof esPlataformaMobile === "function" && esPlataformaMobile()) {
      setDashboardMobileVista("lista");
    }
    if (
      typeof esPlataformaMobile === "function" &&
      esPlataformaMobile() &&
      typeof obtenerTargetIdInduccion === "function" &&
      typeof scrollTargetInduccion === "function"
    ) {
      const targetScroll = obtenerTargetIdInduccion(paso);
      if (targetScroll && (paso.pagina === "dashboard" || paso.scrollTarget)) {
        requestAnimationFrame(() => {
          scrollTargetInduccion(targetScroll);
          if (typeof programarRecalculoInduccion === "function") {
            programarRecalculoInduccion();
            setTimeout(programarRecalculoInduccion, 420);
          }
        });
      }
    }
    if (paso.mobileAbrirAccesos && typeof esPlataformaMobile === "function" && esPlataformaMobile()) {
      window.dispatchEvent(new CustomEvent("induccion-abrir-accesos"));
    }
    if (
      paso.pagina === "home" &&
      !paso.mobileAbrirAccesos &&
      typeof esPlataformaMobile === "function" &&
      esPlataformaMobile()
    ) {
      window.dispatchEvent(new CustomEvent("induccion-cerrar-accesos"));
    }

    if (paso.demoComentarios) {
      window.dispatchEvent(new CustomEvent("induccion-demo-comentarios", { detail: { activo: true } }));
    } else {
      window.dispatchEvent(new CustomEvent("induccion-demo-comentarios", { detail: { activo: false } }));
    }

    if (!paso.pagina) {
      if (typeof programarRecalculoInduccion === "function") {
        programarRecalculoInduccion();
      }
      return;
    }

    if (paso.pagina === "dashboard") {
      navegarA("dashboard", limpiarFiltrosDashboardInduccion);
    } else if (paginaActiva !== paso.pagina) {
      navegarA(paso.pagina);
    }

    if (typeof programarRecalculoInduccion === "function") {
      programarRecalculoInduccion();
    }
  }, [limpiarFiltrosDashboardInduccion, paginaActiva]);

  const finalizarInduccion = useCallback(() => {
    setInduccionActiva(false);
    setInduccionBienvenidaVisible(false);
    setInduccionPaso(0);
    induccionReplayRef.current = false;
    window.dispatchEvent(new CustomEvent("induccion-demo-comentarios", { detail: { activo: false } }));
    if (usuario && typeof marcarInduccionCompletada === "function") {
      marcarInduccionCompletada(usuario);
    }
    setPaginaActiva("home");
    limpiarFiltrosDashboardInduccion();
  }, [usuario, limpiarFiltrosDashboardInduccion]);

  const iniciarInduccion = useCallback((reiniciarPrefs = false) => {
    if (!usuario || isConfigOnlyAdmin) return;
    if (reiniciarPrefs && typeof reiniciarInduccionUsuario === "function") {
      reiniciarInduccionUsuario(usuario);
    }
    induccionReplayRef.current = reiniciarPrefs;
    setInduccionPendiente(false);
    setInduccionPaso(0);
    setInduccionActiva(false);
    setInduccionBienvenidaVisible(true);
    setPaginaActiva("home");
    limpiarFiltrosDashboardInduccion();
    setSyncDetalleVisible(false);
  }, [usuario, isConfigOnlyAdmin, limpiarFiltrosDashboardInduccion]);

  const comenzarRecorridoInduccion = useCallback(() => {
    if (usuario && typeof marcarInduccionCompletada === "function") {
      marcarInduccionCompletada(usuario);
    }
    setInduccionBienvenidaVisible(false);
    setInduccionPaso(0);
    setInduccionActiva(true);
  }, [usuario]);

  const irAPasoInduccion = useCallback((index) => {
    setInduccionPaso(index);
  }, []);

  const avanzarInduccion = useCallback(() => {
    if (induccionPaso + 1 >= pasosInduccionFiltrados.length) {
      finalizarInduccion();
      return;
    }
    irAPasoInduccion(induccionPaso + 1);
  }, [induccionPaso, pasosInduccionFiltrados.length, finalizarInduccion, irAPasoInduccion]);

  const retrocederInduccion = useCallback(() => {
    if (induccionPaso <= 0) return;
    irAPasoInduccion(induccionPaso - 1);
  }, [induccionPaso, irAPasoInduccion]);

  const saltarInduccion = useCallback(() => {
    finalizarInduccion();
  }, [finalizarInduccion]);

  useEffect(() => {
    if (!usuario || isConfigOnlyAdmin || !prefsReady) {
      setInduccionPendiente(false);
      return;
    }
    const prefs = loadUserDataLocal(usuario);
    const debeVer = typeof usuarioDebeVerInduccion === "function" && usuarioDebeVerInduccion(prefs);
    setInduccionPendiente(debeVer);
  }, [usuario, prefsReady, isConfigOnlyAdmin]);

  useEffect(() => {
    if (!usuario || isConfigOnlyAdmin || !prefsReady || !induccionPendiente || induccionActiva || induccionBienvenidaVisible) return;
    const timer = setTimeout(() => {
      setInduccionPendiente(false);
      iniciarInduccion(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [usuario, isConfigOnlyAdmin, prefsReady, induccionPendiente, induccionActiva, induccionBienvenidaVisible, iniciarInduccion]);

  useEffect(() => {
    if (!induccionBienvenidaVisible && !induccionActiva) return undefined;
    document.body.classList.add("induccion-bloqueada");
    return () => document.body.classList.remove("induccion-bloqueada");
  }, [induccionBienvenidaVisible, induccionActiva]);

  useEffect(() => {
    if (!induccionActiva) return;
    const paso = pasosInduccionFiltrados[induccionPaso];
    if (!paso) return;
    aplicarEntradaPasoInduccion(paso);
  }, [induccionActiva, induccionPaso, pasosInduccionFiltrados, aplicarEntradaPasoInduccion]);

  const handleAddWidget = async (nuevoWidget) => {
    if (!isConfigOnlyAdmin) {
      showToast("Solo el administrador puede gestionar enlaces", "error");
      return;
    }
    setWidgets([...widgets, nuevoWidget]);
    showToast("Registrando enlace...", "info");

    const effectiveUrl = getConfiguredApiUrl();
    if (!isApiConfigured() || apiError) {
      showToast("Enlace de área añadido localmente", "success");
      return;
    }

    setSyncing(true);
    try {
      await fetchRobinApi(effectiveUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: JSON.stringify({
          marca: "Config_Marcas",
          idTarea: nuevoWidget.id,
          info: nuevoWidget.titulo,
          detalles: nuevoWidget.link,
          categoria: empaquetarWidgetCategoria(nuevoWidget.seccion, nuevoWidget.icon),
          personas: nuevoWidget.color,
          widgetMarca: nuevoWidget.marca || "",
          campo: "todo"
        })
      });
      showToast("Sincronizado", "success");
      fetchData(true);
    } catch (e) {
      showToast("Error al guardar enlace", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteWidget = async (id, titulo) => {
    if (!isConfigOnlyAdmin) {
      showToast("Solo el administrador puede gestionar enlaces", "error");
      return;
    }
    setWidgets(prev => prev.filter(w => w.id !== id));
    showToast("Eliminando enlace...", "info");

    const effectiveUrl = getConfiguredApiUrl();
    if (!isApiConfigured() || apiError) {
      showToast("Enlace eliminado", "info");
      return;
    }

    setSyncing(true);
    try {
      await fetchRobinApi(effectiveUrl, {
        method: "POST", mode: "cors", redirect: "follow",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: JSON.stringify({
          marca: "Config_Marcas", idTarea: id, info: titulo, campo: "eliminar"
        })
      });
      showToast("Eliminado", "success");
      fetchData(true);
    } catch (e) {
      showToast("Error al eliminar enlace", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleEditWidget = async (widgetActualizado) => {
    if (!isConfigOnlyAdmin) {
      showToast("Solo el administrador puede gestionar enlaces", "error");
      return;
    }
    setWidgets(prev => prev.map(w => w.id === widgetActualizado.id ? widgetActualizado : w));
    showToast("Actualizando enlace...", "info");

    const effectiveUrl = getConfiguredApiUrl();
    if (!isApiConfigured() || apiError) {
      showToast("Enlace actualizado localmente", "success");
      return;
    }

    setSyncing(true);
    try {
      await fetchRobinApi(effectiveUrl, {
        method: "POST", mode: "cors", redirect: "follow",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: JSON.stringify({
          marca: "Config_Marcas",
          idTarea: widgetActualizado.id,
          info: widgetActualizado.titulo,
          detalles: widgetActualizado.link,
          categoria: empaquetarWidgetCategoria(widgetActualizado.seccion, widgetActualizado.icon),
          personas: widgetActualizado.color,
          widgetMarca: widgetActualizado.marca || "",
          campo: "todo"
        })
      });
      showToast("Enlace actualizado", "success");
      fetchData(true);
    } catch (e) {
      showToast("Error al actualizar enlace", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleSavePerfil = async (e) => {
    e.preventDefault();
    if (!usuario) return;

    const resultado = await guardarPerfilUsuario(usuario, {
      perfilNombre,
      perfilApellido,
      perfilCorreo,
      perfilAvatar
    });

    setNombreCompleto(resultado.nombreCompleto || construirNombreCompletoPerfil(perfilNombre, perfilApellido));

    if (!resultado.ok || resultado.remoto === false) {
      showToast("Perfil guardado aquí, pero no se pudo sincronizar con la nube", "error");
      return;
    }

    showToast("Perfil guardado y sincronizado", "success");
  };

  const toggleSeleccionTarea = (tarea) => {
    const key = getTaskSelectionKey(tarea);
    const legacy = getTaskSelectionKeyLegacy(tarea);
    setTareasSeleccionadas(prev => {
      const next = new Set(prev);
      const activa = next.has(key) || (legacy !== key && next.has(legacy));
      if (activa) {
        next.delete(key);
        next.delete(legacy);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const limpiarSeleccionTareas = () => {
    setTareasSeleccionadas(new Set());
    setBulkDeadline("");
  };

  const cambiarListaAgrupacion = (modo) => {
    setListaAgrupacion(modo);
    setUserPreference("listaAgrupacion", modo);
  };

  const alternarKanbanOrdenPrioridad = () => {
    const siguiente = kanbanOrdenPrioridad === "desc" ? "asc" : "desc";
    setKanbanOrdenPrioridad(siguiente);
    setUserPreference("kanbanOrdenPrioridad", siguiente);
  };

  const kanbanOrdenPrioridadActivo = vistaModo === "KANBAN" && filtroTiempo === "HOY" ? kanbanOrdenPrioridad : null;

  const handleBulkUpdate = async (campo, nuevoValor) => {
    if (isDesigner) return;
    if (!nuevoValor && campo !== "deadline") return;
    const keys = tareasSeleccionadas;
    const objetivos = resolverTareasSeleccionadas(tareas, keys);
    if (!objetivos.length) {
      showToast("No se encontraron las tareas seleccionadas", "error");
      return;
    }

    const hoy = new Date();
    const timestamp = `${hoy.getDate()}/${hoy.getMonth() + 1} ${hoy.getHours()}:${String(hoy.getMinutes()).padStart(2, '0')}`;
    const valorFinal = normalizarValorCampoTarea(campo, nuevoValor);
    const keysObjetivo = new Set();
    objetivos.forEach((t) => {
      keysObjetivo.add(getTaskSelectionKey(t));
      keysObjetivo.add(getTaskSelectionKeyLegacy(t));
    });

    const esObjetivo = (t) => {
      const key = getTaskSelectionKey(t);
      const legacy = getTaskSelectionKeyLegacy(t);
      return keysObjetivo.has(key) || keysObjetivo.has(legacy);
    };

    const actualizadas = tareas.map(t => {
      if (!esObjetivo(t)) return t;
      let detalles = t.detalles || "";
      if (campo === "estado") {
        detalles += `\n• [${timestamp}] Estado cambiado a "${nuevoValor}" por @${usuario}`;
      }
      const actualizada = marcarTareaPendiente({
        ...t,
        idTarea: t.idTarea || generateBrandId(t.marca),
        [campo]: valorFinal,
        detalles: campo === "estado" ? detalles : t.detalles
      });
      const conFechas = campo === "deadline" || campo === "fechaInicio"
        ? registrarEdicionFechasLocales(actualizada, { [campo]: valorFinal })
        : actualizada;

      const taskKeyOriginal = getTaskSelectionKey(t);
      encolarSync({
        type: "update",
        taskKey: getTaskSelectionKey(conFechas),
        taskKeyOriginal,
        payload: construirPayloadSyncTarea(t, conFechas, {
          campoSync: (campo === "estado" || campo === "deadline" || campo === "prioridad" || campo === "fechaInicio") ? campo : "todo",
          valor: valorFinal
        })
      });

      return conFechas;
    });

    if (campo === "estado") {
      objetivos.forEach((t) => {
        if (normalizarEstado(t.estado) !== normalizarEstado(valorFinal)) {
          const actualizada = actualizadas.find((a) => getTaskSelectionKey(a) === getTaskSelectionKey(t));
          if (actualizada) {
            notificarCambioEstadoTarea(actualizada, usuario, t.estado, valorFinal)
              .then(() => refrescarNotificaciones());
          }
        }
      });
    }

    persistTareas(actualizadas);
    setHayPendientesLocales(true);
    limpiarSeleccionTareas();
    showToast(`${objetivos.length} entregable(s) guardado(s)`, "success");
    sincronizarEnSegundoPlano();
  };

  const handleSaveBrandMetadata = async (brand, newMeta) => {
    if (!canEditFichas) {
      showToast("Solo el usuario admin puede editar fichas de cliente", "error");
      return;
    }
    const normalizada = normalizarMetadataMarcaEntry(newMeta);
    const actualizados = { ...marcasMetadata, [formatearMarca(brand)]: normalizada };
    setMarcasMetadata(actualizados);
    setListaPersonas((prev) => registrarPersonasEnLista(prev, extraerNombresDesdeMetadataMarca(normalizada)));
    showToast("Actualizando ficha de cliente...", "info");

    const effectiveUrl = getConfiguredApiUrl();
    if (!isApiConfigured() || apiError) {
      showToast("Ficha guardada localmente", "success");
      return;
    }

    const payloadApi = serializarMetadataParaApi(newMeta);
    setSyncing(true);
    try {
      await fetchRobinApi(effectiveUrl, {
        method: "POST", mode: "cors", redirect: "follow",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: JSON.stringify({
          campo: "crearMarca",
          nuevaMarca: formatearMarca(brand),
          ...payloadApi
        })
      });
      showToast("Ficha guardada en Google Sheets", "success");
    } catch (e) {
      showToast("Guardado local (Falla de red)", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteBrand = async (brand) => {
    if (!canEditFichas) {
      showToast("Solo el usuario admin puede eliminar clientes", "error");
      return false;
    }

    const nombreMarca = formatearMarca(brand);
    const tareasMarca = tareas.filter(t => marcasCoinciden(t.marca, nombreMarca)).length;
    const otrasMarcas = marcasDisponibles.filter(m => !marcasCoinciden(m, nombreMarca));

    setMarcasMetadata(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (marcasCoinciden(k, nombreMarca)) delete next[k];
      });
      return next;
    });
    setTareas(prev => prev.filter(t => !marcasCoinciden(t.marca, nombreMarca)));
    if (filtroMarca !== "TODAS" && marcasCoinciden(filtroMarca, nombreMarca)) {
      setFiltroMarca("TODAS");
    }
    if (nuevaTarea.marca && marcasCoinciden(nuevaTarea.marca, nombreMarca)) {
      setNuevaTarea(prev => ({ ...prev, marca: otrasMarcas[0] || prev.marca }));
    }

    showToast(
      tareasMarca > 0
        ? `Eliminando cliente y ${tareasMarca} entregable(s)...`
        : "Eliminando cliente...",
      "info"
    );

    const effectiveUrl = getConfiguredApiUrl();
    if (!isApiConfigured() || apiError) {
      showToast("Cliente eliminado localmente", "success");
      setClientesReset(n => n + 1);
      return true;
    }

    setSyncing(true);
    try {
      const res = await fetchRobinApi(effectiveUrl, {
        method: "POST", mode: "cors", redirect: "follow",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: JSON.stringify({
          campo: "eliminarMarca",
          nuevaMarca: nombreMarca
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast("Cliente eliminado de Google Sheets", "success");
        await fetchData(true);
        setClientesReset(n => n + 1);
        return true;
      }
      showToast(json.error || "Error al eliminar cliente en Sheets", "error");
      await fetchData(true);
      return false;
    } catch (e) {
      showToast("Falla de conexión al eliminar cliente", "error");
      await fetchData(true);
      return false;
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateBrand = async (brandPayload) => {
    if (!canEditFichas) {
      showToast("Solo el usuario admin puede crear clientes", "error");
      return;
    }
    showToast("Insertando nueva hoja en Sheets...", "info");
    const nombreMarca = formatearMarca(brandPayload.nuevaMarca);
    const metaInicial = normalizarMetadataMarcaEntry(brandPayload);
    const effectiveUrl = getConfiguredApiUrl();
    if (!isApiConfigured() || apiError) {
      setMarcasMetadata({
        ...marcasMetadata,
        [nombreMarca]: metaInicial
      });
      showToast("Cliente creado localmente", "success");
      return;
    }

    const payloadApi = serializarMetadataParaApi(metaInicial);
    setSyncing(true);
    try {
      const res = await fetchRobinApi(effectiveUrl, {
        method: "POST", mode: "cors", redirect: "follow",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: JSON.stringify({
          campo: "crearMarca",
          nuevaMarca: nombreMarca,
          ...payloadApi
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast("Nueva pestaña creada en Sheets", "success");
        await fetchData(true);
      }
    } catch (e) {
      showToast("Falla de red al crear marca", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    applyRobinDocumentTheme(newTheme);
    try {
      setLocalStorageItemSafe("robin_theme", newTheme);
    } catch (e) { /* ignore */ }
    showToast(`Tema cambiado`, "success");
  };

  useLayoutEffect(() => {
    applyRobinDocumentTheme(theme);
  }, [theme]);

  const handlePwaIconVariantChange = (newVariant) => {
    setPwaIconVariant(newVariant);
    if (typeof applyPwaIconVariant === "function") applyPwaIconVariant(newVariant);
    showToast("Icono del teléfono actualizado", "success");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const userClean = e.target.username.value.trim().toLowerCase();
    const validation = validateLocalLogin(userClean, claveInput, listaEjecutivos);
    if (!validation.ok) {
      setLoginError(validation.error);
      return;
    }
    setRobinApiSession(validation.username, claveInput);
    repararColaSyncMarcas();
    repararColaSyncActualizacionesFantasma();
    setUsuario(validation.username);
    setLoginError("");
    setClaveInput("");
    await aplicarPreferenciasUsuario(validation.username);
    showToast(`Sesión iniciada: @${validation.username}${isRobinDesigner(validation.username) ? " (Diseño)" : ""}`, "success");
  };

  const handleLogout = async () => {
    if (usuario) {
      saveUserDataLocal(usuario, {
        nombreCompleto,
        theme,
        pwaIconVariant,
        paginaActiva,
        vistaModo,
        filtroTiempo,
        filtroMarca,
        filtroEstado,
        filtroPrioridad,
        filtroPersona,
        searchQuery,
        dashboardMobileVista
      });
      await flushRemoteUserSettings(usuario);
    }
    try {
      clearRobinApiSession();
    } catch (e) {
      console.error("Error al cerrar sesión:", e);
    }
    setUsuario(null);
    setClaveInput("");
    setPaginaActiva("home");
    showToast("Sesión cerrada", "info");
  };

  const esErrorBackendUsuariosDesactualizado = (mensaje) => {
    const txt = String(mensaje || "").toLowerCase();
    return txt.includes("marca es requerida") || txt.includes("hoja de destino");
  };

  const actualizarUsuariosRemotos = async ({ usuario, rol, accion }) => {
    const effectiveUrl = getConfiguredApiUrl();
    if (!isApiConfigured() || apiError) return { ok: false, skipped: true };

    try {
      const res = await fetchRobinApi(effectiveUrl, {
        method: "POST",
        mode: "cors",
        redirect: "follow",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: JSON.stringify({
          campo: "actualizarUsuarios",
          usuario,
          rol,
          accion
        })
      });

      const rawText = await res.text();
      let json;
      try {
        json = JSON.parse(rawText);
      } catch (parseErr) {
        throw new Error("Respuesta inválida del servidor al actualizar usuarios.");
      }

      if (!json || json.success !== true) {
        throw new Error(json?.error || "No se pudo actualizar usuarios en el backend");
      }
      return { ok: true };
    } catch (err) {
      const mensaje = err?.message || String(err || "");
      if (esErrorBackendUsuariosDesactualizado(mensaje)) {
        return { ok: false, backendDesactualizado: true };
      }
      throw err;
    }
  };

  const sincronizarUsuarioAdmin = async ({ usuario, rol, accion, onExitoLocal }) => {
    try {
      const remoto = await actualizarUsuariosRemotos({ usuario, rol, accion });
      onExitoLocal();
      if (remoto.backendDesactualizado) {
        showToast(
          "Usuario guardado aquí. Falta actualizar Google Apps Script (ver instrucciones abajo).",
          "info"
        );
        return;
      }
      if (remoto.skipped) {
        showToast("Usuario guardado en este dispositivo (sin conexión al backend).", "info");
        return;
      }
      showToast(accion === "remove" ? "Usuario actualizado" : "Usuario autorizado", "success");
    } catch (err) {
      showToast(err?.message || "Error al actualizar backend", "error");
    }
  };

  const persistirListasUsuariosLocal = ({ ejecutivos, contenido, disenadores }) => {
    setListaEjecutivos(ejecutivos);
    setListaContenido(contenido);
    setListaDisenadores(disenadores);
    setLocalStorageItemSafe("robin_lista_ejecutivos", JSON.stringify(ejecutivos));
    setLocalStorageItemSafe("robin_lista_contenido", JSON.stringify(contenido));
    setLocalStorageItemSafe("robin_lista_disenadores", JSON.stringify(disenadores));
  };

  const handleAddExecutive = async (e) => {
    e.preventDefault();
    const nuevo = nuevoEjecutivoInput.trim().toLowerCase();
    if (!nuevo) return;
    if (nuevo === "admin") {
      showToast("admin ya tiene acceso de configuración", "info");
      setNuevoEjecutivoInput("");
      return;
    }
    if (listaEjecutivos.includes(nuevo)) {
      showToast("El ejecutivo ya está registrado", "error");
      return;
    }

    const nextEjecutivos = Array.from(new Set([...listaEjecutivos, nuevo]));
    const nextContenido = listaContenido.filter((u) => u !== nuevo);
    const nextDisenadores = listaDisenadores.filter((u) => u !== nuevo);

    await sincronizarUsuarioAdmin({
      usuario: nuevo,
      rol: "ejecutivo",
      accion: "add",
      onExitoLocal: () => {
        persistirListasUsuariosLocal({
          ejecutivos: nextEjecutivos,
          contenido: nextContenido,
          disenadores: nextDisenadores
        });
        registrarNuevaPersonaGlobal("@" + nuevo);
        setNuevoEjecutivoInput("");
      }
    });
  };

  const handleRemoveExecutive = async (usernameToRemove) => {
    const user = normalizeRobinUsername(usernameToRemove);
    if (!user || user === "admin") return;
    if (!listaEjecutivos.includes(user)) return;

    const nextEjecutivos = listaEjecutivos.filter((u) => u !== user);
    const nextContenido = listaContenido.filter(Boolean);
    const nextDisenadores = listaDisenadores.filter(Boolean);

    await sincronizarUsuarioAdmin({
      usuario: user,
      rol: "ejecutivo",
      accion: "remove",
      onExitoLocal: () => {
        persistirListasUsuariosLocal({
          ejecutivos: nextEjecutivos,
          contenido: nextContenido,
          disenadores: nextDisenadores
        });
      }
    });
  };

  const handleAddContenido = async (e) => {
    e.preventDefault();
    const nuevo = nuevoContenidoInput.trim().toLowerCase();
    if (!nuevo) return;
    if (nuevo === "admin") {
      showToast("admin no puede ser de contenido", "error");
      setNuevoContenidoInput("");
      return;
    }
    if (listaContenido.includes(nuevo)) {
      showToast("Ya está en contenido", "error");
      return;
    }

    const nextContenido = Array.from(new Set([...listaContenido, nuevo]));
    const nextEjecutivos = listaEjecutivos.filter((u) => u !== nuevo);
    const nextDisenadores = listaDisenadores.filter((u) => u !== nuevo);

    await sincronizarUsuarioAdmin({
      usuario: nuevo,
      rol: "contenido",
      accion: "add",
      onExitoLocal: () => {
        persistirListasUsuariosLocal({
          ejecutivos: nextEjecutivos,
          contenido: nextContenido,
          disenadores: nextDisenadores
        });
        registrarNuevaPersonaGlobal("@" + nuevo);
        setNuevoContenidoInput("");
      }
    });
  };

  const handleRemoveContenido = async (usernameToRemove) => {
    const user = normalizeRobinUsername(usernameToRemove);
    if (!user || user === "admin") return;
    if (!listaContenido.includes(user)) return;

    const nextContenido = listaContenido.filter((u) => u !== user);
    const nextEjecutivos = listaEjecutivos.filter(Boolean);
    const nextDisenadores = listaDisenadores.filter(Boolean);

    await sincronizarUsuarioAdmin({
      usuario: user,
      rol: "contenido",
      accion: "remove",
      onExitoLocal: () => {
        persistirListasUsuariosLocal({
          ejecutivos: nextEjecutivos,
          contenido: nextContenido,
          disenadores: nextDisenadores
        });
      }
    });
  };

  const handleAddDesigner = async (e) => {
    e.preventDefault();
    const nuevo = nuevoDisenadorInput.trim().toLowerCase();
    if (!nuevo) return;
    if (nuevo === "admin") {
      showToast("admin no puede ser diseñador", "error");
      setNuevoDisenadorInput("");
      return;
    }
    if (listaDisenadores.includes(nuevo)) {
      showToast("El diseñador ya está registrado", "error");
      return;
    }

    const nextDisenadores = Array.from(new Set([...listaDisenadores, nuevo]));
    const nextEjecutivos = listaEjecutivos.filter((u) => u !== nuevo);
    const nextContenido = listaContenido.filter((u) => u !== nuevo);

    await sincronizarUsuarioAdmin({
      usuario: nuevo,
      rol: "disenador",
      accion: "add",
      onExitoLocal: () => {
        persistirListasUsuariosLocal({
          ejecutivos: nextEjecutivos,
          contenido: nextContenido,
          disenadores: nextDisenadores
        });
        registrarNuevaPersonaGlobal("@" + nuevo);
        setNuevoDisenadorInput("");
      }
    });
  };

  const handleRemoveDesigner = async (usernameToRemove) => {
    const user = normalizeRobinUsername(usernameToRemove);
    if (!user || user === "admin") return;
    if (!listaDisenadores.includes(user)) return;

    const nextDisenadores = listaDisenadores.filter((u) => u !== user);
    const nextEjecutivos = listaEjecutivos.filter(Boolean);
    const nextContenido = listaContenido.filter(Boolean);

    await sincronizarUsuarioAdmin({
      usuario: user,
      rol: "disenador",
      accion: "remove",
      onExitoLocal: () => {
        persistirListasUsuariosLocal({
          ejecutivos: nextEjecutivos,
          contenido: nextContenido,
          disenadores: nextDisenadores
        });
      }
    });
  };

  const registrarNuevaPersonaGlobal = (nombreCompleto) => {
    const entrada = obtenerEntradaListaPermitida(nombreCompleto);
    if (!entrada) return;
    setListaPersonas((prev) => registrarPersonasEnLista(prev, [entrada]));
  };

  const registrarNuevaCategoriaGlobal = (nombre) => {
    if (!esNombreCategoriaNuevaValido(nombre)) return;
    const normalizado = resolverCategoriaCanonica(nombre) || normalizarNombreCategoria(nombre);
    if (!normalizado) return;
    const color = asignarColorCategoria(normalizado, listaCategorias);
    setListaCategorias((prev) => registrarCategoriasEnLista(prev, [{ nombre: normalizado, color }]));
    insertarCategoriaRemota(normalizado, color);
  };

  const registrarNuevoSubclienteGlobal = (marca, nombre) => {
    if (!esNombreSubclienteNuevoValido(nombre)) return;
    const marcaNorm = normalizarMarca(marca);
    const nombreNorm = normalizarNombreSubcliente(nombre);
    if (!marcaNorm || !nombreNorm) return;
    setListaSubclientes((prev) => registrarSubclientesEnLista(prev, [{ marca: marcaNorm, nombre: nombreNorm }]));
    insertarSubclienteRemoto(marcaNorm, nombreNorm);
  };

  useEffect(() => {
    if (!usuario) return;
    let cancelled = false;

    cargarCategoriasRemotas().then((remotas) => {
      if (cancelled || !remotas || !remotas.length) return;
      setListaCategorias(guardarListaCategorias(remotas));
    });

    cargarSubclientesRemotos().then((remotas) => {
      if (cancelled || !remotas || !remotas.length) return;
      setListaSubclientes(guardarListaSubclientes(remotas));
    });

    return () => { cancelled = true; };
  }, [usuario]);

  useEffect(() => {
    if (!usuario) return;
    let cancelled = false;

    cargarRelacionesRemotas().then((remotas) => {
      if (cancelled || !remotas || !remotas.length) return;
      const fusionadas = fusionarRelaciones(cargarRelacionesLocales(), remotas);
      guardarRelacionesLocales(fusionadas);
      setRelacionesTareas(fusionadas);
    });

    return () => { cancelled = true; };
  }, [usuario]);

  const handleRelacionCreada = (fila) => {
    setRelacionesTareas((prev) => agregarRelacionALista(prev, fila));
  };

  const fetchData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    if (!isBackground) setSyncing(true);
    if (isBackground) setApiError(null);

    const effectiveUrl = getConfiguredApiUrl();
    if (!isApiConfigured()) {
      const backup = cargarTareasLocales();
      if (backup.length) {
        setTareas((prev) => (prev.length ? prev : backup));
      }
      if (!isBackground) showToast("Base de datos no configurada — datos locales", "info");
      if (!isBackground) setLoading(false);
      if (!isBackground) setSyncing(false);
      return;
    }

    if (!hasRobinApiSession()) {
      if (!isBackground) {
        setLoading(false);
        setSyncing(false);
      }
      return;
    }

    const maxIntentos = isBackground ? 1 : 3;
    let ultimoError = null;

    for (let intento = 1; intento <= maxIntentos; intento++) {
      try {
        const res = await fetchRobinApi(effectiveUrl, { method: "GET", mode: "cors", redirect: "follow", cache: "no-store" });
        const rawText = await res.text();
        let json;
        try {
          json = JSON.parse(rawText);
        } catch (parseErr) {
          throw new Error(
            rawText && rawText.indexOf("Sign in") >= 0
              ? "El Web App del Sheet exige login de Google en cada petición. Cambia el despliegue a «Cualquiera» (la seguridad la da el token ROBIN)."
              : "Respuesta inválida del servidor Sheets."
          );
        }

        if (json.success && json.data) {
          const widgetsLimpios = filtrarWidgetsReales(json.widgets || []).map(normalizarWidgetDesdeApi).filter(Boolean);
          setWidgets(widgetsLimpios);

          // Seed de roles desde backend (PropertiesService).
          if (json.auth) {
            const execs = Array.isArray(json.auth.executives) ? json.auth.executives : null;
            const contentAuth = Array.isArray(json.auth.content) ? json.auth.content : null;
            const dis = Array.isArray(json.auth.designers) ? json.auth.designers : null;
            const setContentDefault = new Set(getDefaultContentUsers().map(normalizeRobinUsername));

            if (execs) {
              const normalizados = execs.map(normalizeRobinUsername).filter(Boolean);
              const locales = leerListaLocalContenido().map(normalizeRobinUsername).filter(Boolean);
              const contentAuthNorm = Array.isArray(contentAuth)
                ? contentAuth.map(normalizeRobinUsername).filter(Boolean)
                : [];
              // Si el backend aún no trae `content`, sacamos a Daniela/Sofía/Douglas de ejecutivos.
              const contenidoFusion = Array.from(new Set(
                contentAuthNorm.length
                  ? contentAuthNorm
                  : [
                    ...setContentDefault,
                    ...locales,
                    ...normalizados.filter((u) => setContentDefault.has(u) || locales.includes(u))
                  ]
              )).filter((u) => u && u !== "admin");
              const setContent = new Set(contenidoFusion);
              const ejecutivos = normalizados.filter((u) => u === "admin" || !setContent.has(u));

              setListaEjecutivos(ejecutivos);
              setListaContenido(contenidoFusion);
              setLocalStorageItemSafe("robin_lista_ejecutivos", JSON.stringify(ejecutivos));
              setLocalStorageItemSafe("robin_lista_contenido", JSON.stringify(contenidoFusion));
            }
            if (dis) {
              const normalizados = dis.map(normalizeRobinUsername).filter(Boolean);
              setListaDisenadores(normalizados);
              setLocalStorageItemSafe("robin_lista_disenadores", JSON.stringify(normalizados));
            }
          }

          setUsuariosConectados(obtenerUsuariosEnLinea(json.data, json.widgets, json.presencia));
          setPresenceEstado("ready");

          if (usuario) {
            const nombreRemoto = obtenerNombrePerfilDesdePresencia(json.data, usuario);
            if (nombreRemoto) {
              setNombreCompleto(prev => (prev.trim() ? prev : nombreRemoto));
            }
          }

          const remotas = normalizarTareasDesdeApi(json.data);
          reconciliarTareasLocalesConRemotas(remotas);
          repararColaSyncActualizacionesFantasma();
          setTareas((prevTareas) => {
            const base = combinarLocalesParaFusion(prevTareas, cargarTareasLocales());
            const fusionadas = limpiarListaFlagsSyncObsoletos(
              fusionarTareasRemotasYLocales(remotas, base),
              remotas
            );
            guardarTareasLocales(fusionadas);
            return fusionadas;
          });
          const fusionadas = cargarTareasLocales();
          const colaVacia = cargarColaSync().length === 0;
          setHayPendientesLocales(calcularHayPendientesLocales());
          if (colaVacia && !hayTareasPendientesLocales(fusionadas)) {
            setApiError(null);
            setApiErrorDetail("");
          }

          if (json.marcasMetadata) {
            const normalizado = {};
            Object.keys(json.marcasMetadata).forEach(k => {
              normalizado[formatearMarca(k)] = normalizarMetadataMarcaEntry(json.marcasMetadata[k]);
            });
            setMarcasMetadata(normalizado);
            setListaPersonas((prev) => sincronizarListaPersonasConMarcas(prev, normalizado));
          }
          if (!isBackground) showToast("Sincronizado", "success");
          setApiError(null);
          setApiErrorDetail("");
          setUltimaSyncOk(new Date().toISOString());
          registrarDiagnosticoRobin(
            "sheets",
            "Sincronización correcta",
            `Remotas: ${remotas.length} · Fusionadas: ${fusionadas.length} · Cola: ${cargarColaSync().length}`
          );
          if (!isBackground) setLoading(false);
          if (!isBackground) setSyncing(false);
          return;
        }

        throw new Error(json.error || "Formato de datos erróneo");
      } catch (e) {
        ultimoError = e;
        console.warn(`Sheets sync intento ${intento}/${maxIntentos}`, e);
        if (intento < maxIntentos) {
          await new Promise(resolve => setTimeout(resolve, intento * 1000));
        }
      }
    }

    console.error("Sheets sync error", ultimoError);
    const detalleError = ultimoError?.message || String(ultimoError || "Error desconocido");
    registrarDiagnosticoRobin("sheets", "Error de sincronización", detalleError);

    if (isBackground) {
      setApiError((prev) => prev || "Sin conexión con Google Sheets");
      setApiErrorDetail((prev) => prev || detalleError);
    } else {
      const backup = cargarTareasLocales();
      if (backup.length) {
        setTareas((prev) => (prev.length ? prev : backup));
        setApiError("Sin conexión — mostrando datos guardados");
        setApiErrorDetail(detalleError);
        showToast("Sin conexión. Se muestran los datos guardados en este dispositivo.", "info");
      } else {
        setApiError("Error de conexión con Google Sheets");
        setApiErrorDetail(detalleError);
        showToast(detalleError, "error");
      }
      setLoading(false);
      setSyncing(false);
    }
  };

  const sincronizarEnSegundoPlano = () => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      if (syncMutexRef.current || !isApiConfigured() || !hasRobinApiSession()) return;
      syncMutexRef.current = true;
      try {
        const resultado = await procesarColaSync();
        reconciliarTareasLocalesConRemotas([]);
        setHayPendientesLocales(calcularHayPendientesLocales());
        if (resultado.sessionMissing) return;
        if (resultado.errores && resultado.errores.length > 0) {
          const detalle = resultado.errores.map((e) => e.error || e.type).join(" · ");
          registrarDiagnosticoRobin("sheets_cola", "No se pudo guardar en Google Sheets", detalle);
          setApiError((prev) => prev || "Cambios pendientes en Google Sheets");
          setApiErrorDetail((prev) => prev || detalle);
          showToast("No se pudo guardar en Google Sheets. Se reintentará automáticamente.", "error");
        } else {
          if (resultado.processed > 0) {
            showToast("Cambios guardados en Google Sheets", "success");
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
          setApiError(null);
          setApiErrorDetail("");
        }
        await fetchData(true);
      } catch (e) {
        console.warn("ROBIN: sync en segundo plano", e);
        registrarDiagnosticoRobin("sheets", "Error de sincronización en segundo plano", e?.message || String(e));
      } finally {
        syncMutexRef.current = false;
        setHayPendientesLocales(calcularHayPendientesLocales());
      }
    }, 350);
  };

  const handleUpdateField = async (tarea, campo, nuevoValor) => {
    if (isDesigner) return;
    if (!nuevoValor && nuevoValor !== "") return;

    const original = resolverTareaActual(tareas, tarea);
    if (!original) return;

    const index = encontrarIndiceTarea(tareas, original);
    if (index === -1) return;

    const taskTargetId = original.idTarea || generateBrandId(original.marca);
    const taskKeyOriginal = getTaskSelectionKey(original);

    let detallesConHistorial = original.detalles || "";
    if (campo === "estado") {
      const hoy = new Date();
      const timestamp = `${hoy.getDate()}/${hoy.getMonth() + 1} ${hoy.getHours()}:${String(hoy.getMinutes()).padStart(2, '0')}`;
      const registro = `\n• [${timestamp}] Estado cambiado a "${nuevoValor}" por @${usuario}`;
      detallesConHistorial = detallesConHistorial + registro;
    }

    const valorFinal = normalizarValorCampoTarea(campo, nuevoValor);
    let actualizada = marcarTareaPendiente({
      ...original,
      idTarea: taskTargetId,
      [campo]: valorFinal,
      detalles: campo === "estado" ? detallesConHistorial : original.detalles
    });
    if (campo === "estado" && typeof aplicarFlujoSegunEstadoEstatus === "function") {
      actualizada = aplicarFlujoSegunEstadoEstatus(actualizada, valorFinal);
    }
    if (campo === "deadline" || campo === "fechaInicio") {
      actualizada = registrarEdicionFechasLocales(actualizada, { [campo]: valorFinal });
    }

    const temp = [...tareas];
    temp[index] = actualizada;
    persistTareas(temp);

    if (campo === "estado" && normalizarEstado(original.estado) !== normalizarEstado(valorFinal)) {
      notificarCambioEstadoTarea(actualizada, usuario, original.estado, valorFinal)
        .then(() => refrescarNotificaciones());
    }

    const campoSync = campo === "estado"
      ? "todo"
      : ((campo === "deadline" || campo === "prioridad" || campo === "fechaInicio") ? campo : "todo");
    encolarSync({
      type: "update",
      taskKey: getTaskSelectionKey(actualizada),
      taskKeyOriginal,
      payload: construirPayloadSyncTarea(original, actualizada, { campoSync, valor: valorFinal })
    });
    setHayPendientesLocales(true);
    sincronizarEnSegundoPlano();
  };

  const handleEnviarEstatusCliente = (tarea, tipo) => {
    if (isDesigner) return;
    if (typeof aplicarEnvioClienteEstatus !== "function") return;
    const original = resolverTareaActual(tareas, tarea);
    if (!original) return;
    const index = encontrarIndiceTarea(tareas, original);
    if (index === -1) return;

    const actualizada = marcarTareaPendiente(normalizarTareaCampos(
      aplicarEnvioClienteEstatus(original, tipo, usuario)
    ));
    const temp = [...tareas];
    temp[index] = actualizada;
    persistTareas(temp);

    if (normalizarEstado(original.estado) !== normalizarEstado(actualizada.estado)) {
      notificarCambioEstadoTarea(actualizada, usuario, original.estado, actualizada.estado)
        .then(() => refrescarNotificaciones());
    }

    encolarSync({
      type: "update",
      taskKey: getTaskSelectionKey(actualizada),
      taskKeyOriginal: getTaskSelectionKey(original),
      payload: construirPayloadSyncTarea(original, actualizada, { campoSync: "todo" })
    });
    setHayPendientesLocales(true);
    sincronizarEnSegundoPlano();
    showToast(tipo === "propuesta" ? "Propuesta enviada. Quedó en espera de comentarios." : "Arte final enviado. Tarea completada.", "success");
  };

  const handleConfirmComplete = async () => {
    if (!taskToComplete) return;
    const tarea = taskToComplete;
    setTaskToComplete(null);

    if (isDesigner) {
      const original = resolverTareaActual(tareas, tarea);
      if (!original) return;
      const hoy = new Date();
      const timestamp = `${hoy.getDate()}/${hoy.getMonth() + 1} ${hoy.getHours()}:${String(hoy.getMinutes()).padStart(2, "0")}`;
      let detalles = original.detalles || "";
      detalles += `\n• [${timestamp}] Estado cambiado a "Completada" por @${usuario}`;
      let actualizada = marcarTareaPendiente(normalizarTareaCampos({
        ...original,
        estado: "Completada",
        detalles
      }));
      if (typeof aplicarFlujoSegunEstadoEstatus === "function") {
        actualizada = aplicarFlujoSegunEstadoEstatus(actualizada, "Completada");
      }
      const index = encontrarIndiceTarea(tareas, original);
      if (index === -1) return;
      const copiaTareas = [...tareas];
      copiaTareas[index] = actualizada;
      persistTareas(copiaTareas);
      encolarSync({
        type: "update",
        taskKey: getTaskSelectionKey(actualizada),
        taskKeyOriginal: getTaskSelectionKey(original),
        payload: construirPayloadSyncTarea(original, actualizada, { campoSync: "todo" })
      });
      setHayPendientesLocales(true);
      notificarCambioEstadoTarea(actualizada, usuario, original.estado, "Completada")
        .then(() => refrescarNotificaciones());
      showToast("Entregable completado", "success");
      sincronizarEnSegundoPlano();
      return;
    }

    await handleUpdateField(tarea, "estado", "Completada");
  };

  const abrirEdicionTarea = (t) => {
    const actual = normalizarTareaCampos(resolverTareaActual(tareas, t));
    setActiveTask(actual);
    setIsEditing(true);
  };

  const abrirTareaPorKey = (taskKey) => {
    const buscada = String(taskKey || "").trim().toLowerCase();
    if (!buscada) return;

    const encontrada = tareas.find((t) => {
      const claves = clavesBusquedaComentariosTarea(t).map((k) => String(k).toLowerCase());
      return claves.includes(buscada);
    });

    if (encontrada) {
      abrirEdicionTarea(encontrada);
      return;
    }

    showToast("No se encontró el entregable", "error");
  };

  useEffect(() => {
    if (!usuario || !tareas.length) return;
    var leer = window.leerTaskKeyDesdeUrl || leerTaskKeyDesdeUrl;
    if (typeof leer !== "function") return;
    const taskKey = leer();
    if (!taskKey) return;
    abrirTareaPorKey(taskKey);
    var limpiar = window.limpiarTaskKeyEnUrl || limpiarTaskKeyEnUrl;
    if (typeof limpiar === "function") limpiar();
  }, [usuario, tareas]);

  const layoutTablaProps = {
    tareas: tareasFiltradas,
    onUpdateField: isDesigner ? undefined : handleUpdateField,
    onSelectTask: abrirEdicionTarea,
    onDeleteTask: isDesigner ? undefined : (t) => setTaskToDelete(t),
    onSolicitarCompletar: (t) => setTaskToComplete(t),
    getMarcaStyle,
    currentTheme,
    modoAgrupacion: listaAgrupacion,
    tareasSeleccionadas: isDesigner ? new Set() : tareasSeleccionadas,
    onToggleSeleccion: isDesigner ? undefined : toggleSeleccionTarea,
    onToggleSeleccionGrupo: isDesigner ? undefined : (lista, seleccionar) => {
      setTareasSeleccionadas(prev => {
        const next = new Set(prev);
        lista.forEach(t => {
          const key = getTaskSelectionKey(t);
          if (seleccionar) next.add(key);
          else next.delete(key);
        });
        return next;
      });
    },
    listaCategorias
  };

  const tareasSeleccionadasLista = useMemo(
    () => resolverTareasSeleccionadas(tareas, tareasSeleccionadas),
    [tareas, tareasSeleccionadas]
  );

  const handleSaveTaskModal = async (editedTask) => {
    if (guardandoRef.current) return;
    guardandoRef.current = true;

    try {
      const original = resolverTareaActual(tareas, editedTask);
      const index = encontrarIndiceTarea(tareas, original);
      if (index === -1) {
        showToast("No se encontró el entregable para guardar", "error");
        return;
      }

      if (isDesigner) {
        const estadoCambio = normalizarEstado(original.estado) !== normalizarEstado(editedTask.estado);
        const hoy = new Date();
        const timestamp = `${hoy.getDate()}/${hoy.getMonth() + 1} ${hoy.getHours()}:${String(hoy.getMinutes()).padStart(2, "0")}`;
        let detallesFinal = editedTask.detalles || original.detalles || "";
        if (estadoCambio) {
          detallesFinal += `\n• [${timestamp}] Estado cambiado a "${normalizarEstado(editedTask.estado)}" por @${usuario}`;
        }
        const taskConDetalles = marcarTareaPendiente(normalizarTareaCampos({
          ...original,
          ...(estadoCambio ? { estado: normalizarEstado(editedTask.estado) } : {}),
          detalles: detallesFinal
        }));
        const taskConFlujo = estadoCambio && typeof aplicarFlujoSegunEstadoEstatus === "function"
          ? aplicarFlujoSegunEstadoEstatus(taskConDetalles, editedTask.estado)
          : taskConDetalles;
        const taskKeyOriginal = getTaskSelectionKey(original);
        const copiaTareas = [...tareas];
        copiaTareas[index] = taskConFlujo;
        persistTareas(copiaTareas);

        encolarSync({
          type: "update",
          taskKey: getTaskSelectionKey(taskConFlujo),
          taskKeyOriginal,
          payload: construirPayloadSyncTarea(original, taskConFlujo, {
            campoSync: estadoCambio ? "todo" : "detalles"
          })
        });
        setHayPendientesLocales(true);
        if (estadoCambio) {
          notificarCambioEstadoTarea(taskConFlujo, usuario, original.estado, editedTask.estado)
            .then(() => refrescarNotificaciones());
        }
        setIsEditing(false);
        setActiveTask(null);
        showToast(estadoCambio ? "Estado actualizado" : "Notas guardadas", "success");
        sincronizarEnSegundoPlano();
        return;
      }

      const hoy = new Date();
      const timestamp = `${hoy.getDate()}/${hoy.getMonth() + 1} ${hoy.getHours()}:${String(hoy.getMinutes()).padStart(2, '0')}`;
      let detallesAudoria = editedTask.detalles || "";
      const cambios = [];
      if (original.info !== editedTask.info && tituloLimpioTarea(original) !== tituloLimpioTarea(editedTask)) cambios.push("título");
      if (original.categoria !== editedTask.categoria) cambios.push("categoría");
      if (obtenerSubclienteTarea(original) !== obtenerSubclienteTarea(editedTask)) cambios.push("subcliente");
      if (original.personas !== editedTask.personas) cambios.push("asignados");
      if (normalizarEstado(original.estado) !== normalizarEstado(editedTask.estado)) cambios.push(`estado a "${normalizarEstado(editedTask.estado)}"`);
      if (normalizarDeadline(original.deadline) !== normalizarDeadline(editedTask.deadline)) cambios.push("fecha límite");
      if (normalizarDeadline(original.fechaInicio || "") !== normalizarDeadline(editedTask.fechaInicio || "")) cambios.push("inicio de trabajo");
      const prioridadNormalizada = normalizarPrioridad(editedTask.prioridad);
      if (normalizarPrioridad(original.prioridad) !== prioridadNormalizada) cambios.push("prioridad");

      if (cambios.length > 0) {
        detallesAudoria += `\n• [${timestamp}] Editado (${cambios.join(", ")}) por @${usuario}`;
      }

      let taskConHistorial = marcarTareaPendiente(normalizarTareaCampos(prepararTareaConCategoria({
        ...editedTask,
        idTarea: original.idTarea,
        prioridad: prioridadNormalizada,
        fechaInicio: normalizarDeadline(editedTask.fechaInicio || resolverFechaInicioTarea(editedTask) || fechaHoyDisplay()),
        detalles: detallesAudoria
      })));
      if (normalizarEstado(original.estado) !== normalizarEstado(editedTask.estado)
        && typeof aplicarFlujoSegunEstadoEstatus === "function") {
        taskConHistorial = aplicarFlujoSegunEstadoEstatus(taskConHistorial, editedTask.estado);
      }

      const fechasEditadas = {};
      if (normalizarDeadline(original.deadline) !== normalizarDeadline(editedTask.deadline)) {
        fechasEditadas.deadline = taskConHistorial.deadline;
      }
      if (normalizarDeadline(original.fechaInicio || "") !== normalizarDeadline(editedTask.fechaInicio || "")) {
        fechasEditadas.fechaInicio = taskConHistorial.fechaInicio;
      }
      if (fechasEditadas.deadline || fechasEditadas.fechaInicio) {
        taskConHistorial = registrarEdicionFechasLocales(taskConHistorial, fechasEditadas);
      }

      const taskKeyOriginal = getTaskSelectionKey(original);
      const copiaTareas = [...tareas];
      copiaTareas[index] = taskConHistorial;
      persistTareas(copiaTareas);

      encolarSync({
        type: "update",
        taskKey: getTaskSelectionKey(taskConHistorial),
        taskKeyOriginal,
        payload: construirPayloadSyncTarea(original, taskConHistorial, { campoSync: "todo" })
      });
      setHayPendientesLocales(true);

      if (original.personas !== editedTask.personas) {
        notificarNuevosAsignados(taskConHistorial, usuario, original.personas, editedTask.personas)
          .then(() => refrescarNotificaciones());
      }
      if (normalizarEstado(original.estado) !== normalizarEstado(editedTask.estado)) {
        notificarCambioEstadoTarea(taskConHistorial, usuario, original.estado, editedTask.estado)
          .then(() => refrescarNotificaciones());
      }

      setListaCategorias((prev) => {
        const parsed = parseCategoriasTarea(taskConHistorial.categoria);
        if (!parsed.principal) return prev;
        return registrarCategoriasEnLista(prev, [{ nombre: parsed.principal, color: asignarColorCategoria(parsed.principal, prev) }]);
      });

      setIsEditing(false);
      setActiveTask(null);
      sincronizarEnSegundoPlano();
    } finally {
      setTimeout(() => { guardandoRef.current = false; }, 250);
    }
  };

  const handleDeleteTask = async (tarea) => {
    if (isDesigner) return;
    if (guardandoRef.current) return;
    guardandoRef.current = true;

    try {
      const taskKey = getTaskSelectionKey(tarea);
      persistTareas(prev => prev.filter(t => getTaskSelectionKey(t) !== taskKey));
      setTaskToDelete(null);
      setIsEditing(false);
      setActiveTask(null);

      encolarSync({
        type: "delete",
        taskKey,
        payload: {
          marca: marcaParaSheet(tarea.marca),
          idTarea: String(tarea.idTarea || "").startsWith("STB-") ? "" : tarea.idTarea,
          info: tarea.info,
          originalInfo: tarea.info,
          categoria: tarea.categoria,
          campo: "eliminar"
        }
      });
      setHayPendientesLocales(true);
      showToast("Eliminado", "success");
      sincronizarEnSegundoPlano();
    } finally {
      setTimeout(() => { guardandoRef.current = false; }, 250);
    }
  };

  const handleCreateTask = async (e, detallesSerializados, tareaPreparada) => {
    if (isDesigner) return;
    e.preventDefault();
    if (guardandoRef.current) return;

    const base = tareaPreparada || nuevaTarea;
    
    if (!base.info.trim()) {
      showToast("Ingresa el título del entregable", "error");
      return;
    }
    if (!normalizarDeadline(base.deadline)) {
      showToast("Ingresa una fecha válida (ej: 16/06/2026)", "error");
      return;
    }
    const inicioNorm = normalizarDeadline(
      base.fechaInicio?.trim() ? base.fechaInicio : (resolverFechaInicioTarea(base) || fechaHoyDisplay())
    );
    if (!inicioNorm) {
      showToast("La fecha de inicio no es válida (ej: 16/06/2026)", "error");
      return;
    }
    if (inicioNorm && obtenerTiempoFecha(inicioNorm) > obtenerTiempoFecha(base.deadline)) {
      showToast("El inicio no puede ser después de la entrega", "error");
      return;
    }

    guardandoRef.current = true;
    try {
      const autoId = generateBrandId(base.marca);
      const hoy = new Date();
      const timestamp = `${hoy.getDate()}/${hoy.getMonth() + 1} ${hoy.getHours()}:${String(hoy.getMinutes()).padStart(2, '0')}`;
      const historialInicial = `• [${timestamp}] Creado por @${usuario}`;
      const detallesBase = detallesSerializados ?? base.detalles;
      const detallesConCreador = detallesBase
        ? `${detallesBase.trim()}\n\n${historialInicial}`
        : historialInicial;

      const nuevaConId = marcarTareaPendiente(normalizarTareaCampos(prepararTareaConCategoria({
        ...base,
        idTarea: autoId,
        fechaInicio: inicioNorm,
        detalles: detallesConCreador
      })));

      setListaCategorias((prev) => {
        const parsed = parseCategoriasTarea(nuevaConId.categoria);
        if (!parsed.principal) return prev;
        return registrarCategoriasEnLista(prev, [{ nombre: parsed.principal, color: asignarColorCategoria(parsed.principal, prev) }]);
      });
      const subclienteNuevo = obtenerSubclienteTarea(nuevaConId);
      if (subclienteNuevo) {
        setListaSubclientes((prev) => registrarSubclientesEnLista(prev, [{
          marca: nuevaConId.marca,
          nombre: subclienteNuevo
        }]));
        insertarSubclienteRemoto(nuevaConId.marca, subclienteNuevo);
      }

      persistTareas((prev) => [nuevaConId, ...prev]);

      const taskKey = getTaskSelectionKey(nuevaConId);
      encolarSync({
        type: "create",
        taskKey,
        payload: construirPayloadSyncTarea(nuevaConId, nuevaConId, { esNuevo: true, campoSync: "todo" })
      });
      setHayPendientesLocales(true);
      notificarAsignacionTarea(nuevaConId, usuario).then(() => refrescarNotificaciones());

      setNuevaTarea(
        typeof window.crearNuevaTareaVacia === "function"
          ? window.crearNuevaTareaVacia()
          : (typeof crearNuevaTareaVacia === "function" ? crearNuevaTareaVacia() : {
              marca: "La Santé", categoria: "", info: "", personas: "", detalles: "",
              link: "", estado: "Pendiente", deadline: "", fechaInicio: "", prioridad: "Media"
            })
      );
      setPaginaActiva("dashboard");
      showToast("Entregable creado", "success");
      sincronizarEnSegundoPlano();
    } finally {
      setTimeout(() => { guardandoRef.current = false; }, 250);
    }
  };

  const handleCreateTaskRapido = async (tareaPreparada) => {
    if (isDesigner) return;
    const fakeEvent = { preventDefault: () => {} };
    const detallesSerializados = serializeDetalles("", [], [], "");
    await handleCreateTask(fakeEvent, detallesSerializados, tareaPreparada);
    setFormularioRapidoVisible(false);
  };

  const pendientesImportEstatus = useMemo(() => {
    if (typeof prepararImportacionEstatus !== "function") return 0;
    const filas = typeof ESTATUS_LA_SANTE_IMPORT_ROWS !== "undefined" ? ESTATUS_LA_SANTE_IMPORT_ROWS : [];
    if (!filas.length) return 0;
    return prepararImportacionEstatus(filas, tareas, usuario).nuevas.length;
  }, [tareas, usuario]);

  const importarFilasEstatusInterno = (filas, extraMsg) => {
    if (isDesigner) return;
    if (typeof prepararImportacionEstatus !== "function") {
      showToast("No se pudo preparar la importación", "error");
      return;
    }
    const { nuevas, omitidasDuplicadas } = prepararImportacionEstatus(filas, tareas, usuario);
    if (!nuevas.length) {
      showToast(
        omitidasDuplicadas.length ? "Esas filas ya estaban cargadas" : "No hay filas con entregable para cargar",
        "info"
      );
      return;
    }

    setImportandoEstatus(true);
    try {
      const creadas = nuevas.map((t) => {
        const autoId = String(t.idTarea || "").startsWith("IMP-")
          ? t.idTarea
          : generateBrandId(t.marca);
        const normalizada = typeof normalizarTareaCampos === "function"
          ? normalizarTareaCampos({ ...t, idTarea: autoId, categoria: t.categoria || "Solicitud" })
          : { ...t, idTarea: autoId, categoria: t.categoria || "Solicitud" };
        return marcarTareaPendiente(normalizada);
      });

      persistTareas((prev) => [...creadas, ...prev]);

      const subclientes = [];
      creadas.forEach((t) => {
        const taskKey = getTaskSelectionKey(t);
        encolarSync({
          type: "create",
          taskKey,
          payload: construirPayloadSyncTarea(t, t, { esNuevo: true, campoSync: "todo" })
        });
        const sub = typeof obtenerSubclienteTarea === "function" ? obtenerSubclienteTarea(t) : t.subcliente;
        if (sub && !subclientes.some((s) => typeof subclientesCoinciden === "function" ? subclientesCoinciden(s, sub) : s === sub)) {
          subclientes.push(sub);
        }
      });

      if (subclientes.length) {
        setListaSubclientes((prev) => registrarSubclientesEnLista(prev, subclientes.map((nombre) => ({
          marca: "La Santé",
          nombre
        }))));
        subclientes.forEach((nombre) => insertarSubclienteRemoto("La Santé", nombre));
      }

      setHayPendientesLocales(true);
      sincronizarEnSegundoPlano();
      const extra = extraMsg ? ` ${extraMsg}` : "";
      showToast(`${creadas.length} entregables cargados en La Santé.${extra}`, "success");
    } finally {
      setImportandoEstatus(false);
    }
  };

  const handleImportarEstatusPaquete = () => {
    const filas = typeof ESTATUS_LA_SANTE_IMPORT_ROWS !== "undefined" ? ESTATUS_LA_SANTE_IMPORT_ROWS : [];
    importarFilasEstatusInterno(filas);
  };

  const handleImportarEstatusCsv = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = extraerFilasEstatusDesdeCsv(text);
      const extra = parsed.omitidasVacias || parsed.omitidasSinEntregable
        ? `Se omitieron ${parsed.omitidasVacias + parsed.omitidasSinEntregable} filas vacías.`
        : "";
      importarFilasEstatusInterno(parsed.filas, extra);
    } catch (e) {
      showToast("No se pudo leer el CSV", "error");
    }
  };

  useEffect(() => {
    if (isDesigner || !usuario) return;
    if (typeof listarTareasDisenarPendientesACorregir !== "function") return;
    const filas = typeof ESTATUS_LA_SANTE_IMPORT_ROWS !== "undefined" ? ESTATUS_LA_SANTE_IMPORT_ROWS : [];
    const aCorregir = listarTareasDisenarPendientesACorregir(tareas, filas);
    if (!aCorregir.length) return;

    const keys = new Set(aCorregir.map((t) => getTaskSelectionKey(t)));
    const hoy = new Date();
    const timestamp = `${hoy.getDate()}/${hoy.getMonth() + 1} ${hoy.getHours()}:${String(hoy.getMinutes()).padStart(2, "0")}`;
    const cambios = [];
    const next = tareas.map((t) => {
      if (!keys.has(getTaskSelectionKey(t))) return t;
      if ((typeof cleanEstado === "function" ? cleanEstado(t.estado) : "") !== "pendiente") return t;
      const actualizada = marcarTareaPendiente(normalizarTareaCampos({
        ...t,
        estado: "En progreso",
        detalles: `${t.detalles || ""}\n• [${timestamp}] Estado cambiado a "En progreso" por @${usuario}`
      }));
      cambios.push({ original: t, actualizada });
      return actualizada;
    });
    if (!cambios.length) return;

    persistTareas(next);
    cambios.forEach(({ original, actualizada }) => {
      encolarSync({
        type: "update",
        taskKey: getTaskSelectionKey(actualizada),
        taskKeyOriginal: getTaskSelectionKey(original),
        payload: construirPayloadSyncTarea(original, actualizada, { campoSync: "estado", valor: "En progreso" })
      });
    });
    setHayPendientesLocales(true);
    sincronizarEnSegundoPlano();
  }, [isDesigner, usuario, tareas]);

  useEffect(() => {
    if (isDesigner || !usuario) return;
    if (loading) return;
    if (isApiConfigured() && !ultimaSyncOk && !apiError) return;
    if (pendientesImportEstatus <= 0) {
      restauroEstatusRef.current = 0;
      return;
    }
    if (restauroEstatusRef.current === pendientesImportEstatus) return;
    restauroEstatusRef.current = pendientesImportEstatus;
    handleImportarEstatusPaquete();
  }, [pendientesImportEstatus, usuario, isDesigner, loading, ultimaSyncOk, apiError]);

  useEffect(() => {
    if (isDesigner || !usuario) return;
    if (typeof listarTareasEstatusARealinear !== "function") return;
    const filas = typeof ESTATUS_LA_SANTE_IMPORT_ROWS !== "undefined" ? ESTATUS_LA_SANTE_IMPORT_ROWS : [];
    const pendientes = listarTareasEstatusARealinear(tareas, filas).filter((item) => {
      const key = getTaskSelectionKey(item.tarea);
      return !alineadasEstatusRef.current.has(key);
    });
    if (!pendientes.length) return;

    const hoy = new Date();
    const timestamp = `${hoy.getDate()}/${hoy.getMonth() + 1} ${hoy.getHours()}:${String(hoy.getMinutes()).padStart(2, "0")}`;
    const keysPlan = new Map(pendientes.map((item) => [getTaskSelectionKey(item.tarea), item]));
    const cambios = [];
    const next = tareas.map((t) => {
      const item = keysPlan.get(getTaskSelectionKey(t));
      if (!item) return t;
      alineadasEstatusRef.current.add(getTaskSelectionKey(t));
      const parsed = typeof parseDetalles === "function" ? parseDetalles(t.detalles || "") : { notas: t.detalles || "", subtareas: [], historial: [], link: t.link, subcliente: t.subcliente };
      const importKey = item.importKey || parsed.importKey || t.importKey || "";
      const flujo = (item.flujoCsv != null && item.flujoCsv !== undefined)
        ? item.flujoCsv
        : (parsed.flujo || t.flujo || "");
      const sub = parsed.subcliente || (typeof obtenerSubclienteTarea === "function" ? obtenerSubclienteTarea(t) : t.subcliente);
      const detalles = typeof serializeDetalles === "function"
        ? serializeDetalles(parsed.notas, parsed.subtareas || [], parsed.historial || [], parsed.link || t.link, sub, { flujo, importKey })
        : t.detalles;
      const info = item.infoNuevo || t.info;
      const actualizada = marcarTareaPendiente(normalizarTareaCampos({
        ...t,
        info,
        flujo,
        importKey,
        estado: item.estadoCsv || t.estado,
        detalles: item.estadoCsv
          ? `${detalles}\n• [${timestamp}] Estado cambiado a "${item.estadoCsv}" por @${usuario}`
          : detalles
      }));
      cambios.push({ original: t, actualizada, campoSync: "todo", valor: item.estadoCsv || "" });
      return actualizada;
    });
    if (!cambios.length) return;

    persistTareas(next);
    cambios.forEach(({ original, actualizada, campoSync, valor }) => {
      encolarSync({
        type: "update",
        taskKey: getTaskSelectionKey(actualizada),
        taskKeyOriginal: getTaskSelectionKey(original),
        payload: construirPayloadSyncTarea(original, actualizada, campoSync === "estado"
          ? { campoSync: "estado", valor }
          : { campoSync: "todo" })
      });
    });
    setHayPendientesLocales(true);
    sincronizarEnSegundoPlano();
  }, [isDesigner, usuario, tareas]);

  if (!usuario) {
    return (
      <div className={`h-screen w-screen ${currentTheme.bg} ${currentTheme.text} flex items-center justify-center p-4 select-none animate-fade-in`}>
        <div className={`${currentTheme.cardBg} border ${currentTheme.border} shadow-sm rounded-md p-6 md:p-8 w-full max-w-sm flex flex-col gap-6`}>
          
          <div className="flex flex-col items-center gap-1.5">
            <RobinLogo className="h-8 w-auto" theme={theme} />
            <span className={`${currentTheme.mutedText} text-[10px] font-bold uppercase tracking-widest mt-1`}>Workspace Login</span>
          </div>

          {loginError && (
            <div className={`p-2.5 border text-xs font-semibold rounded flex items-center gap-2 ${theme === "midnight" ? "bg-red-950/40 text-red-300 border-red-800" : "bg-red-50 text-red-650 border-red-100"}`}>
              <i className={`fa-solid fa-circle-exclamation ${theme === "midnight" ? "text-red-400" : "text-red-550"}`}></i>
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className={`block text-[10px] font-bold ${currentTheme.mutedText} uppercase tracking-wider mb-1`}>Colaborador (Usuario)</label>
              <input
                type="text"
                name="username"
                required
                placeholder="Tu usuario..."
                className={`w-full border ${currentTheme.border} p-2.5 text-xs font-semibold rounded focus:outline-none placeholder-zinc-500 ${currentTheme.text} ${theme === "midnight" ? "bg-zinc-900" : "bg-zinc-50"}`}
              />
            </div>

            <div>
              <label className={`block text-[10px] font-bold ${currentTheme.mutedText} uppercase tracking-wider mb-1`}>Contraseña</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={claveInput}
                onChange={(e) => setClaveInput(e.target.value)}
                className={`w-full border ${currentTheme.border} p-2.5 text-xs rounded focus:outline-none ${currentTheme.text} ${theme === "midnight" ? "bg-zinc-900" : "bg-zinc-50"}`}
              />
            </div>

            <button
              type="submit"
              className={`w-full ${currentTheme.primary} font-semibold py-2.5 px-4 rounded text-xs uppercase tracking-wider shadow-sm transition-colors mt-1`}
            >
              Acceder
            </button>
          </form>

          <div className="text-center">
            <p className={`text-[10px] ${currentTheme.mutedText} font-semibold leading-relaxed`}>
              Acceso exclusivo de Trade & Shopper Marketing.<br />
              Socio estratégico de marca ROBIN.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const campanaNotificaciones = !isConfigOnlyAdmin && usuario ? (
    <CampanaNotificaciones
      usuario={usuario}
      notificaciones={notificaciones}
      unreadCount={unreadNotifCount}
      cargando={notifCargando}
      onRefresh={refrescarNotificaciones}
      onAbrirTarea={abrirTareaPorKey}
      onMarkRead={async (id) => {
        await marcarNotificacionLeida(id);
        refrescarNotificaciones();
      }}
      onMarkAllRead={async () => {
        await marcarTodasNotificacionesLeidas(usuario);
        refrescarNotificaciones();
      }}
      getMarcaStyle={getMarcaStyle}
      tareas={tareasVisibles}
    />
  ) : null;

  const tituloConfigSeccion = (seccion) => ({
    perfil: "Perfil",
    avanzadas: "Opciones avanzadas",
    api: "Base de datos",
    widgets: "Enlaces",
    clientes: "Fichas clientes",
    news: "TMK News"
  }[seccion] || "Ajustes");

  const renderConfigAvanzadas = () => {
    void configUiBump;
    const calVista = getUserPreference("calendarioVista", "semana", usuario) === "mes" ? "mes" : "semana";

    return (
      <div className="robin-config-advanced">
        <section className="robin-config-advanced__block">
          <h3 className="robin-config-advanced__label">Tema</h3>
          <p className="robin-config-advanced__hint">Apariencia clara u oscura de la interfaz.</p>
          <div className="grid grid-cols-2 gap-2 max-w-xs">
            <button type="button" onClick={() => handleThemeChange("notion")} className={`${themePickerBtnClass(theme, "notion")} theme-picker-btn--compact`}>Claro</button>
            <button type="button" onClick={() => handleThemeChange("midnight")} className={`${themePickerBtnClass(theme, "midnight")} theme-picker-btn--compact`}>Oscuro</button>
          </div>
        </section>

        <section className="robin-config-advanced__block">
          <h3 className="robin-config-advanced__label">Icono en el teléfono</h3>
          <p className="robin-config-advanced__hint">Al instalar la PWA. El logo del encabezado no cambia.</p>
          <div className="grid grid-cols-3 gap-2 max-w-md">
            {Object.entries(PWA_ICON_VARIANTS).map(([key, { preview, label }]) => (
              <button
                key={key}
                type="button"
                onClick={() => handlePwaIconVariantChange(key)}
                className={`p-2 rounded-md border flex flex-col items-center gap-1.5 transition-all ${
                  pwaIconVariant === key ? "border-[#37352F] ring-2 ring-[#37352F]/20" : "border-zinc-200"
                }`}
              >
                <img src={preview} alt={label} className="w-full aspect-square object-contain rounded" />
                <span className="text-[10px] font-semibold text-zinc-600">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {!isConfigOnlyAdmin && (
          <section className="robin-config-advanced__block">
            <h3 className="robin-config-advanced__label">Vista por defecto</h3>
            <p className="robin-config-advanced__hint">Cómo se abre el listado de entregables.</p>
            <div className="robin-config-advanced__pills">
              <button
                type="button"
                className={`robin-config-advanced__pill ${vistaModo === "TABLE" ? "is-active" : ""}`}
                onClick={() => { setVistaModo("TABLE"); setUserPreference("vistaModo", "TABLE", usuario); setConfigUiBump((n) => n + 1); }}
              >
                Lista
              </button>
              <button
                type="button"
                className={`robin-config-advanced__pill ${vistaModo === "KANBAN" ? "is-active" : ""}`}
                onClick={() => { setVistaModo("KANBAN"); setUserPreference("vistaModo", "KANBAN", usuario); setConfigUiBump((n) => n + 1); }}
              >
                Tablero
              </button>
            </div>
          </section>
        )}

        {!isConfigOnlyAdmin && (
          <section className="robin-config-advanced__block">
            <h3 className="robin-config-advanced__label">Cronograma</h3>
            <p className="robin-config-advanced__hint">Vista inicial del calendario en Home.</p>
            <div className="robin-config-advanced__pills">
              <button
                type="button"
                className={`robin-config-advanced__pill ${calVista === "semana" ? "is-active" : ""}`}
                onClick={() => { setUserPreference("calendarioVista", "semana", usuario); setConfigUiBump((n) => n + 1); }}
              >
                Semana
              </button>
              <button
                type="button"
                className={`robin-config-advanced__pill ${calVista === "mes" ? "is-active" : ""}`}
                onClick={() => { setUserPreference("calendarioVista", "mes", usuario); setConfigUiBump((n) => n + 1); }}
              >
                Mes
              </button>
            </div>
          </section>
        )}

        {(isAdmin || (!isConfigOnlyAdmin && !isDesigner)) && (
          <section className="robin-config-advanced__block">
            <h3 className="robin-config-advanced__label">Usuarios</h3>
            <p className="robin-config-advanced__hint">Personas con acceso a ROBIN.</p>
            {isAdmin ? (
              <div className={`${currentTheme.cardBg} border ${currentTheme.border} p-3 rounded-md flex flex-col gap-3`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-2">
                    <h4 className={`text-sm font-bold ${currentTheme.text}`}>Ejecutivos</h4>
                    <form onSubmit={handleAddExecutive} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Usuario ejecutivo (ej: ralvarez)"
                        value={nuevoEjecutivoInput}
                        onChange={(e) => setNuevoEjecutivoInput(e.target.value)}
                        className="flex-1 bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm rounded font-semibold"
                      />
                      <button type="submit" className="px-3 py-2 bg-[#37352F] text-white text-ui font-semibold rounded-md">+</button>
                    </form>
                    <div className="flex flex-wrap gap-1.5">
                      {listaEjecutivos.length ? listaEjecutivos.map((u) => (
                        <span
                          key={u}
                          className="inline-flex items-center gap-1 bg-zinc-50 border border-zinc-200 text-zinc-800 text-[11px] font-semibold px-2 py-1 rounded-full"
                        >
                          @{u}
                          {u !== "admin" && (
                            <button type="button" onClick={() => handleRemoveExecutive(u)} className="text-zinc-400 font-bold">&times;</button>
                          )}
                        </span>
                      )) : (
                        <span className="text-ui-sm text-zinc-400">Sin ejecutivos</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h4 className={`text-sm font-bold ${currentTheme.text}`}>Contenido</h4>
                    <form onSubmit={handleAddContenido} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Usuario contenido (ej: dsanchez)"
                        value={nuevoContenidoInput}
                        onChange={(e) => setNuevoContenidoInput(e.target.value)}
                        className="flex-1 bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm rounded font-semibold"
                      />
                      <button type="submit" className="px-3 py-2 bg-[#37352F] text-white text-ui font-semibold rounded-md">+</button>
                    </form>
                    <div className="flex flex-wrap gap-1.5">
                      {listaContenido.length ? listaContenido.map((u) => (
                        <span
                          key={u}
                          className="inline-flex items-center gap-1 bg-zinc-50 border border-zinc-200 text-zinc-800 text-[11px] font-semibold px-2 py-1 rounded-full"
                        >
                          @{u}
                          <button type="button" onClick={() => handleRemoveContenido(u)} className="text-zinc-400 font-bold">&times;</button>
                        </span>
                      )) : (
                        <span className="text-ui-sm text-zinc-400">Sin contenido</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h4 className={`text-sm font-bold ${currentTheme.text}`}>Diseñadores</h4>
                    <form onSubmit={handleAddDesigner} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Usuario diseñador (ej: jalfiero)"
                        value={nuevoDisenadorInput}
                        onChange={(e) => setNuevoDisenadorInput(e.target.value)}
                        className="flex-1 bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm rounded font-semibold"
                      />
                      <button type="submit" className="px-3 py-2 bg-[#37352F] text-white text-ui font-semibold rounded-md">+</button>
                    </form>
                    <div className="flex flex-wrap gap-1.5">
                      {listaDisenadores.length ? listaDisenadores.map((u) => (
                        <span
                          key={u}
                          className="inline-flex items-center gap-1 bg-zinc-50 border border-zinc-200 text-zinc-800 text-[11px] font-semibold px-2 py-1 rounded-full"
                        >
                          @{u}
                          <button type="button" onClick={() => handleRemoveDesigner(u)} className="text-zinc-400 font-bold">&times;</button>
                        </span>
                      )) : (
                        <span className="text-ui-sm text-zinc-400">Sin diseñadores</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-ui-sm text-zinc-500">Solo administradores pueden editar la lista.</p>
            )}
          </section>
        )}

        {!isConfigOnlyAdmin && (
          <section className="robin-config-advanced__block">
            <h3 className="robin-config-advanced__label">Guía de uso</h3>
            <p className="robin-config-advanced__hint">Recorrido interactivo por la aplicación.</p>
            <button type="button" className="robin-config-advanced__link-btn" onClick={() => iniciarInduccion(true)}>
              Ver inducción de nuevo
            </button>
          </section>
        )}
      </div>
    );
  };

  const renderConfigSeccionContenido = (seccion) => {
    if (seccion === "perfil" && !isConfigOnlyAdmin) {
      return (
        <PanelPerfilUsuario
          usuario={usuario}
          perfilNombre={perfilNombre}
          perfilApellido={perfilApellido}
          perfilCorreo={perfilCorreo}
          perfilAvatar={perfilAvatar}
          onChangeNombre={setPerfilNombre}
          onChangeApellido={setPerfilApellido}
          onChangeCorreo={setPerfilCorreo}
          onChangeAvatar={setPerfilAvatar}
          onGuardar={handleSavePerfil}
          currentTheme={currentTheme}
          theme={theme}
        />
      );
    }

    if (seccion === "avanzadas") {
      return renderConfigAvanzadas();
    }

    if (seccion === "api") return renderPanelDiagnosticoApi();

    if (seccion === "news") {
      return (
        <PanelTmkNews
          usuario={usuario}
          nombreUsuario={nombreCompleto}
          currentTheme={currentTheme}
          theme={theme}
          onPublicado={() => {
            cargarNoticiasTmk();
            cargarNoticiasTmkArchivo();
          }}
          showToast={showToast}
        />
      );
    }

    if (seccion === "widgets" && isConfigOnlyAdmin) {
      return (
        <WidgetsAdminPanel
          widgets={widgets}
          onAddWidget={handleAddWidget}
          onEditWidget={handleEditWidget}
          onDeleteWidget={handleDeleteWidget}
          marcasDisponibles={marcasDisponibles}
        />
      );
    }

    if (seccion === "clientes" && isConfigOnlyAdmin) {
      return (
        <LayoutClientes
          key={clientesReset}
          marcas={marcasDisponibles}
          marcasMetadata={marcasMetadata}
          canEdit={canEditFichas}
          onSaveBrandMetadata={handleSaveBrandMetadata}
          onRegisterBrand={handleCreateBrand}
          onDeleteBrand={handleDeleteBrand}
        />
      );
    }

    return null;
  };

  const renderConfigMenu = (variant) => {
    const esDesktop = variant === "desktop";
    const itemClass = esDesktop ? "robin-config-nav-btn" : "mobile-menu-btn";

    const Item = ({ seccion, icon, label }) => (
      <button
        type="button"
        onClick={() => {
          setConfigOrigenSeccion(null);
          setConfigSeccion(seccion);
        }}
        className={`${itemClass} ${esDesktop && configSeccion === seccion ? "is-active" : ""}`}
      >
        <span><i className={`fa-solid ${icon}`}></i> {label}</span>
        {!esDesktop && <i className="fa-solid fa-chevron-right text-[10px] text-zinc-300"></i>}
      </button>
    );

    return (
      <div className={`flex flex-col gap-2 ${esDesktop ? "robin-config-nav" : ""}`}>
        {!esDesktop && <h2 className={`text-base font-bold mb-1 ${currentTheme.text}`}>Ajustes</h2>}
        {!isConfigOnlyAdmin && <Item seccion="perfil" icon="fa-user" label="Perfil" />}
        <Item seccion="news" icon="fa-newspaper" label="TMK News" />
        <Item seccion="api" icon="fa-database" label="Base de datos" />
        <Item seccion="avanzadas" icon="fa-gear" label="Opciones avanzadas" />
        {isConfigOnlyAdmin && (
          <>
            <Item seccion="widgets" icon="fa-link" label="Enlaces" />
            <Item seccion="clientes" icon="fa-id-card" label="Fichas clientes" />
          </>
        )}
        {!esDesktop && (
          <button type="button" onClick={handleLogout} className="mobile-menu-btn is-danger mt-2">
            <span><i className="fa-solid fa-right-from-bracket"></i> Cerrar sesión</span>
          </button>
        )}
      </div>
    );
  };

  const renderPanelDiagnosticoApi = () => {
    const logs = leerDiagnosticoRobin();
    const colaPendiente = cargarColaSync().length;
    const severidad = estadoSyncResumen.severidad;
    const icono = severidad === "ok"
      ? "fa-circle-check text-emerald-500"
      : severidad === "error"
        ? "fa-triangle-exclamation text-red-500"
        : "fa-circle-info text-amber-500";

    return (
      <div className={`${currentTheme.cardBg} border ${currentTheme.border} p-3 rounded-md flex flex-col gap-3 text-xs`}>
        <div className="flex items-start gap-2">
          <i className={`fa-solid ${icono} mt-0.5`}></i>
          <div className="min-w-0">
            <p className={`font-bold ${currentTheme.text}`}>{estadoSyncResumen.titulo}</p>
            {estadoSyncResumen.detalle ? (
              <p className={`${currentTheme.mutedText} mt-1 leading-relaxed`}>{estadoSyncResumen.detalle}</p>
            ) : null}
            {apiErrorDetail && apiError ? (
              <p className="mt-2 p-2 rounded bg-red-50 text-red-700 border border-red-100 font-mono text-[10px] break-words">
                {apiErrorDetail}
              </p>
            ) : null}
            <p className={`${currentTheme.mutedText} mt-2 text-[11px]`}>
              Cola local: {colaPendiente} · Pendientes: {colaPendiente > 0 ? "sí" : "no"}
              {ultimaSyncOk ? ` · Última sync OK: ${new Date(ultimaSyncOk).toLocaleString("es-VE")}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => sincronizarEnSegundoPlano()}
            disabled={loading || syncing}
            className="px-3 py-1.5 rounded border border-zinc-200 bg-white text-zinc-700 font-semibold"
          >
            Reintentar sync
          </button>
          <button
            type="button"
            onClick={async () => {
              const texto = [
                `Estado: ${estadoSyncResumen.titulo}`,
                apiErrorDetail ? `Error: ${apiErrorDetail}` : "",
                `Cola: ${colaPendiente}`,
                ...logs.slice(0, 8).map((l) => `${l.at} [${l.categoria}] ${l.mensaje}${l.detalle ? ` — ${l.detalle}` : ""}`)
              ].filter(Boolean).join("\n");
              const ok = await copiarTextoAlPortapapeles(texto);
              showToast(ok ? "Diagnóstico copiado" : "No se pudo copiar", ok ? "success" : "error");
            }}
            className="px-3 py-1.5 rounded border border-zinc-200 bg-white text-zinc-700 font-semibold"
          >
            Copiar diagnóstico
          </button>
        </div>

        {!isDesigner && (
          <div className={`border-t ${currentTheme.border} pt-3 flex flex-col gap-2`}>
            <p className={`font-semibold ${currentTheme.text}`}>Estatus La Santé</p>
            <p className={`${currentTheme.mutedText} leading-relaxed`}>
              Sube un CSV de status interno para crear entregables en La Santé. Las cadenas quedan como subclientes.
            </p>
            <input
              ref={csvEstatusInputRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => {
                const file = e.target.files && e.target.files[0];
                if (file) handleImportarEstatusCsv(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => csvEstatusInputRef.current && csvEstatusInputRef.current.click()}
              disabled={importandoEstatus || loading || syncing}
              className="px-3 py-1.5 rounded border border-zinc-200 bg-white text-zinc-700 font-semibold self-start"
            >
              {importandoEstatus ? "Cargando CSV…" : "Subir otro CSV"}
            </button>
          </div>
        )}

        {logs.length > 0 && (
          <div className={`border-t ${currentTheme.border} pt-2`}>
            <p className={`font-semibold ${currentTheme.text} mb-1`}>Últimos eventos</p>
            <ul className="space-y-1 max-h-40 overflow-y-auto">
              {logs.slice(0, 6).map((log, idx) => (
                <li key={`${log.at}-${idx}`} className={`${currentTheme.mutedText} text-[10px] leading-relaxed`}>
                  <span className="font-mono">{new Date(log.at).toLocaleString("es-VE")}</span>
                  {" · "}
                  <span className="font-semibold">{log.categoria}</span>
                  {": "}
                  {log.mensaje}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderPanelSyncAmigable = () => {
    const colaPendiente = cargarColaSync().length;
    const sincronizando = syncing || loading;

    let icono = "fa-cloud";
    let colorIcono = "is-ok";
    let titulo = "Todo al día";
    let mensaje = "Tus entregables están sincronizados con Google Sheets.";

    if (!isApiConfigured()) {
      icono = "fa-cloud";
      colorIcono = "is-warn";
      titulo = "Sin conexión a Sheets";
      mensaje = "Esta instalación no tiene configurada la base de datos de Google Sheets.";
    } else if (sincronizando) {
      icono = "fa-cloud-arrow-up";
      colorIcono = "is-syncing";
      titulo = "Sincronizando";
      mensaje = "Estamos actualizando la información con Google Sheets.";
    } else if (apiError) {
      icono = "fa-cloud-arrow-down";
      colorIcono = "is-error";
      titulo = "Sin conexión";
      mensaje = "No pudimos conectar con Google Sheets. Tus cambios están guardados aquí y se reintentarán solos.";
    } else if (colaPendiente > 0 || hayPendientesLocales) {
      icono = "fa-cloud-arrow-up";
      colorIcono = "is-pending";
      titulo = "Subiendo cambios";
      mensaje = colaPendiente > 0
        ? (colaPendiente === 1
          ? "Hay 1 cambio esperando subirse a Google Sheets."
          : `Hay ${colaPendiente} cambios esperando subirse a Google Sheets.`)
        : "Finalizando la sincronización local…";
    }

    const ultimaSyncTexto = ultimaSyncOk
      ? `Actualizado ${new Date(ultimaSyncOk).toLocaleString("es-VE", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit"
        })}`
      : null;

    return (
      <div className={`robin-sync-card ${currentTheme.cardBg} border ${currentTheme.border}`}>
        <div className={`robin-sync-card__icon ${colorIcono}`}>
          <i className={`fa-solid ${icono} ${sincronizando ? "animate-pulse" : ""}`}></i>
        </div>
        <h3 className={`robin-sync-card__title ${currentTheme.text}`}>{titulo}</h3>
        <p className={`robin-sync-card__message ${currentTheme.mutedText}`}>{mensaje}</p>
        {ultimaSyncTexto && !apiError && !hayPendientesLocales && !sincronizando ? (
          <p className={`robin-sync-card__meta ${currentTheme.mutedText}`}>{ultimaSyncTexto}</p>
        ) : null}
        <button
          type="button"
          onClick={() => fetchData(false)}
          disabled={loading || syncing}
          className="robin-sync-card__action"
        >
          {sincronizando ? "Actualizando..." : "Actualizar ahora"}
        </button>
      </div>
    );
  };

  const renderSyncSubpage = () => (
    <div className="robin-sync-overlay" onClick={() => setSyncDetalleVisible(false)}>
      <div className="robin-sync-overlay__inner" onClick={(e) => e.stopPropagation()}>
        {renderPanelSyncAmigable()}
        <p className={`robin-sync-overlay__hint ${currentTheme.mutedText}`}>
          Toca la nube para cerrar
        </p>
      </div>
    </div>
  );

  return (
    <div className={`flex h-full w-screen overflow-hidden ${currentTheme.bg} ${currentTheme.text} select-none transition-all`}>
      
      {toast && (
        <div className="robin-float-above-chrome robin-toast-stack px-4 py-2.5 rounded shadow text-xs font-semibold flex items-center gap-2 border bg-zinc-900 text-white border-zinc-800 animate-zoom-in">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* MENÚ LATERAL ESTILO NOTION - SOLO DESKTOP (md+); móvil usa MobileNavBar */}
      {!isConfigOnlyAdmin && (
      <aside className={`hidden md:flex robin-sidebar ${currentTheme.sidebarBg}`}>
          <div className="robin-sidebar__header">
            <RobinLogo className="h-8 w-auto max-w-[110px]" theme={theme} />
            <div className="robin-notif-sidebar-slot">
              {campanaNotificaciones}
            </div>
          </div>

          <div className="robin-sidebar__top">
            <div className="robin-sidebar__presence" data-induccion="presencia">
              <button
                type="button"
                onClick={() => setSidebarEnLineaAbierto(prev => !prev)}
                className="robin-sidebar__section-toggle"
              >
                <span className="text-section">En línea</span>
                <i className={`fa-solid fa-chevron-down text-[8px] text-zinc-400 ml-auto transition-transform duration-150 ${sidebarEnLineaAbierto ? "rotate-180" : ""}`}></i>
              </button>

              {sidebarEnLineaAbierto && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-ui font-semibold presence-user-name text-[#37352F] truncate">
                      {formatearNombrePresencia({ username: usuario, nombre: nombreCompleto || `@${usuario}` })}
                    </span>
                  </div>

                  {presenceEstado === "ready" && otrosUsuariosEnLinea.map((u, index) => (
                    <div key={u.uid || `user-${index}`} className="flex items-center gap-1.5 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                      <span className="text-ui-sm text-zinc-600 presence-user-name font-medium truncate" title={formatearNombrePresencia(u)}>
                        {formatearNombrePresencia(u)}
                      </span>
                    </div>
                  ))}

                  {presenceEstado === "connecting" && (
                    <div className="text-ui-sm text-zinc-400 italic">Conectando...</div>
                  )}
                  {presenceEstado === "error" && (
                    <div className="text-ui-sm text-red-400 italic">Sin conexión</div>
                  )}
                  {presenceEstado === "ready" && otrosUsuariosEnLinea.length === 0 && (
                    <div className="text-ui-sm text-zinc-400 italic">Solo tú</div>
                  )}
                </div>
              )}
            </div>

            {!isDesigner && (
              <button type="button" onClick={() => navegarA("agregar")} className="robin-sidebar__cta" data-induccion="nav-agregar">
                <SVGIcon.Plus />
                <span>Añadir entregable</span>
              </button>
            )}
          </div>

          <nav className="robin-sidebar__body no-scrollbar" aria-label="Menú lateral">
            <div className="robin-sidebar__section">
              <span className="robin-sidebar__section-title">Navegación</span>
              <div className="robin-sidebar__tile-grid">
                <button
                  type="button"
                  onClick={() => navegarA("home")}
                  className={`robin-sidebar__tile ${paginaActiva === "home" ? "is-active" : ""}`}
                  data-induccion="nav-home"
                >
                  <SVGIcon.Home />
                  <span>Home</span>
                </button>
                <button
                  type="button"
                  onClick={() => navegarA("dashboard", () => { setFiltroTiempo("TODAS"); setFiltroMarca("TODAS"); setFiltroEstado("TODOS"); setFiltroPrioridad("TODAS"); setFiltroPersona("TODAS"); })}
                  className={`robin-sidebar__tile ${
                    paginaActiva === "dashboard" && filtroTiempo === "TODAS" && filtroMarca === "TODAS" && filtroEstado === "TODOS" && filtroPrioridad === "TODAS" && filtroPersona === "TODAS"
                      ? "is-active" : ""
                  }`}
                  data-induccion="nav-lista"
                >
                  <SVGIcon.All />
                  <span>Todos</span>
                </button>
              </div>
            </div>

            <div className="robin-sidebar__section">
              <button
                type="button"
                onClick={() => setSidebarMarcasAbierto(prev => !prev)}
                className="robin-sidebar__section-toggle"
                data-induccion="nav-marcas"
              >
                <span className="text-section">Marcas</span>
                {marcasDisponibles.length > 0 && (
                  <span className="text-[9px] text-zinc-400 ml-1">({marcasDisponibles.length})</span>
                )}
                <i className={`fa-solid fa-chevron-down text-[8px] text-zinc-400 ml-auto transition-transform duration-150 ${sidebarMarcasAbierto ? "rotate-180" : ""}`}></i>
              </button>
              {sidebarMarcasAbierto && (
                <div className="flex flex-col gap-0.5">
                  {!isDesigner && (
                    <button
                      type="button"
                      onClick={() => navegarA("clientes")}
                      className={`robin-sidebar__link ${paginaActiva === "clientes" ? "is-active" : ""}`}
                      data-induccion="nav-clientes"
                    >
                      <i className="fa-solid fa-layer-group robin-sidebar__link-icon"></i>
                      <span className="robin-sidebar__link-label">Todos los clientes</span>
                    </button>
                  )}
                  {marcasDisponibles.map(b => {
                    const marcaEstilo = getMarcaStyle(b);
                    return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        setFiltroMarca(b);
                        setFiltroTiempo("TODAS");
                        setFiltroEstado("TODOS");
                        setFiltroPrioridad("TODAS");
                        setFiltroPersona("TODAS");
                        setSearchQuery("");
                        setDashboardMobileVista("lista");
                        navegarA("dashboard");
                      }}
                      className={`robin-sidebar__link ${marcasCoinciden(filtroMarca, b) && paginaActiva === "dashboard" ? "is-active" : ""}`}
                    >
                      <span
                        className="robin-sidebar__marca-dot"
                        style={{ backgroundColor: marcaEstilo.accent }}
                        aria-hidden="true"
                      />
                      <span className="robin-sidebar__link-label" title={formatearMarca(b)}>{formatearMarca(b)}</span>
                    </button>
                    );
                  })}
                </div>
              )}
            </div>

            {!isDesigner && (
            <div className="robin-sidebar__section">
              <span className="robin-sidebar__section-title">Más opciones</span>
              <div className="robin-sidebar__tile-grid" data-induccion="estatus-equipos">
                <button
                  type="button"
                  onClick={() => setShowGeneradorEstatus(true)}
                  className={`robin-sidebar__tile ${showGeneradorEstatus ? "is-active" : ""}`}
                >
                  <SVGIcon.Phone />
                  <span>Estatus</span>
                </button>
                <button
                  type="button"
                  onClick={() => navegarA("informes")}
                  className={`robin-sidebar__tile ${paginaActiva === "informes" ? "is-active" : ""}`}
                >
                  <i className="fa-solid fa-chart-pie" style={{ fontSize: "0.85rem", opacity: 0.85 }} aria-hidden="true" />
                  <span>Informes</span>
                </button>
                <button
                  type="button"
                  onClick={() => navegarA("equipos")}
                  className={`robin-sidebar__tile ${paginaActiva === "equipos" ? "is-active" : ""}`}
                >
                  <SVGIcon.Users className="w-3.5 h-3.5 opacity-75" />
                  <span>Equipos</span>
                </button>
              </div>
            </div>
            )}

            {!isConfigOnlyAdmin && (
            <div className="robin-sidebar__section">
              <button
                type="button"
                onClick={() => navegarA("tmknews")}
                className={`robin-sidebar__news-banner ${paginaActiva === "tmknews" ? "is-active" : ""}`}
              >
                <span className="robin-sidebar__news-banner-icon" aria-hidden="true">
                  <i className="fa-solid fa-newspaper" />
                </span>
                <span className="robin-sidebar__news-banner-copy">
                  <span className="robin-sidebar__news-banner-title">TMK News</span>
                  <span className="robin-sidebar__news-banner-sub">Periódico del equipo</span>
                </span>
                <i className="fa-solid fa-chevron-right robin-sidebar__news-banner-arrow" aria-hidden="true" />
              </button>
            </div>
            )}

            <div className="robin-sidebar__section">
              <span className="robin-sidebar__section-title">Soporte</span>
              <button
                type="button"
                onClick={() => navegarA("configuracion")}
                className={`robin-sidebar__link ${paginaActiva === "configuracion" ? "is-active" : ""}`}
                data-induccion="nav-config"
              >
                <i className="fa-solid fa-sliders robin-sidebar__link-icon"></i>
                <span className="robin-sidebar__link-label">Ajustes</span>
              </button>
            </div>
          </nav>

          <div className="robin-sidebar__footer">
            <button type="button" onClick={handleLogout} className="robin-sidebar__logout">
              Cerrar sesión
            </button>
          </div>
      </aside>
      )}

      {/* CONTENEDOR PRINCIPAL */}
      <main className={`flex-1 flex flex-col overflow-hidden ${currentTheme.bg}`}>
        <header className={`app-header-bar ${currentTheme.bg} px-6 justify-between robin-desktop-only`}>
          <div className="flex items-center gap-3 min-w-0">
            {paginaActiva !== "home" && (
              <h1 className="text-ui font-semibold text-zinc-500">
                Trade & Shopper Marketing{isConfigOnlyAdmin ? " · Admin" : isDesigner ? " · Diseño" : ""}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-3">
            {campanaNotificaciones}

            <button
              type="button"
              onClick={handleSyncClick}
              data-induccion="sync"
              className={`flex items-center gap-2 rounded border px-2 py-1.5 transition-all ${
                syncDetalleVisible
                  ? "border-zinc-400 bg-zinc-100 ring-2 ring-zinc-200"
                  : syncing
                  ? "border-blue-200 bg-blue-50"
                  : apiError
                    ? "border-red-200 bg-red-50"
                    : hayPendientesLocales
                      ? "border-amber-200 bg-amber-50"
                      : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
              }`}
              title="Estado de sincronización"
            >
              {syncing ? (
                <i className="fa-solid fa-cloud-arrow-up text-blue-500 animate-pulse text-sm" />
              ) : apiError ? (
                <i className="fa-solid fa-cloud-arrow-down text-red-400 text-sm" />
              ) : hayPendientesLocales ? (
                <i className="fa-solid fa-cloud-arrow-up text-amber-500 text-sm" />
              ) : (
                <i className="fa-solid fa-cloud text-emerald-500 text-sm" />
              )}
            </button>

            <button 
              onClick={() => fetchData(false)}
              disabled={loading}
              className="p-1.5 text-zinc-400 hover:text-zinc-800 border rounded bg-white hover:bg-zinc-50 transition-colors"
              title="Actualizar base de datos"
            >
              <i className="fa-solid fa-arrows-rotate text-xs"></i>
            </button>
          </div>
        </header>

        <PullToRefresh
          onRefresh={() => sincronizarEnSegundoPlano()}
          loading={loading}
          disabled={syncDetalleVisible || isEditing}
          data-robin-content-main
          className={`relative flex-1 overflow-y-auto overflow-x-hidden w-full min-h-0 no-scrollbar ${
          paginaActiva === "agregar"
            ? "robin-mobile-main robin-main-agregar !px-0 lg:!px-8"
            : paginaActiva === "dashboard" && filtroMarca !== "TODAS"
              ? "robin-mobile-main marca-home-main"
              : paginaActiva === "configuracion"
                ? "robin-mobile-main robin-main-config max-w-6xl mx-auto"
                : paginaActiva === "home"
                  ? "robin-mobile-main robin-main-home max-w-6xl mx-auto"
                  : paginaActiva === "informes"
                    ? "robin-mobile-main robin-main-informes !px-0 md:!px-4 max-w-6xl mx-auto"
                  : paginaActiva === "tmknews"
                    ? "robin-mobile-main robin-main-tmknews max-w-3xl mx-auto"
                    : "robin-mobile-main max-w-6xl mx-auto"
        }`}>
          {syncDetalleVisible && (
            typeof ModalPortal === "function"
              ? <ModalPortal>{renderSyncSubpage()}</ModalPortal>
              : renderSyncSubpage()
          )}
          
          {!isConfigOnlyAdmin && paginaActiva === "home" && (
            <LayoutHome
              tareas={tareasVisibles}
              nombreUsuario={nombreCompleto}
              username={usuario}
              onSelectTask={abrirEdicionTarea}
              onUpdateField={isDesigner ? undefined : handleUpdateField}
              widgets={widgets}
              onAbrirEstatus={isDesigner ? undefined : () => setShowGeneradorEstatus(true)}
              onAbrirEquipos={isDesigner ? undefined : () => navegarA("equipos")}
              onAbrirInformes={isDesigner ? undefined : () => navegarA("informes")}
              onVerTodasHoy={() => aplicarAtajoFiltro("hoy")}
              onCrearRapido={isDesigner ? undefined : () => setFormularioRapidoVisible(true)}
              onAtajoFiltro={aplicarAtajoFiltro}
              soloMisTareas={isDesigner}
              currentTheme={currentTheme}
              getMarcaStyle={getMarcaStyle}
              otrosUsuariosEnLinea={otrosUsuariosEnLinea}
              presenceEstado={presenceEstado}
              noticiasTmk={noticiasTmk}
              cargandoNoticiasTmk={cargandoNoticiasTmk}
              onSelectNoticiaTmk={setNoticiaTmkAbierta}
              onAbrirPublicarTmkNews={abrirPanelTmkNews}
              onAbrirTmkNews={() => navegarA("tmknews")}
            />
          )}

          {!isConfigOnlyAdmin && paginaActiva === "tmknews" && (
            <>
              <div className="robin-mobile-only">
                <MobileSubpageBar
                  title="TMK News"
                  onBack={() => navegarA("home")}
                  backLabel="Home"
                />
              </div>
              <LayoutTmkNews
                noticias={noticiasTmkArchivo}
                loading={cargandoNoticiasTmkArchivo}
                onSelectNoticia={setNoticiaTmkAbierta}
                onAbrirPublicar={isDesigner ? undefined : abrirPanelTmkNews}
                theme={theme}
              />
            </>
          )}

          {!isConfigOnlyAdmin && !isDesigner && paginaActiva === "agregar" && (
            <FormularioCrearEntregable
              nuevaTarea={nuevaTarea}
              setNuevaTarea={setNuevaTarea}
              onSubmit={handleCreateTask}
              onCancel={() => setPaginaActiva("home")}
              marcasDisponibles={marcasDisponibles}
              listaPersonas={listaPersonas}
              registrarNuevaPersona={registrarNuevaPersonaGlobal}
              listaCategorias={listaCategorias}
              registrarNuevaCategoria={registrarNuevaCategoriaGlobal}
              listaSubclientes={listaSubclientes}
              registrarNuevoSubcliente={registrarNuevoSubclienteGlobal}
            />
          )}

          {!isConfigOnlyAdmin && paginaActiva === "dashboard" && filtroMarca !== "TODAS" && (
            <LayoutMarcaHome
              marca={filtroMarca}
              tareas={tareasVisibles}
              tareasFiltradas={tareasFiltradas}
              widgets={widgets}
              marcasMetadata={marcasMetadata}
              username={usuario}
              onSelectTask={abrirEdicionTarea}
              onUpdateField={isDesigner ? undefined : handleUpdateField}
              onDeleteTask={isDesigner ? undefined : (t) => setTaskToDelete(t)}
              getMarcaStyle={getMarcaStyle}
              currentTheme={currentTheme}
              vistaModo={vistaModo}
              setVistaModo={setVistaModo}
              listaAgrupacion={listaAgrupacion}
              cambiarListaAgrupacion={cambiarListaAgrupacion}
              filtroEstado={filtroEstado}
              setFiltroEstado={setFiltroEstado}
              filtroPrioridad={filtroPrioridad}
              setFiltroPrioridad={setFiltroPrioridad}
              filtroPersona={filtroPersona}
              setFiltroPersona={setFiltroPersona}
              filtroTiempo={filtroTiempo}
              setFiltroTiempo={setFiltroTiempo}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              listaPersonas={listaPersonas}
              listaSubclientes={listaSubclientes}
              layoutTablaProps={layoutTablaProps}
              dashboardMobileVista={dashboardMobileVista}
              setDashboardMobileVista={setDashboardMobileVista}
              kanbanOrdenPrioridadActivo={kanbanOrdenPrioridadActivo}
              alternarKanbanOrdenPrioridad={alternarKanbanOrdenPrioridad}
              kanbanOrdenPrioridad={kanbanOrdenPrioridad}
              onVerFichaCliente={isDesigner ? undefined : () => {
                setClientesDetalleMarca(filtroMarca);
                navegarA("clientes");
              }}
              onLimpiarFiltros={() => {
                setFiltroTiempo("TODAS");
                setFiltroEstado("TODOS");
                setFiltroPrioridad("TODAS");
                setFiltroPersona("TODAS");
                setSearchQuery("");
              }}
              mostrarEstatusGeneral={typeof marcasCoinciden === "function" ? marcasCoinciden(filtroMarca, "La Santé") : true}
              listaDisenadores={listaDisenadores}
              onEnviarCliente={isDesigner ? undefined : handleEnviarEstatusCliente}
            />
          )}

          {!isConfigOnlyAdmin && paginaActiva === "dashboard" && filtroMarca === "TODAS" && (
            <>
              {/* ── Móvil: lista o subpágina de filtros ── */}
              <div className="robin-mobile-only flex-col gap-3 animate-fade-in">
                {dashboardMobileVista === "filtros" ? (
                  <div className="flex flex-col gap-3">
                    <MobileSubpageBar title="Filtros" onBack={() => setDashboardMobileVista("lista")} backLabel="Lista" />
                    <div className="border border-zinc-200 p-3 rounded-md flex flex-col gap-3 bg-white">
                      <div className="flex flex-col gap-3">
                        <select value={filtroMarca} onChange={(e) => setFiltroMarca(e.target.value)} className="w-full bg-white border border-zinc-200 p-2 text-ui rounded text-zinc-600">
                          <option value="TODAS">Todos los clientes</option>
                          {marcasDisponibles.map(m => (<option key={m} value={m}>{formatearMarca(m)}</option>))}
                        </select>
                        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="w-full bg-white border border-zinc-200 p-2 text-ui rounded text-zinc-600">
                          <option value="TODOS">Todos los estados</option>
                          {obtenerEstadosFiltroLista().map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                        </select>
                        <select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)} className="w-full bg-white border border-zinc-200 p-2 text-ui rounded text-zinc-600">
                          <option value="TODAS">Todas las prioridades</option>
                          {PRIORIDADES_MAPA.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                        </select>
                        <select value={filtroPersona} onChange={(e) => setFiltroPersona(e.target.value)} className="w-full bg-white border border-zinc-200 p-2 text-ui rounded text-zinc-600">
                          <option value="TODAS">Todas las personas</option>
                          {!isDesigner && <option value="SIN_DISENADOR">Sin diseñador asignado</option>}
                          {listaPersonas.map(p => (<option key={claveUnicaPersonaLista(p) || p} value={p}>{etiquetaDisplayListaPersona(p)}</option>))}
                        </select>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 pt-1" data-induccion="dashboard-tiempo">
                        <button onClick={() => setFiltroTiempo("TODAS")} className={`px-2 py-2 rounded text-[10px] font-semibold border ${filtroTiempo === "TODAS" ? "bg-[#37352F] text-white border-zinc-900" : "bg-white border-zinc-200 text-zinc-600"}`}>Todo</button>
                        <button onClick={() => setFiltroTiempo("HOY")} className={`px-2 py-2 rounded text-[10px] font-semibold border ${filtroTiempo === "HOY" ? "bg-blue-600 text-white border-blue-700" : "bg-white border-zinc-200 text-zinc-600"}`}>Hoy{metricaCounters.activasHoy > 0 ? ` (${metricaCounters.activasHoy})` : ""}</button>
                        <button onClick={() => setFiltroTiempo("ATRASADAS")} className={`px-2 py-2 rounded text-[10px] font-semibold border ${filtroTiempo === "ATRASADAS" ? "bg-red-600 text-white border-red-700" : "bg-white border-zinc-200 text-zinc-600"}`}>Atraso{metricaCounters.atrasadas > 0 ? ` (${metricaCounters.atrasadas})` : ""}</button>
                      </div>
                      {filtrosDashboardActivos && (
                        <button
                          type="button"
                          onClick={() => { setFiltroTiempo("TODAS"); setFiltroMarca("TODAS"); setFiltroEstado("TODOS"); setFiltroPrioridad("TODAS"); setFiltroPersona("TODAS"); setSearchQuery(""); }}
                          className="w-full py-2 text-ui-sm font-medium text-zinc-500 border border-zinc-200 rounded-md"
                        >
                          Limpiar filtros
                        </button>
                      )}
                      <button type="button" onClick={() => setDashboardMobileVista("lista")} className="w-full py-2.5 bg-[#37352F] text-white text-ui font-semibold rounded-md">
                        Ver {tareasFiltradas.length} resultados
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mobile-dash-toolbar">
                      <div className="min-w-0">
                        <h2
                          className="text-sm font-bold truncate"
                          style={filtroMarca !== "TODAS" ? { color: getMarcaStyle(filtroMarca).accent } : undefined}
                        >
                          {filtroMarca === "TODAS" ? "Todos los entregables" : formatearMarca(filtroMarca)}
                        </h2>
                        <p className="text-[10px] text-zinc-400">
                          {tareasFiltradas.length} resultado{tareasFiltradas.length !== 1 ? "s" : ""}
                          {filtrosDashboardActivos ? " · filtros activos" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => setDashboardMobileVista("filtros")} className={`mobile-icon-btn ${filtrosDashboardActivos ? "has-badge" : ""}`} title="Filtros" data-induccion="dashboard-filtros-mobile">
                          <i className="fa-solid fa-filter"></i>
                        </button>
                        <div className="flex items-center gap-1" data-induccion="dashboard-vistas-mobile">
                          <button type="button" onClick={() => { setVistaModo("TABLE"); setUserPreference("vistaModo", "TABLE"); }} className={`mobile-icon-btn ${vistaModo === "TABLE" ? "is-active" : ""}`} title="Lista">
                            <i className="fa-solid fa-list"></i>
                          </button>
                          <button type="button" onClick={() => { setVistaModo("KANBAN"); setUserPreference("vistaModo", "KANBAN"); }} className={`mobile-icon-btn ${vistaModo === "KANBAN" ? "is-active" : ""}`} title="Tablero">
                            <i className="fa-solid fa-chart-simple"></i>
                          </button>
                          {vistaModo === "KANBAN" && filtroTiempo === "HOY" && (
                            <button
                              type="button"
                              onClick={alternarKanbanOrdenPrioridad}
                              className="mobile-icon-btn is-active"
                              title={kanbanOrdenPrioridad === "desc" ? "Prioridad: alta → media → baja" : "Prioridad: baja → media → alta"}
                            >
                              <i className={`fa-solid ${kanbanOrdenPrioridad === "desc" ? "fa-arrow-up" : "fa-arrow-down"}`}></i>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <ListaAtajosRapidos
                      tareas={tareasVisibles}
                      username={usuario}
                      onAtajo={aplicarAtajoFiltro}
                      soloMisTareas={isDesigner}
                      filtroActivo={atajoFiltroActivo}
                    />

                    <div className="notion-dash-search" data-induccion="dashboard-buscar">
                      <i className="fa-solid fa-magnifying-glass notion-dash-search-icon" />
                      <input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>

                    {vistaModo === "TABLE" && (
                      <div className="lista-agrupacion-pills">
                        <span className="lista-agrupacion-label">Organizar por</span>
                        <button
                          type="button"
                          onClick={() => cambiarListaAgrupacion("estado")}
                          className={`lista-agrupacion-pill ${listaAgrupacion === "estado" ? "is-active" : ""}`}
                        >
                          Estado
                        </button>
                        <button
                          type="button"
                          onClick={() => cambiarListaAgrupacion("fecha")}
                          className={`lista-agrupacion-pill ${listaAgrupacion === "fecha" ? "is-active" : ""}`}
                        >
                          Fecha
                        </button>
                      </div>
                    )}

                    {vistaModo === "TABLE" ? (
                      <LayoutTablaAgrupada {...layoutTablaProps} />
                    ) : (
                      <LayoutKanban tareas={tareasFiltradas} ordenPrioridad={kanbanOrdenPrioridadActivo} onUpdateField={isDesigner ? undefined : handleUpdateField} onSelectTask={abrirEdicionTarea} onDeleteTask={isDesigner ? undefined : (t) => setTaskToDelete(t)} getMarcaStyle={getMarcaStyle} currentTheme={currentTheme} />
                    )}
                  </>
                )}
              </div>

              {/* ── Desktop: sin cambios ── */}
              <div className="robin-desktop-only flex-col gap-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <h2
                    className="text-lg font-semibold tracking-tight"
                    style={filtroMarca !== "TODAS" ? { color: getMarcaStyle(filtroMarca).accent } : { color: "#37352F" }}
                  >
                    {filtroMarca === "TODAS" ? "Entregables" : formatearMarca(filtroMarca)}
                  </h2>
                  <p className="text-ui-sm text-zinc-400 mt-0.5">
                    {tareasFiltradas.length} activo{tareasFiltradas.length !== 1 ? "s" : ""}
                    {tareasFiltradas.length !== tareasActivasCount ? ` · ${tareasActivasCount} en total` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-0.5" data-induccion="dashboard-vistas">
                  <button onClick={() => { setVistaModo("TABLE"); setUserPreference("vistaModo", "TABLE"); }} className={`px-2.5 py-1 text-ui-sm font-medium rounded transition-colors ${vistaModo === "TABLE" ? "bg-zinc-100 text-zinc-800" : "text-zinc-450 hover:text-zinc-700 hover:bg-zinc-50"}`}>
                    Lista
                  </button>
                  <button onClick={() => { setVistaModo("KANBAN"); setUserPreference("vistaModo", "KANBAN"); }} className={`px-2.5 py-1 text-ui-sm font-medium rounded transition-colors ${vistaModo === "KANBAN" ? "bg-zinc-100 text-zinc-800" : "text-zinc-450 hover:text-zinc-700 hover:bg-zinc-50"}`}>
                    Tablero
                  </button>
                </div>
              </div>

              <div className="notion-dash-toolbar">
                <div className="notion-dash-filters">
                  <div className="notion-dash-search" data-induccion="dashboard-buscar">
                    <i className="fa-solid fa-magnifying-glass notion-dash-search-icon" />
                    <input
                      type="text"
                      placeholder="Buscar entregables..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <select value={filtroMarca} onChange={(e) => setFiltroMarca(e.target.value)} className="notion-filter-select" data-induccion="dashboard-filtros">
                    <option value="TODAS">Cliente</option>
                    {marcasDisponibles.map(m => (<option key={m} value={m}>{formatearMarca(m)}</option>))}
                  </select>
                  <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="notion-filter-select">
                    <option value="TODOS">Estado</option>
                    {obtenerEstadosFiltroLista().map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                  </select>
                  <select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)} className="notion-filter-select">
                    <option value="TODAS">Prioridad</option>
                    {PRIORIDADES_MAPA.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                  </select>
                  <select value={filtroPersona} onChange={(e) => setFiltroPersona(e.target.value)} className="notion-filter-select">
                    <option value="TODAS">Persona</option>
                    {!isDesigner && <option value="SIN_DISENADOR">Sin diseñador</option>}
                    {listaPersonas.map(p => (<option key={claveUnicaPersonaLista(p) || p} value={p}>{etiquetaDisplayListaPersona(p)}</option>))}
                  </select>
                </div>
                <div className="notion-time-pills" data-induccion="dashboard-tiempo">
                  <button type="button" onClick={() => setFiltroTiempo("TODAS")} className={`notion-time-pill ${filtroTiempo === "TODAS" ? "is-active" : ""}`}>Todo</button>
                  <button type="button" onClick={() => setFiltroTiempo("HOY")} className={`notion-time-pill ${filtroTiempo === "HOY" ? "is-active-blue" : ""}`}>Hoy{metricaCounters.activasHoy > 0 ? ` (${metricaCounters.activasHoy})` : ""}</button>
                  <button type="button" onClick={() => setFiltroTiempo("ATRASADAS")} className={`notion-time-pill ${filtroTiempo === "ATRASADAS" ? "is-active-red" : ""}`}>Atrasados{metricaCounters.atrasadas > 0 ? ` (${metricaCounters.atrasadas})` : ""}</button>
                  {!isDesigner && (
                    <button
                      type="button"
                      onClick={() => setFiltroPersona(filtroPersona === "SIN_DISENADOR" ? "TODAS" : "SIN_DISENADOR")}
                      className={`notion-time-pill ${filtroPersona === "SIN_DISENADOR" ? "is-active" : ""}`}
                    >
                      Sin diseñador
                    </button>
                  )}
                  {vistaModo === "KANBAN" && filtroTiempo === "HOY" && (
                    <button
                      type="button"
                      onClick={alternarKanbanOrdenPrioridad}
                      className="notion-time-pill is-active-blue"
                      title={kanbanOrdenPrioridad === "desc" ? "Prioridad: alta → media → baja" : "Prioridad: baja → media → alta"}
                    >
                      <i className={`fa-solid ${kanbanOrdenPrioridad === "desc" ? "fa-arrow-up" : "fa-arrow-down"}`}></i>
                    </button>
                  )}
                </div>
              </div>

              {vistaModo === "TABLE" && (
                <div className="lista-agrupacion-pills lista-agrupacion-pills--desktop">
                  <span className="lista-agrupacion-label">Organizar por</span>
                  <button
                    type="button"
                    onClick={() => cambiarListaAgrupacion("estado")}
                    className={`lista-agrupacion-pill ${listaAgrupacion === "estado" ? "is-active" : ""}`}
                  >
                    Estado
                  </button>
                  <button
                    type="button"
                    onClick={() => cambiarListaAgrupacion("fecha")}
                    className={`lista-agrupacion-pill ${listaAgrupacion === "fecha" ? "is-active" : ""}`}
                  >
                    Fecha
                  </button>
                </div>
              )}

              {vistaModo === "TABLE" ? (
                <LayoutTablaAgrupada {...layoutTablaProps} />
              ) : (
                <LayoutKanban tareas={tareasFiltradas} ordenPrioridad={kanbanOrdenPrioridadActivo} onUpdateField={isDesigner ? undefined : handleUpdateField} onSelectTask={abrirEdicionTarea} onDeleteTask={isDesigner ? undefined : (t) => setTaskToDelete(t)} getMarcaStyle={getMarcaStyle} currentTheme={currentTheme} />
              )}
              </div>
            </>
          )}

          {!isConfigOnlyAdmin && !isDesigner && paginaActiva === "equipos" && (
            <LayoutEquipos
              tareas={tareas}
              usuariosConectados={usuariosConectados}
              listaEjecutivos={listaEjecutivos}
              listaContenido={listaContenido}
              listaDisenadores={listaDisenadores}
              onVerTareasPersona={irATareasPersona}
            />
          )}

          {!isConfigOnlyAdmin && !isDesigner && paginaActiva === "informes" && (
            <LayoutGeneradorInformes
              tareas={tareas}
              marcasDisponibles={marcasDisponibles}
              onBack={() => navegarA("home")}
            />
          )}

          {!isConfigOnlyAdmin && !isDesigner && paginaActiva === "clientes" && (
            <LayoutClientes
              key={clientesReset}
              marcas={marcasDisponibles}
              marcasMetadata={marcasMetadata}
              canEdit={canEditFichas}
              onSaveBrandMetadata={handleSaveBrandMetadata}
              onRegisterBrand={handleCreateBrand}
              onDeleteBrand={handleDeleteBrand}
              onAbrirMarca={handleAbrirMarcaCliente}
              marcaDetalleInicial={clientesDetalleMarca}
              onMarcaDetalleConsumido={() => setClientesDetalleMarca(null)}
            />
          )}

          {paginaActiva === "configuracion" && (
            <>
              <div className="robin-mobile-only flex-col gap-3 animate-fade-in">
                {configSeccion ? (
                  <div className="robin-config-subpage flex flex-col gap-3">
                    <MobileSubpageBar
                      title={tituloConfigSeccion(configSeccion)}
                      onBack={handleConfigSubpageBack}
                      backLabel={configSeccion === "news" && configOrigenSeccion === "home" ? "Home" : "Volver"}
                    />
                    <div className="robin-config-subpage__body">
                      {renderConfigSeccionContenido(configSeccion)}
                    </div>
                  </div>
                ) : (
                  renderConfigMenu("mobile")
                )}
              </div>

              <div className={`robin-desktop-only ${isConfigOnlyAdmin ? "max-w-6xl" : "max-w-5xl"} mx-auto w-full animate-fade-in`}>
                <div className="robin-config-layout">
                  <aside className={`robin-config-sidebar ${currentTheme.cardBg} border ${currentTheme.border} rounded-md p-4`}>
                    <h2 className={`text-sm font-bold mb-3 ${currentTheme.text}`}>Ajustes</h2>
                    {renderConfigMenu("desktop")}
                    <button type="button" onClick={handleLogout} className="robin-config-nav-btn is-danger mt-4 w-full">
                      <span><i className="fa-solid fa-right-from-bracket"></i> Cerrar sesión</span>
                    </button>
                  </aside>
                  <section className={`robin-config-content ${currentTheme.cardBg} border ${currentTheme.border} rounded-md p-6 min-h-[420px]`}>
                    <h2 className={`text-lg font-bold mb-4 ${currentTheme.text}`}>
                      {tituloConfigSeccion(configSeccion)}
                    </h2>
                    {renderConfigSeccionContenido(configSeccion)}
                  </section>
                </div>
              </div>
            </>
          )}

        </PullToRefresh>
      </main>

      {/* BARRA ACCESO RÁPIDO — entregables de hoy (solo Home, desktop md+) */}
      {!isConfigOnlyAdmin && paginaActiva === "home" && (
        <BarraHoyAccesoRapido tareas={tareasVisibles} username={usuario} onSelectTask={abrirEdicionTarea} getMarcaStyle={getMarcaStyle} soloMisTareas={isDesigner} />
      )}

      {!isConfigOnlyAdmin && (
      <MobileNavBar
        paginaActiva={paginaActiva}
        navegarA={navegarA}
        filtroMarca={filtroMarca}
        setFiltroMarca={setFiltroMarca}
        setFiltroTiempo={setFiltroTiempo}
        setFiltroEstado={setFiltroEstado}
        setFiltroPrioridad={setFiltroPrioridad}
        setFiltroPersona={setFiltroPersona}
        usuario={usuario}
        esDisenador={isDesigner}
        syncing={syncing}
        apiError={apiError}
        hayPendientesLocales={hayPendientesLocales}
        syncDetalleVisible={syncDetalleVisible}
        palabraEstadoSync={palabraEstadoSync}
        onSyncClick={handleSyncClick}
        theme={theme}
        notificacionesSlot={campanaNotificaciones}
        onAtajoFiltro={aplicarAtajoFiltro}
        onAbrirEquipos={isDesigner ? undefined : () => navegarA("equipos")}
        onAbrirEstatus={isDesigner ? undefined : () => setShowGeneradorEstatus(true)}
        onAbrirInformes={isDesigner ? undefined : () => navegarA("informes")}
        onCrearRapido={isDesigner ? undefined : () => setFormularioRapidoVisible(true)}
      />
      )}

      {/* MODALES ADICIONALES */}
      {!isConfigOnlyAdmin && isEditing && activeTask && (
        <ModalPortal>
          <ModalEdicionTarea 
            key={getTaskSelectionKey(activeTask)}
            tarea={normalizarTareaCampos(resolverTareaActual(tareas, activeTask))}
            onClose={() => { setIsEditing(false); setActiveTask(null); }}
            onSave={handleSaveTaskModal}
            listaPersonas={listaPersonas}
            registrarNuevaPersona={registrarNuevaPersonaGlobal}
            listaCategorias={listaCategorias}
            registrarNuevaCategoria={registrarNuevaCategoriaGlobal}
            listaSubclientes={listaSubclientes}
            registrarNuevoSubcliente={registrarNuevoSubclienteGlobal}
            marcasDisponibles={marcasDisponibles}
            usuario={usuario}
            nombreUsuario={nombreCompleto}
            onComentarioPublicado={refrescarNotificaciones}
            onToast={showToast}
            soloLectura={false}
            modoDisenador={isDesigner}
            tareas={tareas}
            relacionesTareas={relacionesTareas}
            onRelacionCreada={handleRelacionCreada}
            onAbrirTareaRelacionada={abrirEdicionTarea}
            getMarcaStyle={getMarcaStyle}
          />
        </ModalPortal>
      )}

      {!isConfigOnlyAdmin && !isDesigner && formularioRapidoVisible && (
        <ModalPortal>
          <FormularioRapidoEntregable
            onSubmit={handleCreateTaskRapido}
            onClose={() => setFormularioRapidoVisible(false)}
            marcasDisponibles={marcasDisponibles}
            listaPersonas={listaPersonas}
            registrarNuevaPersona={registrarNuevaPersonaGlobal}
            marcaDefault={filtroMarca !== "TODAS" ? filtroMarca : "La Santé"}
          />
        </ModalPortal>
      )}

      {noticiaTmkAbierta && (
        <ModalTmkNews
          noticia={noticiaTmkAbierta}
          onClose={() => setNoticiaTmkAbierta(null)}
          theme={theme}
        />
      )}

      {!isConfigOnlyAdmin && panelTmkNewsVisible && (
        <ModalPortal>
          <div className="tmk-news-publish-overlay" role="dialog" aria-modal="true" aria-label="Publicar en TMK News">
            <button
              type="button"
              className="tmk-news-publish-backdrop"
              onClick={() => setPanelTmkNewsVisible(false)}
              aria-label="Cerrar"
            />
            <div className={`tmk-news-publish-panel${theme === "midnight" ? " tmk-news-publish-panel--dark" : ""}`}>
              <button
                type="button"
                className="tmk-news-publish-close"
                onClick={() => setPanelTmkNewsVisible(false)}
                aria-label="Cerrar"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
              <div className="tmk-news-publish-scroll">
                <PanelTmkNews
                  usuario={usuario}
                  nombreUsuario={nombreCompleto}
                  currentTheme={currentTheme}
                  theme={theme}
                  onPublicado={() => {
                    cargarNoticiasTmk();
                    cargarNoticiasTmkArchivo();
                    setPanelTmkNewsVisible(false);
                  }}
                  showToast={showToast}
                />
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {!isConfigOnlyAdmin && !isDesigner && paginaActiva === "dashboard" && tareasSeleccionadas.size > 0 && (
        <BarraAccionesMasivas
          count={tareasSeleccionadas.size}
          tareasSeleccionadas={tareasSeleccionadasLista}
          bulkDeadline={bulkDeadline}
          setBulkDeadline={setBulkDeadline}
          onBulkUpdate={handleBulkUpdate}
          onClear={limpiarSeleccionTareas}
        />
      )}

      {!isConfigOnlyAdmin && taskToComplete && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white p-5 rounded-md border border-zinc-300 shadow-md w-full max-w-sm animate-zoom-in flex flex-col gap-4">
            <h4 className="text-xs font-bold uppercase text-zinc-500 tracking-wider border-b pb-2">Marcar como completado</h4>
            <p className="text-xs text-zinc-500 leading-relaxed font-semibold">
              ¿Confirmas que este entregable está completado?
            </p>
            <div className="p-2 bg-zinc-50 border rounded text-[11px] font-mono text-zinc-500 truncate">
              {taskToComplete.info}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setTaskToComplete(null)}
                className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmComplete}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded"
              >
                Completar
              </button>
            </div>
          </div>
        </div>
      )}

      {!isConfigOnlyAdmin && taskToDelete && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white p-5 rounded-md border border-zinc-300 shadow-md w-full max-w-sm animate-zoom-in flex flex-col gap-4">
            <h4 className="text-xs font-bold uppercase text-zinc-500 tracking-wider border-b pb-2">Confirmar Eliminación</h4>
            <p className="text-xs text-zinc-500 leading-relaxed font-semibold">
              ¿Estás seguro de que deseas eliminar este entregable permanentemente de la base de datos?
            </p>
            <div className="p-2 bg-zinc-50 border rounded text-[11px] font-mono text-zinc-500 truncate">
              {taskToDelete.info}
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setTaskToDelete(null)}
                className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleDeleteTask(taskToDelete)}
                className="px-4 py-1.5 bg-red-650 hover:bg-red-500 text-white text-xs font-semibold rounded"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {!isConfigOnlyAdmin && !isDesigner && showGeneradorEstatus && (
        <GeneradorEstatus
          tareas={tareas}
          marcasDisponibles={marcasDisponibles}
          listaPersonas={listaPersonas}
          registrarNuevaPersona={registrarNuevaPersonaGlobal}
          listaSubclientes={listaSubclientes}
          onClose={() => setShowGeneradorEstatus(false)}
        />
      )}

      {!isConfigOnlyAdmin && induccionBienvenidaVisible && (
        <InduccionBienvenida
          visible={induccionBienvenidaVisible}
          nombreCompleto={nombreCompleto}
          username={usuario}
          esDisenador={isDesigner}
          marcas={marcasDisponibles}
          onComenzar={comenzarRecorridoInduccion}
          onOmitir={finalizarInduccion}
        />
      )}

      {!isConfigOnlyAdmin && induccionActiva && pasosInduccionFiltrados.length > 0 && (
        <InduccionTour
          activo={induccionActiva}
          pasos={pasosInduccionFiltrados}
          pasoIndex={induccionPaso}
          onSiguiente={avanzarInduccion}
          onAnterior={retrocederInduccion}
          onSaltar={saltarInduccion}
          onCerrar={finalizarInduccion}
        />
      )}

      {!isConfigOnlyAdmin && induccionActiva && pasosInduccionFiltrados[induccionPaso]?.demoComentarios && (
        <InduccionDemoComentarios />
      )}

    </div>
  );
}
