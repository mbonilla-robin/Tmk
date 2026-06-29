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

  const [listaUsuarios, setListaUsuarios] = useState(() => {
    try {
      const guardados = getLocalStorageItemSafe("robin_lista_usuarios", null);
      return guardados ? JSON.parse(guardados) : getDefaultAllowedUsers();
    } catch (e) {
      return getDefaultAllowedUsers();
    }
  });

  const [nuevoUsuarioInput, setNuevoUsuarioInput] = useState("");

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
  const [hayPendientesLocales, setHayPendientesLocales] = useState(() => hayPendientesSync());
  const syncMutexRef = useRef(false);
  const syncTimerRef = useRef(null);
  const notifIdsConocidosRef = useRef(null);
  const notifPrimeraCargaRef = useRef(true);
  const pushPromptDescartadoRef = useRef(false);
  const pushOpRef = useRef(0);
  const guardandoRef = useRef(false);
  
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
  const [notificaciones, setNotificaciones] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [notifCargando, setNotifCargando] = useState(false);
  const [pushPromptVisible, setPushPromptVisible] = useState(false);
  const [pushActivando, setPushActivando] = useState(false);
  const [pushRegistroPendiente, setPushRegistroPendiente] = useState(false);
  const [pushPaso, setPushPaso] = useState("");
  const [pushError, setPushError] = useState("");
  const [tareasSeleccionadas, setTareasSeleccionadas] = useState(() => new Set());
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
  const [showGeneradorEstatus, setShowGeneradorEstatus] = useState(false);
  const [sidebarMarcasAbierto, setSidebarMarcasAbierto] = useState(true);
  const [sidebarEnLineaAbierto, setSidebarEnLineaAbierto] = useState(true);
  const [prefsReady, setPrefsReady] = useState(() => !getInicialUsuario());

  const [listaPersonas, setListaPersonas] = useState(() => cargarListaPersonas());
  const [listaCategorias, setListaCategorias] = useState(() => cargarListaCategorias());

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

  const [nuevaTarea, setNuevaTarea] = useState(() => crearNuevaTareaVacia());

  // 🚨 UBICACIÓN CORRECTA DE VARIABLES COMPUTADAS Y useMemo (Evita ReferenceError y TDZ)
  const marcasDisponibles = useMemo(() => {
    return obtenerMarcasUnicas([
      ...Object.keys(marcasMetadata),
      ...tareas.map(t => t.marca).filter(Boolean)
    ]);
  }, [tareas, marcasMetadata]);

  const tareasActivasCount = useMemo(() => {
    return tareas.filter(t => cleanEstado(t.estado) !== "completada").length;
  }, [tareas]);

  const tareasFiltradas = useMemo(() => {
    const hoy = new Date();
    const tHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
    
    return tareas.filter(t => {
      const tDeadline = obtenerTiempoFecha(t.deadline);
      const esCompletada = cleanEstado(t.estado) === "completada";
      
      if (filtroTiempo === "HOY") {
        if (!esRelevanteHoyTarea(t, tHoy)) return false;
      } else if (filtroTiempo === "ATRASADAS") {
        const tieneFechaReal = tDeadline !== Infinity;
        const esAtrasada = tieneFechaReal && tDeadline < tHoy;
        if (!esAtrasada || esCompletada) return false;
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
      if (filtroPersona !== "TODAS" && !tareaIncluyePersonaFiltro(t.personas || "", filtroPersona)) return false;

      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        return (
          (t.info || "").toLowerCase().includes(q) ||
          (t.detalles && (t.detalles || "").toLowerCase().includes(q)) ||
          (t.personas && (t.personas || "").toLowerCase().includes(q)) ||
          (t.categoria && (t.categoria || "").toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [tareas, filtroTiempo, filtroMarca, filtroEstado, filtroPrioridad, filtroPersona, searchQuery]);

  const metricaCounters = useMemo(() => {
    const tHoy = obtenerTiempoHoyLocal();
    const entregasHoy = tareas.filter(t => esEntregaHoyTarea(t, tHoy)).length;
    const trabajarHoy = tareas.filter(t => esTrabajarHoyTarea(t, tHoy)).length;
    const activasHoy = entregasHoy + trabajarHoy;

    const atrasadas = tareas.filter(t => {
      const tDeadline = obtenerTiempoFecha(t.deadline);
      return tDeadline !== Infinity && tDeadline < tHoy && cleanEstado(t.estado) !== "completada";
    }).length;
    
    return { activasHoy, entregasHoy, trabajarHoy, atrasadas };
  }, [tareas]);

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

      const idsPrevios = notifIdsConocidosRef.current;
      const esCargaInicial = notifPrimeraCargaRef.current || !idsPrevios;
      if (!esCargaInicial && !soloActualizarUi) {
        await procesarPushNotificacionesNuevas(lista, {
          idsConocidos: idsPrevios,
          esCargaInicial: false
        });
      }

      notifIdsConocidosRef.current = new Set((lista || []).map((n) => n.id).filter(Boolean));
      notifPrimeraCargaRef.current = false;
      setNotificaciones(lista);
      setUnreadNotifCount(count);
    } finally {
      setNotifCargando(false);
    }
  }, [usuario, isConfigOnlyAdmin]);

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
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        registrarPushEnSegundoPlano(usuario).catch(() => {});
      }
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
    const stored = getInicialUsuario();
    if (stored && hasRobinApiSession()) {
      repararColaSyncMarcas();
      repararColaSyncActualizacionesFantasma();
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
    setPaginaActiva(pagina);
    setSyncDetalleVisible(false);
    if (pagina !== "dashboard") {
      limpiarSeleccionTareas();
      setDashboardMobileVista("lista");
    }
    if (pagina !== "configuracion") setConfigSeccion(null);
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
    setTareasSeleccionadas(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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
    if (!nuevoValor && campo !== "deadline") return;
    const keys = tareasSeleccionadas;
    const objetivos = tareas.filter(t => keys.has(getTaskSelectionKey(t)));
    if (!objetivos.length) return;

    const hoy = new Date();
    const timestamp = `${hoy.getDate()}/${hoy.getMonth() + 1} ${hoy.getHours()}:${String(hoy.getMinutes()).padStart(2, '0')}`;
    const valorFinal = normalizarValorCampoTarea(campo, nuevoValor);

    const actualizadas = tareas.map(t => {
      if (!keys.has(getTaskSelectionKey(t))) return t;
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
    const validation = validateLocalLogin(userClean, claveInput, listaUsuarios);
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
    showToast(`Sesión iniciada: @${validation.username}`, "success");
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

  const handleAddUser = (e) => {
    e.preventDefault();
    const nuevo = nuevoUsuarioInput.trim().toLowerCase();
    if (!nuevo) return;
    if (listaUsuarios.includes(nuevo)) {
      showToast("El usuario ya está registrado", "error");
      return;
    }
    const comb = Array.from(new Set([...listaUsuarios, nuevo]));
    setListaUsuarios(comb);
    setLocalStorageItemSafe("robin_lista_usuarios", JSON.stringify(comb));
    registrarNuevaPersonaGlobal("@" + nuevo);
    setNuevoUsuarioInput("");
    showToast("Usuario autorizado", "success");
  };

  const handleRemoveUser = (usernameToRemove) => {
    if (normalizeRobinUsername(usernameToRemove) === "admin") return;
    const filtered = listaUsuarios.filter((item) => item !== usernameToRemove);
    setListaUsuarios(filtered);
    setLocalStorageItemSafe("robin_lista_usuarios", JSON.stringify(filtered));
    showToast("Usuario desautorizado", "info");
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

  useEffect(() => {
    if (!usuario) return;
    let cancelled = false;

    cargarCategoriasRemotas().then((remotas) => {
      if (cancelled || !remotas || !remotas.length) return;
      setListaCategorias(guardarListaCategorias(remotas));
    });

    return () => { cancelled = true; };
  }, [usuario]);

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
          setHayPendientesLocales(!colaVacia);
          if (colaVacia) {
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
        setHayPendientesLocales(cargarColaSync().length > 0);
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
            await new Promise((resolve) => setTimeout(resolve, 600));
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
        setHayPendientesLocales(cargarColaSync().length > 0);
      }
    }, 350);
  };

  const handleUpdateField = async (tarea, campo, nuevoValor) => {
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

    const campoSync = (campo === "estado" || campo === "deadline" || campo === "prioridad" || campo === "fechaInicio") ? campo : "todo";
    encolarSync({
      type: "update",
      taskKey: getTaskSelectionKey(actualizada),
      taskKeyOriginal,
      payload: construirPayloadSyncTarea(original, actualizada, { campoSync, valor: valorFinal })
    });
    setHayPendientesLocales(true);
    sincronizarEnSegundoPlano();
  };

  const handleConfirmComplete = async () => {
    if (!taskToComplete) return;
    const tarea = taskToComplete;
    setTaskToComplete(null);
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
    if (!usuario || isConfigOnlyAdmin) return undefined;
    precalentarPushServiceWorker();
  }, [usuario, isConfigOnlyAdmin]);

  useEffect(() => {
    if (!usuario || isConfigOnlyAdmin) return undefined;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") {
      setPushRegistroPendiente(false);
      return undefined;
    }

    let cancelado = false;

    registrarPushEnSegundoPlano(usuario).then((resultado) => {
      if (resultado?.ok) marcarRegistroPushCompleto(usuario);
    }).catch(() => {});

    evaluarBannerRegistroPush(usuario).then((evaluacion) => {
      if (cancelado) return;
      setPushRegistroPendiente(evaluacion.mostrar === true);
    }).catch(() => {});

    return () => { cancelado = true; };
  }, [usuario, isConfigOnlyAdmin]);

  useEffect(() => {
    pushPromptDescartadoRef.current = Boolean(usuario && pushPromptYaAtendido(usuario));
  }, [usuario]);

  useEffect(() => {
    if (!usuario || isConfigOnlyAdmin) return undefined;
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      setPushPromptVisible(false);
      registrarPushEnSegundoPlano(usuario).catch(() => {});
      return undefined;
    }

    let cancelado = false;

    (async () => {
      if (pushPromptDescartadoRef.current || pushPromptYaAtendido(usuario)) return;

      const resultado = await inicializarPushNotificaciones(usuario);
      if (cancelado || pushPromptDescartadoRef.current || pushPromptYaAtendido(usuario)) return;
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        setPushPromptVisible(false);
        return;
      }

      if (resultado?.ok || resultado?.reason === "denied") {
        setPushPromptVisible(false);
        return;
      }

      if (resultado?.reason === "needs_prompt" && esEntornoPushMovil()) {
        setPushPromptVisible(true);
      }
    })();

    return () => { cancelado = true; };
  }, [usuario, isConfigOnlyAdmin]);


  const cerrarPushPrompt = useCallback(() => {
    pushPromptDescartadoRef.current = true;
    if (usuario) marcarPushPromptAtendido(usuario);
    setPushPromptVisible(false);
  }, [usuario]);


  useEffect(() => {
    if (!usuario || isConfigOnlyAdmin) return undefined;
    return registrarListenersPush({
      onAbrirTarea: abrirTareaPorKey,
      onPushRecibido: () => {
        refrescarNotificaciones({ soloActualizarUi: true });
      }
    });
  }, [usuario, isConfigOnlyAdmin, tareas, refrescarNotificaciones]);

  useEffect(() => {
    if (!usuario || !tareas.length) return;
    const taskKey = leerTaskKeyDesdeUrl();
    if (!taskKey) return;
    abrirTareaPorKey(taskKey);
    limpiarTaskKeyEnUrl();
  }, [usuario, tareas]);

  const handleActivarPush = async () => {
    if (!usuario || isConfigOnlyAdmin || pushActivando) return;

    if (typeof Notification === "undefined") {
      setPushError("Este navegador no soporta notificaciones");
      showToast("Este navegador no soporta notificaciones", "error");
      cerrarPushPrompt();
      return;
    }

    if (pushRequierePwaInstalada()) {
      const msg = mensajeErrorPush("needs_pwa");
      setPushError(msg);
      showToast(msg, "error");
      return;
    }

    if (Notification.permission === "denied") {
      const msg = mensajeErrorPush("denied");
      setPushError(msg);
      showToast(msg, "error");
      cerrarPushPrompt();
      return;
    }

    setPushActivando(true);
    setPushError("");
    setPushPaso("Iniciando…");

    const opId = pushOpRef.current + 1;
    pushOpRef.current = opId;

    const safetyTimer = setTimeout(() => {
      if (pushOpRef.current !== opId) return;
      setPushActivando(false);
      setPushPaso("");
      const msg = mensajeErrorPush("timeout");
      setPushError(msg);
      showToast(msg, "error");
    }, 18000);

    try {
      if (Notification.permission === "default") {
        setPushPaso("Pidiendo permiso…");
        const permiso = await Notification.requestPermission();
        if (permiso !== "granted") {
          const msg = mensajeErrorPush("denied");
          setPushError(msg);
          showToast(msg, "error");
          cerrarPushPrompt();
          return;
        }
      }

      const resultado = await registrarPushConPaso(usuario, setPushPaso);

      if (resultado.ok) {
        setPushRegistroPendiente(false);
        setPushError("");
        cerrarPushPrompt();
        const prueba = await enviarPushPruebaUsuario(usuario);
        if (prueba.via === "remote" && prueba.ok) {
          marcarRegistroPushCompleto(usuario);
          showToast("Notificaciones activadas en este dispositivo", "success");
        } else if (prueba.via === "local") {
          marcarRegistroPushCompleto(usuario);
          showToast("Registrado. Cierra ROBIN y pide una mención para probar en segundo plano.", "info");
        } else {
          limpiarRegistroPushCompleto(usuario);
          setPushRegistroPendiente(true);
          const detalle = prueba.detalle ? `: ${prueba.detalle}` : "";
          const msg = `Registro guardado, pero Apple rechazó la prueba${detalle}. Toca Registrar de nuevo.`;
          setPushError(msg);
          showToast(msg, "error");
        }
        return;
      }

      const msg = mensajeErrorPush(resultado.reason);
      setPushRegistroPendiente(true);
      setPushError(resultado.detail ? `${msg} (${resultado.detail})` : msg);
      showToast(msg, "error");
      if (typeof registrarDiagnosticoRobin === "function") {
        registrarDiagnosticoRobin("push", "Activación fallida", resultado.detail || resultado.reason || "");
      }
    } catch (e) {
      const msg = mensajeErrorPush("timeout");
      setPushError(String(e?.message || msg));
      showToast(msg, "error");
    } finally {
      clearTimeout(safetyTimer);
      if (pushOpRef.current === opId) {
        setPushActivando(false);
        setPushPaso("");
      }
    }
  };

  const handleOmitirPush = () => {
    cerrarPushPrompt();
  };

  const layoutTablaProps = {
    tareas: tareasFiltradas,
    onUpdateField: handleUpdateField,
    onSelectTask: abrirEdicionTarea,
    onDeleteTask: (t) => setTaskToDelete(t),
    onSolicitarCompletar: (t) => setTaskToComplete(t),
    getMarcaStyle,
    currentTheme,
    modoAgrupacion: listaAgrupacion,
    tareasSeleccionadas,
    onToggleSeleccion: toggleSeleccionTarea,
    onToggleSeleccionGrupo: (lista, seleccionar) => {
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

      const hoy = new Date();
      const timestamp = `${hoy.getDate()}/${hoy.getMonth() + 1} ${hoy.getHours()}:${String(hoy.getMinutes()).padStart(2, '0')}`;
      let detallesAudoria = editedTask.detalles || "";
      const cambios = [];
      if (original.info !== editedTask.info && tituloLimpioTarea(original) !== tituloLimpioTarea(editedTask)) cambios.push("título");
      if (original.categoria !== editedTask.categoria) cambios.push("categoría");
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

      persistTareas((prev) => [nuevaConId, ...prev]);

      const taskKey = getTaskSelectionKey(nuevaConId);
      encolarSync({
        type: "create",
        taskKey,
        payload: construirPayloadSyncTarea(nuevaConId, nuevaConId, { esNuevo: true, campoSync: "todo" })
      });
      setHayPendientesLocales(true);
      notificarAsignacionTarea(nuevaConId, usuario).then(() => refrescarNotificaciones());

      setNuevaTarea(crearNuevaTareaVacia());
      setPaginaActiva("dashboard");
      showToast("Entregable creado", "success");
      sincronizarEnSegundoPlano();
    } finally {
      setTimeout(() => { guardandoRef.current = false; }, 250);
    }
  };

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
    />
  ) : null;

  const tituloConfigSeccion = (seccion) => ({
    perfil: "Perfil",
    tema: "Tema",
    logo: "Icono del teléfono",
    api: "Base de datos",
    usuarios: "Usuarios",
    widgets: "Enlaces",
    clientes: "Fichas clientes"
  }[seccion] || "Ajustes");

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

    if (seccion === "tema") {
      return (
        <div className="grid grid-cols-2 gap-2 max-w-md">
          <button type="button" onClick={() => handleThemeChange("notion")} className={`${themePickerBtnClass(theme, "notion")} theme-picker-btn--compact`}>Claro</button>
          <button type="button" onClick={() => handleThemeChange("midnight")} className={`${themePickerBtnClass(theme, "midnight")} theme-picker-btn--compact`}>Oscuro</button>
        </div>
      );
    }

    if (seccion === "logo") {
      return (
        <div className="flex flex-col gap-2 max-w-lg">
          <p className={`text-[11px] ${currentTheme.mutedText}`}>Color del icono al instalar la app en el teléfono. El logo del encabezado no cambia.</p>
          <div className="grid grid-cols-3 gap-2">
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
        </div>
      );
    }

    if (seccion === "api") return renderPanelDiagnosticoApi();

    if (seccion === "usuarios") {
      return isAdmin ? (
        <div className={`${currentTheme.cardBg} border ${currentTheme.border} p-3 rounded-md flex flex-col gap-3 max-w-xl`}>
          <form onSubmit={handleAddUser} className="flex gap-2">
            <input type="text" placeholder="Usuario (ej: ralvarez)" value={nuevoUsuarioInput} onChange={(e) => setNuevoUsuarioInput(e.target.value)} className="flex-1 bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm rounded font-semibold" />
            <button type="submit" className="px-3 py-2 bg-[#37352F] text-white text-ui font-semibold rounded-md">+</button>
          </form>
          <div className="flex flex-wrap gap-1.5">
            {listaUsuarios.map((u) => (
              <span key={u} className="inline-flex items-center gap-1 bg-zinc-50 border border-zinc-200 text-zinc-800 text-[11px] font-semibold px-2 py-1 rounded-full">
                @{u}
                {u !== "admin" && (
                  <button type="button" onClick={() => handleRemoveUser(u)} className="text-zinc-400 font-bold">&times;</button>
                )}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-ui-sm text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-md p-3 max-w-xl">Solo administradores.</p>
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
        onClick={() => setConfigSeccion(seccion)}
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
        <Item seccion="tema" icon="fa-palette" label="Tema" />
        <Item seccion="logo" icon="fa-mobile-screen" label="Icono del teléfono" />
        <Item seccion="api" icon="fa-database" label="Base de datos" />
        {(isAdmin || !isConfigOnlyAdmin) && <Item seccion="usuarios" icon="fa-users" label="Usuarios" />}
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
            onClick={() => fetchData(false)}
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
      mensaje = colaPendiente === 1
        ? "Hay 1 cambio esperando subirse a Google Sheets."
        : `Hay ${colaPendiente} cambios esperando subirse a Google Sheets.`;
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
    <div className={`flex h-screen w-screen overflow-hidden ${currentTheme.bg} ${currentTheme.text} select-none transition-all`}>
      
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
            <div className="robin-sidebar__presence">
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

            <button type="button" onClick={() => navegarA("agregar")} className="robin-sidebar__cta">
              <SVGIcon.Plus />
              <span>Añadir entregable</span>
            </button>
          </div>

          <nav className="robin-sidebar__body no-scrollbar" aria-label="Menú lateral">
            <div className="robin-sidebar__section">
              <span className="robin-sidebar__section-title">Navegación</span>
              <div className="robin-sidebar__tile-grid">
                <button
                  type="button"
                  onClick={() => navegarA("home")}
                  className={`robin-sidebar__tile ${paginaActiva === "home" ? "is-active" : ""}`}
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
              >
                <span className="text-section">Marcas</span>
                {marcasDisponibles.length > 0 && (
                  <span className="text-[9px] text-zinc-400 ml-1">({marcasDisponibles.length})</span>
                )}
                <i className={`fa-solid fa-chevron-down text-[8px] text-zinc-400 ml-auto transition-transform duration-150 ${sidebarMarcasAbierto ? "rotate-180" : ""}`}></i>
              </button>
              {sidebarMarcasAbierto && (
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => navegarA("clientes")}
                    className={`robin-sidebar__link ${paginaActiva === "clientes" ? "is-active" : ""}`}
                  >
                    <i className="fa-solid fa-layer-group robin-sidebar__link-icon"></i>
                    <span className="robin-sidebar__link-label">Todos los clientes</span>
                  </button>
                  {marcasDisponibles.map(b => {
                    const marcaEstilo = getMarcaStyle(b);
                    return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => { setFiltroMarca(b); setFiltroTiempo("TODAS"); navegarA("dashboard"); }}
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

            <div className="robin-sidebar__section">
              <span className="robin-sidebar__section-title">Más opciones</span>
              <div className="robin-sidebar__tile-grid">
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
                  onClick={() => navegarA("equipos")}
                  className={`robin-sidebar__tile ${paginaActiva === "equipos" ? "is-active" : ""}`}
                >
                  <SVGIcon.Users className="w-3.5 h-3.5 opacity-75" />
                  <span>Equipos</span>
                </button>
              </div>
            </div>

            <div className="robin-sidebar__section">
              <span className="robin-sidebar__section-title">Soporte</span>
              <button
                type="button"
                onClick={() => navegarA("configuracion")}
                className={`robin-sidebar__link ${paginaActiva === "configuracion" ? "is-active" : ""}`}
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
          <div className="flex items-center gap-3">
            <h1 className="text-ui font-semibold text-zinc-500">
              Trade & Shopper Marketing{isConfigOnlyAdmin ? " · Admin" : ""}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {campanaNotificaciones}

            <button
              type="button"
              onClick={handleSyncClick}
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

        <div
          data-robin-content-main
          className={`relative flex-1 overflow-y-auto overflow-x-hidden w-full min-h-0 no-scrollbar ${
          paginaActiva === "agregar"
            ? "robin-mobile-main robin-main-agregar !px-0 lg:!px-8"
            : paginaActiva === "dashboard" && filtroMarca !== "TODAS"
              ? "robin-mobile-main marca-home-main"
              : "robin-mobile-main max-w-6xl mx-auto"
        }`}>
          {syncDetalleVisible && renderSyncSubpage()}
          
          {!isConfigOnlyAdmin && paginaActiva === "home" && (
            <LayoutHome
              tareas={tareas}
              nombreUsuario={nombreCompleto}
              username={usuario}
              onSelectTask={abrirEdicionTarea}
              onUpdateField={handleUpdateField}
              widgets={widgets}
              onAbrirEstatus={() => setShowGeneradorEstatus(true)}
              onAbrirEquipos={() => navegarA("equipos")}
              currentTheme={currentTheme}
              getMarcaStyle={getMarcaStyle}
              otrosUsuariosEnLinea={otrosUsuariosEnLinea}
              presenceEstado={presenceEstado}
            />
          )}

          {!isConfigOnlyAdmin && paginaActiva === "agregar" && (
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
            />
          )}

          {!isConfigOnlyAdmin && paginaActiva === "dashboard" && filtroMarca !== "TODAS" && (
            <LayoutMarcaHome
              marca={filtroMarca}
              tareas={tareas}
              tareasFiltradas={tareasFiltradas}
              widgets={widgets}
              marcasMetadata={marcasMetadata}
              username={usuario}
              onSelectTask={abrirEdicionTarea}
              onUpdateField={handleUpdateField}
              onDeleteTask={(t) => setTaskToDelete(t)}
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
              layoutTablaProps={layoutTablaProps}
              dashboardMobileVista={dashboardMobileVista}
              setDashboardMobileVista={setDashboardMobileVista}
              kanbanOrdenPrioridadActivo={kanbanOrdenPrioridadActivo}
              alternarKanbanOrdenPrioridad={alternarKanbanOrdenPrioridad}
              kanbanOrdenPrioridad={kanbanOrdenPrioridad}
              onVerFichaCliente={() => navegarA("clientes")}
              onLimpiarFiltros={() => {
                setFiltroTiempo("TODAS");
                setFiltroEstado("TODOS");
                setFiltroPrioridad("TODAS");
                setFiltroPersona("TODAS");
                setSearchQuery("");
              }}
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
                          {LISTA_ESTADOS_VALIDOS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                        </select>
                        <select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)} className="w-full bg-white border border-zinc-200 p-2 text-ui rounded text-zinc-600">
                          <option value="TODAS">Todas las prioridades</option>
                          {PRIORIDADES_MAPA.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                        </select>
                        <select value={filtroPersona} onChange={(e) => setFiltroPersona(e.target.value)} className="w-full bg-white border border-zinc-200 p-2 text-ui rounded text-zinc-600">
                          <option value="TODAS">Todas las personas</option>
                          {listaPersonas.map(p => (<option key={p} value={p}>{p}</option>))}
                        </select>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
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
                        <button type="button" onClick={() => setDashboardMobileVista("filtros")} className={`mobile-icon-btn ${filtrosDashboardActivos ? "has-badge" : ""}`} title="Filtros">
                          <i className="fa-solid fa-filter"></i>
                        </button>
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

                    <div className="notion-dash-search">
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
                      <LayoutKanban tareas={tareasFiltradas} ordenPrioridad={kanbanOrdenPrioridadActivo} onUpdateField={handleUpdateField} onSelectTask={abrirEdicionTarea} onDeleteTask={(t) => setTaskToDelete(t)} getMarcaStyle={getMarcaStyle} currentTheme={currentTheme} />
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

                <div className="flex items-center gap-0.5">
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
                  <div className="notion-dash-search">
                    <i className="fa-solid fa-magnifying-glass notion-dash-search-icon" />
                    <input
                      type="text"
                      placeholder="Buscar entregables..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <select value={filtroMarca} onChange={(e) => setFiltroMarca(e.target.value)} className="notion-filter-select">
                    <option value="TODAS">Cliente</option>
                    {marcasDisponibles.map(m => (<option key={m} value={m}>{formatearMarca(m)}</option>))}
                  </select>
                  <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="notion-filter-select">
                    <option value="TODOS">Estado</option>
                    {LISTA_ESTADOS_VALIDOS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                  </select>
                  <select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)} className="notion-filter-select">
                    <option value="TODAS">Prioridad</option>
                    {PRIORIDADES_MAPA.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                  </select>
                  <select value={filtroPersona} onChange={(e) => setFiltroPersona(e.target.value)} className="notion-filter-select">
                    <option value="TODAS">Persona</option>
                    {listaPersonas.map(p => (<option key={p} value={p}>{p}</option>))}
                  </select>
                </div>
                <div className="notion-time-pills">
                  <button type="button" onClick={() => setFiltroTiempo("TODAS")} className={`notion-time-pill ${filtroTiempo === "TODAS" ? "is-active" : ""}`}>Todo</button>
                  <button type="button" onClick={() => setFiltroTiempo("HOY")} className={`notion-time-pill ${filtroTiempo === "HOY" ? "is-active-blue" : ""}`}>Hoy{metricaCounters.activasHoy > 0 ? ` (${metricaCounters.activasHoy})` : ""}</button>
                  <button type="button" onClick={() => setFiltroTiempo("ATRASADAS")} className={`notion-time-pill ${filtroTiempo === "ATRASADAS" ? "is-active-red" : ""}`}>Atrasados{metricaCounters.atrasadas > 0 ? ` (${metricaCounters.atrasadas})` : ""}</button>
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
                <LayoutKanban tareas={tareasFiltradas} ordenPrioridad={kanbanOrdenPrioridadActivo} onUpdateField={handleUpdateField} onSelectTask={abrirEdicionTarea} onDeleteTask={(t) => setTaskToDelete(t)} getMarcaStyle={getMarcaStyle} currentTheme={currentTheme} />
              )}
              </div>
            </>
          )}

          {!isConfigOnlyAdmin && paginaActiva === "equipos" && (
            <LayoutEquipos
              tareas={tareas}
              usuariosConectados={usuariosConectados}
              onVerTareasPersona={irATareasPersona}
            />
          )}

          {!isConfigOnlyAdmin && paginaActiva === "clientes" && (
            <LayoutClientes
              key={clientesReset}
              marcas={marcasDisponibles}
              marcasMetadata={marcasMetadata}
              canEdit={canEditFichas}
              onSaveBrandMetadata={handleSaveBrandMetadata}
              onRegisterBrand={handleCreateBrand}
              onDeleteBrand={handleDeleteBrand}
            />
          )}

          {paginaActiva === "configuracion" && (
            <>
              <div className="robin-mobile-only flex-col gap-3 animate-fade-in">
                {configSeccion ? (
                  <div className="flex flex-col gap-3">
                    <MobileSubpageBar
                      title={tituloConfigSeccion(configSeccion)}
                      onBack={() => setConfigSeccion(null)}
                    />
                    {renderConfigSeccionContenido(configSeccion)}
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

        </div>
      </main>

      {/* BARRA ACCESO RÁPIDO — entregables de hoy (solo Home, desktop md+) */}
      {!isConfigOnlyAdmin && paginaActiva === "home" && (
        <BarraHoyAccesoRapido tareas={tareas} username={usuario} onSelectTask={abrirEdicionTarea} getMarcaStyle={getMarcaStyle} />
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
        syncing={syncing}
        apiError={apiError}
        hayPendientesLocales={hayPendientesLocales}
        syncDetalleVisible={syncDetalleVisible}
        palabraEstadoSync={palabraEstadoSync}
        onSyncClick={handleSyncClick}
        onRefresh={() => fetchData(false)}
        loading={loading}
        theme={theme}
        notificacionesSlot={campanaNotificaciones}
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
            marcasDisponibles={marcasDisponibles}
            usuario={usuario}
            nombreUsuario={nombreCompleto}
            onComentarioPublicado={refrescarNotificaciones}
            onToast={showToast}
          />
        </ModalPortal>
      )}

      {!isConfigOnlyAdmin && paginaActiva === "dashboard" && tareasSeleccionadas.size > 0 && (
        <BarraAccionesMasivas
          count={tareasSeleccionadas.size}
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

      {!isConfigOnlyAdmin && showGeneradorEstatus && (
        <GeneradorEstatus
          tareas={tareas}
          marcasDisponibles={marcasDisponibles}
          listaPersonas={listaPersonas}
          registrarNuevaPersona={registrarNuevaPersonaGlobal}
          onClose={() => setShowGeneradorEstatus(false)}
        />
      )}

      {!isConfigOnlyAdmin && pushRegistroPendiente && esEntornoPushMovil() && typeof Notification !== "undefined" && Notification.permission === "granted" && (
        <div className="robin-float-above-chrome robin-push-prompt p-4 rounded-lg border border-amber-200 bg-amber-50 shadow-lg animate-zoom-in">
          <p className="text-sm font-semibold text-zinc-800 mb-1">Actualiza las notificaciones push</p>
          <p className="text-xs text-zinc-600 leading-relaxed mb-3">
            Hay una nueva versión del registro push. Pulsa abajo para que las alertas lleguen fuera de la app.
          </p>
          {pushPaso && (
            <p className="text-xs text-amber-800 mb-2">{pushPaso}</p>
          )}
          {pushError && (
            <p className="text-xs text-red-600 mb-2 leading-relaxed">{pushError}</p>
          )}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                if (usuario) descartarBannerRegistroPush(usuario);
                setPushRegistroPendiente(false);
                setPushError("");
              }}
              disabled={pushActivando}
              className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 disabled:opacity-50"
            >
              Después
            </button>
            <button
              type="button"
              onClick={handleActivarPush}
              disabled={pushActivando}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {pushActivando ? (pushPaso || "Registrando…") : "Registrar dispositivo"}
            </button>
          </div>
        </div>
      )}

      {!isConfigOnlyAdmin && pushPromptVisible && esEntornoPushMovil() && typeof Notification !== "undefined" && Notification.permission !== "granted" && (
        <div className="robin-float-above-chrome robin-push-prompt p-4 rounded-lg border border-zinc-200 bg-white shadow-lg animate-zoom-in">
          <p className="text-sm font-semibold text-zinc-800 mb-1">Notificaciones en tu teléfono</p>
          <p className="text-xs text-zinc-500 leading-relaxed mb-3">
            Recibe menciones y comentarios aunque no tengas ROBIN abierto.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleOmitirPush}
              className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800"
            >
              Ahora no
            </button>
            <button
              type="button"
              onClick={handleActivarPush}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-zinc-900 text-white hover:bg-zinc-800"
            >
              {pushActivando ? "Activando…" : "Activar"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
