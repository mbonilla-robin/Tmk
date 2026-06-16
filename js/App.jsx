function App() {
  const [usuario, setUsuario] = useState(() => getInicialUsuario());
  const [initialPrefs] = useState(() => {
    try {
      return getInitialUserPrefs(getInicialUsuario());
    } catch (e) {
      console.error("ROBIN: error cargando preferencias", e);
      return {};
    }
  });

  const [claveInput, setClaveInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const isAdmin = useMemo(() => {
    return usuario === "admin" || usuario === "fcolmenares";
  }, [usuario]);

  const canEditFichas = useMemo(() => usuario === "admin", [usuario]);

  // Comprobación de si es un usuario administrador restrictivo (Solo configuración)
  const isConfigOnlyAdmin = useMemo(() => {
    return usuario === "admin";
  }, [usuario]);

  const [listaUsuarios, setListaUsuarios] = useState(() => {
    try {
      const guardados = getLocalStorageItemSafe("robin_lista_usuarios", null);
      return guardados ? JSON.parse(guardados) : ["fcolmenares", "ralvarez", "dsalavarria", "mbonilla", "gnebrus", "sgiucastro", "admin"];
    } catch(e) {
      return ["fcolmenares", "ralvarez", "dsalavarria", "mbonilla", "gnebrus", "sgiucastro", "admin"];
    }
  });

  const [theme, setTheme] = useState(() => initialPrefs.theme || "notion");
  const currentTheme = useMemo(() => TEMAS[theme] || TEMAS.notion, [theme]);

  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [filtroTiempo, setFiltroTiempo] = useState(() => initialPrefs.filtroTiempo || "TODAS"); 
  const [filtroMarca, setFiltroMarca] = useState(() => initialPrefs.filtroMarca || "TODAS");
  const [filtroEstado, setFiltroEstado] = useState(() => initialPrefs.filtroEstado || "TODOS");
  const [filtroPrioridad, setFiltroPrioridad] = useState(() => initialPrefs.filtroPrioridad || "TODAS"); 
  const [searchQuery, setSearchQuery] = useState(() => initialPrefs.searchQuery || "");
  
  const [paginaActiva, setPaginaActiva] = useState(() =>
    resolvePaginaActivaForUser(getInicialUsuario(), initialPrefs)
  ); 
  const [vistaModo, setVistaModo] = useState(() => initialPrefs.vistaModo || "TABLE"); 

  const [activeTask, setActiveTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [nuevoUsuarioInput, setNuevoUsuarioInput] = useState("");
  const [clientesReset, setClientesReset] = useState(0);
  const [tareasSeleccionadas, setTareasSeleccionadas] = useState(() => new Set());
  const [bulkEstado, setBulkEstado] = useState("");
  const [bulkPrioridad, setBulkPrioridad] = useState("");
  const [bulkDeadline, setBulkDeadline] = useState("");

  const [nombreCompleto, setNombreCompleto] = useState(() => initialPrefs.nombreCompleto || "");

  const [marcasMetadata, setMarcasMetadata] = useState({});
  const [widgets, setWidgets] = useState([]);

  const [usuariosConectados, setUsuariosConectados] = useState([]);
  const [presenceEstado, setPresenceEstado] = useState("idle");

  const [syncDetalleVisible, setSyncDetalleVisible] = useState(false);
  const [dashboardMobileVista, setDashboardMobileVista] = useState(() => initialPrefs.dashboardMobileVista || "lista");
  const [configMobileSeccion, setConfigMobileSeccion] = useState(null);
  const [prefsReady, setPrefsReady] = useState(() => !getInicialUsuario());

  const [listaPersonas, setListaPersonas] = useState(() => {
    try {
      const guardadas = getLocalStorageItemSafe("robin_personas_v2", null);
      if (guardadas) return JSON.parse(guardadas);
    } catch(e) {}
    return ["@fcolmenares", "@ralvarez", "@dsalavarria", "@mbonilla", "@gnebrus", "@sgiucastro"];
  });

  const palabraEstadoSync = useMemo(() => {
    if (!isApiConfigured()) return "Sin API";
    if (loading || syncing) return "Sincronizando";
    if (apiError) return "Error";
    return "Sincronizado";
  }, [loading, syncing, apiError]);

  const filtrosDashboardActivos = useMemo(() => {
    return filtroMarca !== "TODAS" ||
      filtroEstado !== "TODOS" ||
      filtroPrioridad !== "TODAS" ||
      filtroTiempo !== "TODAS" ||
      searchQuery.trim() !== "";
  }, [filtroMarca, filtroEstado, filtroPrioridad, filtroTiempo, searchQuery]);

  const handleSyncClick = () => {
    setSyncDetalleVisible(prev => !prev);
  };

  const [nuevaTarea, setNuevaTarea] = useState({
    marca: "La Santé", categoria: "", info: "", personas: "", detalles: "", estado: "Pendiente", deadline: "", prioridad: "Media"
  });

  // 🚨 UBICACIÓN CORRECTA DE VARIABLES COMPUTADAS Y useMemo (Evita ReferenceError y TDZ)
  const marcasDisponibles = useMemo(() => {
    return obtenerMarcasUnicas([
      ...Object.keys(marcasMetadata),
      ...tareas.map(t => t.marca).filter(Boolean)
    ]);
  }, [tareas, marcasMetadata]);

  const tareasFiltradas = useMemo(() => {
    const hoy = new Date();
    const tHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
    
    return tareas.filter(t => {
      const tDeadline = obtenerTiempoFecha(t.deadline);
      
      if (filtroTiempo === "HOY") {
        const tieneFechaReal = tDeadline !== Infinity;
        const esHoy = tieneFechaReal && tDeadline === tHoy;
        const esCompletada = cleanEstado(t.estado) === "completada";
        if (!esHoy || esCompletada) return false;
      } else if (filtroTiempo === "ATRASADAS") {
        const tieneFechaReal = tDeadline !== Infinity;
        const esAtrasada = tieneFechaReal && tDeadline < tHoy;
        const esCompletada = cleanEstado(t.estado) === "completada";
        if (!esAtrasada || esCompletada) return false;
      } else if (filtroTiempo === "FUTURAS") {
        const esFutura = tDeadline !== Infinity && tDeadline > tHoy;
        if (!esFutura) return false;
      }

      if (filtroMarca !== "TODAS" && !marcasCoinciden(t.marca, filtroMarca)) return false;
      if (filtroEstado !== "TODOS" && cleanEstado(t.estado) !== cleanEstado(filtroEstado)) return false;
      if (filtroPrioridad !== "TODAS" && normalizarPrioridad(t.prioridad) !== normalizarPrioridad(filtroPrioridad)) return false;

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
  }, [tareas, filtroTiempo, filtroMarca, filtroEstado, filtroPrioridad, searchQuery]);

  const metricaCounters = useMemo(() => {
    const hoy = new Date();
    const tHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
    const activasHoy = tareas.filter(t => {
      const tDeadline = obtenerTiempoFecha(t.deadline);
      return tDeadline !== Infinity && tDeadline === tHoy && cleanEstado(t.estado) !== "completada";
    }).length;

    const atrasadas = tareas.filter(t => {
      const tDeadline = obtenerTiempoFecha(t.deadline);
      return tDeadline !== Infinity && tDeadline < tHoy && cleanEstado(t.estado) !== "completada";
    }).length;
    
    return { activasHoy, atrasadas };
  }, [tareas]);

  // getMarcaStyle definido en js/utils/marcas.js
  // =========================================================================

  const otrosUsuariosEnLinea = useMemo(() => {
    const yo = String(usuario || "").replace(/^@/, "").toLowerCase();
    return usuariosConectados.filter(u => String(u.username || "").replace(/^@/, "").toLowerCase() !== yo);
  }, [usuariosConectados, usuario]);

  useEffect(() => {
    if (!usuario) return;

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
      fetchData(true);
    }, 20000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(presencePollInterval);
      setUsuariosConectados([]);
      setPresenceEstado("idle");
    };
  }, [usuario, nombreCompleto]);

  // Redireccionar al admin restrictivo a configuracion
  useEffect(() => {
    if (usuario === "admin" && paginaActiva !== "configuracion") {
      setPaginaActiva("configuracion");
    }
  }, [usuario, paginaActiva]);

  useEffect(() => {
    const u = getLocalStorageItemSafe("robin_usuario_actual", null);
    if (!u) {
      removeLocalStorageItemSafe("robin_usuario_actual");
      setUsuario(null);
    }
  }, []);

  const aplicarPreferenciasUsuario = async (userClean) => {
    const prefs = await mergeAndSyncUserPrefs(userClean);
    applyPrefsToReactState(prefs, {
      setNombreCompleto,
      setTheme,
      setVistaModo,
      setFiltroTiempo,
      setFiltroMarca,
      setFiltroEstado,
      setFiltroPrioridad,
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
        setTheme,
        setVistaModo,
        setFiltroTiempo,
        setFiltroMarca,
        setFiltroEstado,
        setFiltroPrioridad,
        setSearchQuery,
        setDashboardMobileVista,
        setPaginaActiva
      }, usuario);
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
          setTheme,
          setVistaModo,
          setFiltroTiempo,
          setFiltroMarca,
          setFiltroEstado,
          setFiltroPrioridad,
          setSearchQuery,
          setDashboardMobileVista,
          setPaginaActiva
        }, usuario);
      });
    };
    document.addEventListener("visibilitychange", resyncAlVolver);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", resyncAlVolver);
    };
  }, [usuario]);

  useEffect(() => {
    if (!usuario || !prefsReady) return;
    saveUserData(usuario, {
      nombreCompleto,
      theme,
      paginaActiva,
      vistaModo,
      filtroTiempo,
      filtroMarca,
      filtroEstado,
      filtroPrioridad,
      searchQuery,
      dashboardMobileVista
    });
  }, [
    usuario,
    prefsReady,
    nombreCompleto,
    theme,
    paginaActiva,
    vistaModo,
    filtroTiempo,
    filtroMarca,
    filtroEstado,
    filtroPrioridad,
    searchQuery,
    dashboardMobileVista
  ]);

  useEffect(() => {
    if (usuario) {
      fetchData(false);
    }
  }, [usuario]);

  useEffect(() => {
    if (!usuario) return;
    const autoRefreshInterval = setInterval(() => {
      if (!syncing && !loading && !isSubmitting) {
        fetchData(true);
      }
    }, typeof AUTO_SYNC_INTERVAL_MS !== "undefined" ? AUTO_SYNC_INTERVAL_MS : 35000);
    return () => clearInterval(autoRefreshInterval);
  }, [usuario, syncing, loading, isSubmitting]);

  useEffect(() => {
    if (!usuario) return;
    const reconectarAlVolver = () => {
      if (document.visibilityState === "visible" && !syncing && !loading && !isSubmitting) {
        fetchData(true);
      }
    };
    document.addEventListener("visibilitychange", reconectarAlVolver);
    return () => document.removeEventListener("visibilitychange", reconectarAlVolver);
  }, [usuario, syncing, loading, isSubmitting]);

  useEffect(() => {
    if (tareas.length > 0) {
      const detectadas = new Set();
      tareas.forEach(t => {
        if (t.personas) {
          const nombres = t.personas.split(/[\s,]+/);
          nombres.forEach(n => {
            const limpio = n.trim();
            if (limpio.length > 1) {
              const conArroba = limpio.startsWith("@") ? limpio : "@" + limpio;
              detectadas.add(conArroba);
            }
          });
        }
      });
      if (detectadas.size > 0) {
        const combinadas = Array.from(new Set([...listaPersonas, ...detectadas]));
        setLocalStorageItemSafe("robin_personas_v2", JSON.stringify(combinadas));
        setListaPersonas(combinadas);
      }
    }
  }, [tareas]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const navegarA = (pagina, extraFn = null) => {
    // Impedir navegación si es un admin puramente de configuración
    if (isConfigOnlyAdmin && pagina !== "configuracion") {
      setPaginaActiva("configuracion");
      showToast("Función restringida para el administrador de ajustes", "info");
      return;
    }
    setPaginaActiva(pagina);
    if (pagina !== "dashboard") {
      limpiarSeleccionTareas();
      setDashboardMobileVista("lista");
    }
    if (pagina !== "configuracion") setConfigMobileSeccion(null);
    if (pagina === "clientes") setClientesReset(n => n + 1);
    if (extraFn) extraFn();
  };

  const handleAddWidget = async (nuevoWidget) => {
    if (usuario !== "admin") {
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
      await fetch(effectiveUrl, {
        method: "POST", mode: "cors", redirect: "follow",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: JSON.stringify({
          marca: "Config_Marcas",
          idTarea: nuevoWidget.id,
          info: nuevoWidget.titulo,
          detalles: nuevoWidget.link,
          categoria: empaquetarWidgetCategoria(nuevoWidget.seccion, nuevoWidget.icon),
          personas: nuevoWidget.color,
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
    if (usuario !== "admin") {
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
      await fetch(effectiveUrl, {
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
    if (usuario !== "admin") {
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
      await fetch(effectiveUrl, {
        method: "POST", mode: "cors", redirect: "follow",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: JSON.stringify({
          marca: "Config_Marcas",
          idTarea: widgetActualizado.id,
          info: widgetActualizado.titulo,
          detalles: widgetActualizado.link,
          categoria: empaquetarWidgetCategoria(widgetActualizado.seccion, widgetActualizado.icon),
          personas: widgetActualizado.color,
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

  const handleSaveNombreCompleto = (e) => {
    e.preventDefault();
    if (usuario) {
      saveUserData(usuario, { nombreCompleto });
    }
    showToast("Nombre guardado", "success");
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
    setBulkEstado("");
    setBulkPrioridad("");
    setBulkDeadline("");
  };

  const handleBulkUpdate = async (campo, nuevoValor) => {
    if (!nuevoValor && campo !== "deadline") return;
    const keys = tareasSeleccionadas;
    const objetivos = tareas.filter(t => keys.has(getTaskSelectionKey(t)));
    if (!objetivos.length || isSubmitting || syncing) return;

    const hoy = new Date();
    const timestamp = `${hoy.getDate()}/${hoy.getMonth() + 1} ${hoy.getHours()}:${String(hoy.getMinutes()).padStart(2, '0')}`;

    const actualizadas = tareas.map(t => {
      if (!keys.has(getTaskSelectionKey(t))) return t;
      let detalles = t.detalles || "";
      if (campo === "estado") {
        detalles += `\n• [${timestamp}] Estado cambiado a "${nuevoValor}" por @${usuario}`;
      }
      const valorFinal = campo === "prioridad" ? normalizarPrioridad(nuevoValor) : nuevoValor;
      return {
        ...t,
        idTarea: t.idTarea || generateBrandId(t.marca),
        [campo]: valorFinal,
        detalles: campo === "estado" ? detalles : t.detalles
      };
    });
    setTareas(actualizadas);

    const effectiveUrl = getConfiguredApiUrl();
    if (!effectiveUrl || apiError) {
      limpiarSeleccionTareas();
      showToast(`${objetivos.length} entregable(s) actualizado(s) localmente`, "success");
      return;
    }

    setSyncing(true);
    try {
      for (const tarea of objetivos) {
        const actualizada = actualizadas.find(t => getTaskSelectionKey(t) === getTaskSelectionKey(tarea));
        const taskTargetId = actualizada.idTarea;
        await fetch(effectiveUrl, {
          method: "POST", mode: "cors", redirect: "follow",
          headers: { "Content-Type": "text/plain; charset=utf-8" },
          body: JSON.stringify({
            marca: tarea.marca, idTarea: taskTargetId, info: tarea.info, categoria: tarea.categoria,
            campo: "todo", valor: nuevoValor, personas: tarea.personas,
            detalles: actualizada.detalles,
            estado: campo === "estado" ? nuevoValor : tarea.estado,
            deadline: campo === "deadline" ? nuevoValor : tarea.deadline,
            prioridad: campo === "prioridad" ? normalizarPrioridad(nuevoValor) : normalizarPrioridad(tarea.prioridad)
          })
        });
      }
      limpiarSeleccionTareas();
      showToast(`${objetivos.length} entregable(s) actualizado(s)`, "success");
      await fetchData(true);
    } catch (e) {
      showToast("Error al sincronizar cambios masivos", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveBrandMetadata = async (brand, newMeta) => {
    if (!canEditFichas) {
      showToast("Solo el usuario admin puede editar fichas de cliente", "error");
      return;
    }
    const actualizados = { ...marcasMetadata, [formatearMarca(brand)]: normalizarMetadataMarcaEntry(newMeta) };
    setMarcasMetadata(actualizados);
    showToast("Actualizando ficha de cliente...", "info");

    const effectiveUrl = getConfiguredApiUrl();
    if (!isApiConfigured() || apiError) {
      showToast("Ficha guardada localmente", "success");
      return;
    }

    const payloadApi = serializarMetadataParaApi(newMeta);
    setSyncing(true);
    try {
      await fetch(effectiveUrl, {
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
      const res = await fetch(effectiveUrl, {
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
      const res = await fetch(effectiveUrl, {
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
    showToast(`Tema cambiado`, "success");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const userClean = e.target.username.value.trim().toLowerCase();
    if (!listaUsuarios.includes(userClean)) {
      setLoginError("Usuario no autorizado.");
      return;
    }
    if (claveInput.toLowerCase() !== "tmk2026") {
      setLoginError("Contraseña incorrecta.");
      return;
    }
    setUsuario(userClean);
    setLocalStorageItemSafe("robin_usuario_actual", userClean);
    setLoginError("");
    await aplicarPreferenciasUsuario(userClean);
    showToast(`Sesión iniciada: @${userClean}`, "success");
  };

  const handleLogout = async () => {
    if (usuario) {
      saveUserDataLocal(usuario, {
        nombreCompleto,
        theme,
        paginaActiva,
        vistaModo,
        filtroTiempo,
        filtroMarca,
        filtroEstado,
        filtroPrioridad,
        searchQuery,
        dashboardMobileVista
      });
      await flushRemoteUserSettings(usuario);
    }
    try {
      removeLocalStorageItemSafe("robin_usuario_actual");
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

  const registrarNuevaPersonaGlobal = (nombreCompleto) => {
    const formateado = pointerString => pointerString.startsWith("@") ? pointerString.trim() : "@" + pointerString.trim();
    const finalName = formateado(nombreCompleto);
    if (finalName.length > 1 && !listaPersonas.includes(finalName)) {
      const actualizadas = [...listaPersonas, finalName];
      setListaPersonas(actualizadas);
      setLocalStorageItemSafe("robin_personas_v2", JSON.stringify(actualizadas));
    }
  };

  const fetchData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setSyncing(true);
    setApiError(null);

    const effectiveUrl = getConfiguredApiUrl();
    if (!isApiConfigured()) {
      setTareas([]);
      if (!isBackground) showToast("Base de datos no configurada", "info");
      setLoading(false);
      setSyncing(false);
      return;
    }

    const maxIntentos = 3;
    let ultimoError = null;

    for (let intento = 1; intento <= maxIntentos; intento++) {
      try {
        const res = await fetch(effectiveUrl, { method: "GET", mode: "cors", redirect: "follow", cache: "no-store" });
        const json = await res.json();

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

          const tareasValidas = json.data.filter(t => {
            if (!t.info || t.info.toString().trim() === "") return false;
            if (!t.marca || t.marca.toString().trim() === "") return false;
            const cleanId = String(t.idTarea || "").trim().toUpperCase();
            if (cleanId.startsWith("PRESENCE-")) return false;
            const cleanM = t.marca.toString().trim().toLowerCase();
            if (cleanM === "pendiente" || cleanM.includes("progreso") || cleanM.includes("seguimiento") || cleanM.includes("revision") || cleanM.includes("pausa") || cleanM.includes("completada") || cleanM === "config_marcas" || cleanM === "presencia") {
              return false;
            }
            return true;
          });

          const deduplicadas = [];
          const seenKeys = new Set();

          tareasValidas.forEach(t => {
            const cleanId = t.idTarea ? String(t.idTarea).trim() : "";
            const hasRealId = isValidIdTarea(cleanId);
            const realId = hasRealId ? cleanId : generarIdDeterminista(t);
            const key = `${t.marca || ""}|${t.info || ""}|${t.deadline || ""}`.toLowerCase().replace(/\s+/g, " ").trim();
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              deduplicadas.push({
                ...t,
                idTarea: realId,
                prioridad: normalizarPrioridad(t.prioridad || t.Prioridad)
              });
            }
          });

          setTareas(deduplicadas);
          if (json.marcasMetadata) {
            const normalizado = {};
            Object.keys(json.marcasMetadata).forEach(k => {
              normalizado[formatearMarca(k)] = normalizarMetadataMarcaEntry(json.marcasMetadata[k]);
            });
            setMarcasMetadata(normalizado);
          }
          if (!isBackground) showToast("Sincronizado", "success");
          setLoading(false);
          setSyncing(false);
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
    setApiError("Error de Conexión.");
    setTareas([]);
    if (!isBackground) showToast("Error de conexión", "error");
    setLoading(false);
    setSyncing(false);
  };

  const handleUpdateField = async (tarea, campo, nuevoValor) => {
    if (!nuevoValor && nuevoValor !== "") return;
    if (isSubmitting || syncing) return;

    const taskTargetId = tarea.idTarea || generateBrandId(tarea.marca);

    let detallesConHistorial = tarea.detalles || "";
    if (campo === "estado") {
      const hoy = new Date();
      const timestamp = `${hoy.getDate()}/${hoy.getMonth() + 1} ${hoy.getHours()}:${String(hoy.getMinutes()).padStart(2, '0')}`;
      const registro = `\n• [${timestamp}] Estado cambiado a "${nuevoValor}" por @${usuario}`;
      detallesConHistorial = detallesConHistorial + registro;
    }

    const valorFinal = campo === "prioridad" ? normalizarPrioridad(nuevoValor) : nuevoValor;

    const temp = tareas.map(t => {
      if ((t.idTarea === tarea.idTarea && t.idTarea) || t.info === tarea.info) {
        return { 
          ...t, 
          idTarea: taskTargetId,
          [campo]: valorFinal,
          detalles: campo === "estado" ? detallesConHistorial : t.detalles
        };
      }
      return t;
    });
    setTareas(temp);

    const effectiveUrl = getConfiguredApiUrl();
    if (!effectiveUrl || apiError) {
      showToast("Cambio guardado localmente", "success");
      return;
    }

    setSyncing(true);
    try {
      await fetch(effectiveUrl, {
        method: "POST", mode: "cors", redirect: "follow",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: JSON.stringify({
          marca: tarea.marca, idTarea: taskTargetId, info: tarea.info, categoria: tarea.categoria,
          campo: "todo", valor: nuevoValor, personas: tarea.personas, detalles: detallesConHistorial, 
          estado: campo === "estado" ? nuevoValor : tarea.estado,
          deadline: campo === "deadline" ? nuevoValor : tarea.deadline,
          prioridad: campo === "prioridad" ? valorFinal : normalizarPrioridad(tarea.prioridad)
        })
      });
      showToast("Cambios guardados", "success");
      await fetchData(true);
    } catch (e) {
      showToast("Error al sincronizar cambio", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveTaskModal = async (editedTask) => {
    if (isSubmitting || syncing) return;
    setIsSubmitting(true);

    const index = tareas.findIndex(t => (t.idTarea === editedTask.idTarea && t.idTarea) || t.info === editedTask.info);
    if (index === -1) {
      setIsSubmitting(false);
      return;
    }

    const hoy = new Date();
    const timestamp = `${hoy.getDate()}/${hoy.getMonth() + 1} ${hoy.getHours()}:${String(hoy.getMinutes()).padStart(2, '0')}`;
    let detallesAudoria = editedTask.detalles || "";
    
    const original = tareas[index];
    const cambios = [];
    if (original.info !== editedTask.info) cambios.push("título");
    if (original.categoria !== editedTask.categoria) cambios.push("categoría");
    if (original.personas !== editedTask.personas) cambios.push("asignados");
    if (original.estado !== editedTask.estado) cambios.push(`estado a "${editedTask.estado}"`);
    if (original.deadline !== editedTask.deadline) cambios.push("fecha límite");
    const prioridadNormalizada = normalizarPrioridad(editedTask.prioridad);
    if (normalizarPrioridad(original.prioridad) !== prioridadNormalizada) cambios.push("prioridad");

    if (cambios.length > 0) {
      detallesAudoria += `\n• [${timestamp}] Editado (${cambios.join(", ")}) por @${usuario}`;
    }

    const taskConHistorial = { ...editedTask, prioridad: prioridadNormalizada, detalles: detallesAudoria };
    const copiaTareas = [...tareas];
    copiaTareas[index] = taskConHistorial;
    setTareas(copiaTareas);
    setIsEditing(false);
    setActiveTask(null);

    const effectiveUrl = getConfiguredApiUrl();
    if (!effectiveUrl || apiError) {
      showToast("Guardado localmente", "success");
      setIsSubmitting(false);
      return;
    }

    setSyncing(true);
    try {
      await fetch(effectiveUrl, {
        method: "POST", mode: "cors", redirect: "follow",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: JSON.stringify({
          marca: taskConHistorial.marca, idTarea: taskConHistorial.idTarea, info: taskConHistorial.info,
          originalInfo: original.info, categoria: taskConHistorial.categoria, personas: taskConHistorial.personas, 
          detalles: taskConHistorial.detalles, estado: taskConHistorial.estado, deadline: taskConHistorial.deadline, 
          prioridad: normalizarPrioridad(taskConHistorial.prioridad), campo: "todo"
        })
      });
      showToast("Sincronizado", "success");
      await fetchData(true);
    } catch (e) {
      showToast("Guardado local temporal", "error");
    } finally {
      setSyncing(false);
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (tarea) => {
    if (isSubmitting || syncing) return;
    setIsSubmitting(true);

    setTareas(prev => prev.filter(t => !(t.idTarea === tarea.idTarea && t.info === tarea.info)));
    setTaskToDelete(null);
    setIsEditing(false);
    setActiveTask(null);
    showToast("Eliminando...", "info");

    const effectiveUrl = getConfiguredApiUrl();
    if (!effectiveUrl || apiError) {
      showToast("Eliminado localmente", "success");
      setIsSubmitting(false);
      return;
    }

    setSyncing(true);
    try {
      const res = await fetch(effectiveUrl, {
        method: "POST", mode: "cors", redirect: "follow",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: JSON.stringify({
          marca: tarea.marca, idTarea: tarea.idTarea.startsWith("STB-") ? "" : tarea.idTarea, 
          info: tarea.info, categoria: tarea.categoria, campo: "eliminar"
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast("Eliminado", "success");
        await fetchData(true);
      } else {
        showToast("Fallo al eliminar en Sheets", "error");
        await fetchData(true);
      }
    } catch (e) {
      showToast("Fallo de conexión", "error");
      await fetchData(true);
    } finally {
      setSyncing(false);
      setIsSubmitting(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (isSubmitting || syncing) return; 
    
    if (!nuevaTarea.info.trim()) {
      showToast("Ingresa el título del entregable", "error");
      return;
    }

    setIsSubmitting(true);
    const autoId = generateBrandId(nuevaTarea.marca);
    const hoy = new Date();
    const timestamp = `${hoy.getDate()}/${hoy.getMonth() + 1} ${hoy.getHours()}:${String(hoy.getMinutes()).padStart(2, '0')}`;
    const historialInicial = `• [${timestamp}] Creado por @${usuario}`;
    const detallesConCreador = nuevaTarea.detalles 
      ? `${nuevaTarea.detalles.trim()}\n\n${historialInicial}` 
      : historialInicial;

    const nuevaConId = {
      ...nuevaTarea,
      idTarea: autoId,
      prioridad: normalizarPrioridad(nuevaTarea.prioridad),
      detalles: detallesConCreador,
      fecha: new Date().toISOString().split('T')[0]
    };

    setTareas([nuevaConId, ...tareas]);
    showToast("Creando...", "info");

    setNuevaTarea({
      marca: "La Santé", categoria: "", info: "", personas: "", detalles: "", estado: "Pendiente", deadline: "", prioridad: "Media"
    });
    setPaginaActiva("dashboard");

    const effectiveUrl = getConfiguredApiUrl();
    if (!effectiveUrl || apiError) {
      showToast("Creado localmente", "success");
      setIsSubmitting(false);
      return;
    }

    setSyncing(true);
    try {
      const res = await fetch(effectiveUrl, {
        method: "POST", mode: "cors", redirect: "follow",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: JSON.stringify({
          marca: nuevaConId.marca, idTarea: "", info: nuevaConId.info, categoria: nuevaConId.categoria,
          personas: nuevaConId.personas, detalles: nuevaConId.detalles, estado: nuevaConId.estado,
          deadline: nuevaConId.deadline, prioridad: normalizarPrioridad(nuevaConId.prioridad), campo: "todo"
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast("Creado exitosamente", "success");
        await fetchData(true);
      }
    } catch (e) {
      showToast("Guardado local (Sin conexión)", "error");
    } finally {
      setSyncing(false);
      setIsSubmitting(false);
    }
  };

  // UI DE ACCESO EXCLUSIVO
  if (!usuario) {
    return (
      <div className="h-screen w-screen bg-white flex items-center justify-center p-4 select-none animate-fade-in">
        <div className="bg-white border border-zinc-200 shadow-sm rounded-md p-6 md:p-8 w-full max-w-sm flex flex-col gap-6">
          
          <div className="flex flex-col items-center gap-1.5">
            <RobinLogo className="h-8 w-auto" theme="notion" />
            <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mt-1">Workspace Login</span>
          </div>

          {loginError && (
            <div className="p-2.5 bg-red-50 text-red-650 border border-red-100 text-xs font-semibold rounded flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation text-red-550"></i>
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Colaborador (Usuario)</label>
              <input 
                type="text" 
                name="username" 
                required 
                placeholder="Tu usuario..."
                className="w-full bg-zinc-50 border border-zinc-200 p-2.5 text-xs font-semibold rounded focus:outline-none text-[#37352F] placeholder-zinc-400"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Contraseña</label>
              <input 
                type="password" 
                required 
                placeholder="••••••••" 
                value={claveInput}
                onChange={(e) => setClaveInput(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 p-2.5 text-xs rounded focus:outline-none text-[#37352F]"
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-[#37352F] hover:bg-[#2c2a26] text-white font-semibold py-2.5 px-4 rounded text-xs uppercase tracking-wider shadow-sm transition-colors mt-1"
            >
              Acceder
            </button>
          </form>

          <div className="text-center">
            <p className="text-[10px] text-zinc-400 font-semibold leading-relaxed">
              Acceso exclusivo de Trade & Shopper Marketing.<br />
              Socio estratégico de marca ROBIN.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${currentTheme.bg} ${currentTheme.text} select-none transition-all`}>
      
      {toast && (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] right-4 md:bottom-6 md:right-6 z-[40] px-4 py-2.5 rounded shadow text-xs font-semibold flex items-center gap-2 border bg-zinc-900 text-white border-zinc-800 animate-zoom-in">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* MENÚ LATERAL ESTILO NOTION - SOLO DESKTOP (md+); móvil usa MobileNavBar */}
      {!isConfigOnlyAdmin && (
        <aside className={`
          hidden md:flex
          relative inset-y-0 left-0 z-50 w-52 ${currentTheme.sidebarBg} border-r border-zinc-200 flex-col justify-between shrink-0
        `}>
          <div className="flex flex-col h-full justify-between pb-4 overflow-y-auto">
            <div>
              <div className="app-header-bar app-header-bar--sidebar justify-between">
                <div className="flex items-center min-h-0 py-1">
                  <RobinLogo className="h-10 w-auto max-w-[120px]" theme={theme} />
                  <span className="fallback-logo text-xl font-bold text-zinc-900 tracking-tight leading-none" style={{display: 'none'}}>robin</span>
                </div>
              </div>

              <div className="mx-2.5 my-2.5 p-2.5 rounded bg-[#FAF9F6] border border-zinc-200 flex flex-col gap-2">
                <span className="text-section">En línea</span>

                <div className="flex flex-col gap-1.5">
                  {/* Usuario actual — siempre primero */}
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-ui font-semibold truncate text-[#37352F]">@{usuario}</span>
                  </div>

                  {/* Otros usuarios conectados — debajo del tuyo */}
                  {presenceEstado === "ready" && otrosUsuariosEnLinea.map((u, index) => (
                    <div key={u.uid || `user-${index}`} className="flex items-center gap-1.5 pl-0.5 overflow-hidden">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                      <span className="text-ui-sm text-zinc-600 truncate font-medium">
                        {u.nombre || (u.username ? `@${String(u.username).replace(/^@/, "")}` : "Usuario")}
                      </span>
                    </div>
                  ))}

                  {/* Estado / mensaje inferior */}
                  {presenceEstado === "connecting" && (
                    <div className="text-ui-sm text-zinc-400 italic pl-0.5">Conectando...</div>
                  )}
                  {presenceEstado === "error" && (
                    <div className="text-ui-sm text-red-400 italic pl-0.5">Sin conexión</div>
                  )}
                  {presenceEstado === "ready" && otrosUsuariosEnLinea.length === 0 && (
                    <div className="text-ui-sm text-zinc-400 italic pl-0.5">Solo tú</div>
                  )}
                </div>
              </div>

              <div className="px-2.5 pt-1">
                <button 
                  disabled={isSubmitting || syncing}
                  onClick={() => navegarA("agregar")}
                  className="w-full bg-[#37352F] hover:bg-[#2c2a26] text-white font-medium py-1.5 px-3 rounded text-ui transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                >
                  <SVGIcon.Plus />
                  <span>Añadir entregable</span>
                </button>
              </div>

              <nav className="p-2.5 flex flex-col gap-1">
                <span className="px-2 text-section mb-1">Navegación</span>
                
                <button
                  onClick={() => navegarA("home")}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-ui font-medium transition-all ${
                    paginaActiva === "home" ? "bg-white shadow-sm text-zinc-900 border border-zinc-200" : "text-zinc-600 hover:bg-zinc-100/50"
                  }`}
                >
                  <SVGIcon.Home />Home
                </button>

                <button
                  onClick={() => navegarA("dashboard", () => { setFiltroTiempo("TODAS"); setFiltroMarca("TODAS"); setFiltroEstado("TODOS"); setFiltroPrioridad("TODAS"); })}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-ui font-medium transition-all ${
                    paginaActiva === "dashboard" && filtroTiempo === "TODAS" && filtroMarca === "TODAS" && filtroEstado === "TODOS" && filtroPrioridad === "TODAS"
                      ? "bg-white shadow-sm text-zinc-900 border border-zinc-200" : "text-zinc-600 hover:bg-zinc-100/50"
                  }`}
                >
                  <SVGIcon.All />Todos los entregables
                </button>

                <span className="px-2 text-section mb-1 mt-2">Marcas</span>
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => navegarA("clientes")}
                    className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-ui font-medium text-left transition-all ${
                      paginaActiva === "clientes" ? "bg-zinc-200/50 text-[#37352F]" : "text-zinc-600 hover:bg-zinc-100/30"
                    }`}
                  >
                    <i className="fa-solid fa-layer-group text-[10px] text-zinc-400"></i>
                    <span>Todos los clientes</span>
                  </button>
                  {marcasDisponibles.map(b => (
                    <button
                      key={b}
                      onClick={() => { setFiltroMarca(b); setFiltroTiempo("TODAS"); navegarA("dashboard"); }}
                      className={`flex items-center gap-1.5 w-full px-2 py-1.5 rounded text-ui font-medium text-left transition-all ${
                        marcasCoinciden(filtroMarca, b) && paginaActiva === "dashboard" ? "bg-zinc-200/50 text-[#37352F]" : "text-zinc-600 hover:bg-zinc-100/30"
                      }`}
                    >
                      <i className="fa-solid fa-chevron-right text-[8px] text-zinc-400"></i>
                      <span className="truncate">{formatearMarca(b)}</span>
                    </button>
                  ))}
                </div>

                <span className="px-2 text-section mb-1 mt-2">Soporte</span>
                <button
                  onClick={() => navegarA("configuracion")}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-ui font-medium transition-all ${
                    paginaActiva === "configuracion" ? "bg-white shadow-sm text-zinc-900 border border-zinc-200" : "text-zinc-600 hover:bg-zinc-100/50"
                  }`}
                >
                  <i className="fa-solid fa-sliders text-[10px] text-zinc-400"></i>
                  Ajustes
                </button>
              </nav>
            </div>

            <div className="px-3 pt-3">
              <button
                onClick={handleLogout}
                className="w-full text-center py-1.5 text-ui font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* CONTENEDOR PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        <header className={`app-header-bar bg-white px-6 justify-between ${!isConfigOnlyAdmin ? "hidden md:flex" : "flex"}`}>
          <div className="flex items-center gap-3">
            <h1 className="text-ui font-semibold text-zinc-500">
              Trade & Shopper Marketing{isConfigOnlyAdmin ? " · Admin" : ""}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSyncClick}
              className={`flex items-center gap-2 rounded border px-2 py-1.5 transition-all ${
                syncing
                  ? "border-blue-200 bg-blue-50"
                  : apiError
                    ? "border-red-200 bg-red-50"
                    : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
              }`}
              title="Estado de sincronización"
            >
              {syncing ? (
                <i className="fa-solid fa-cloud-arrow-up text-blue-500 animate-pulse text-sm" />
              ) : apiError ? (
                <i className="fa-solid fa-cloud-arrow-down text-red-400 text-sm" />
              ) : (
                <i className="fa-solid fa-cloud text-emerald-500 text-sm" />
              )}
              {syncDetalleVisible && (
                <span className={`text-ui-sm font-semibold ${
                  syncing ? "text-blue-600" : apiError ? "text-red-500" : "text-emerald-600"
                }`}>
                  {palabraEstadoSync}
                </span>
              )}
            </button>

            {/* BOTÓN CERRAR SESIÓN EXCLUSIVO PARA ROL ADMIN GLOBAL (HEADER) */}
            {isConfigOnlyAdmin && (
              <button
                onClick={handleLogout}
                className="px-3.5 py-1.5 text-xs font-semibold text-red-655 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
              >
                Cerrar Sesión
              </button>
            )}

            {!isConfigOnlyAdmin && (
              <button 
                onClick={() => fetchData(false)}
                disabled={loading}
                className="p-1.5 text-zinc-400 hover:text-zinc-800 border rounded bg-white hover:bg-zinc-50 transition-colors"
                title="Actualizar base de datos"
              >
                <i className="fa-solid fa-arrows-rotate text-xs"></i>
              </button>
            )}
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto overflow-x-hidden max-w-6xl mx-auto w-full min-h-0 ${!isConfigOnlyAdmin ? "robin-mobile-main md:p-6" : "p-4 md:p-6"}`}>
          
          {paginaActiva === "home" && !isConfigOnlyAdmin && (
            <LayoutHome 
              tareas={tareas} 
              nombreUsuario={nombreCompleto} 
              username={usuario} 
              onSelectTask={(t) => { setActiveTask(t); setIsEditing(true); }}
              onUpdateField={handleUpdateField}
              widgets={widgets}
              currentTheme={currentTheme}
              getMarcaStyle={getMarcaStyle}
              otrosUsuariosEnLinea={otrosUsuariosEnLinea}
              presenceEstado={presenceEstado}
            />
          )}

          {paginaActiva === "agregar" && !isConfigOnlyAdmin && (
            <div className="max-w-xl mx-auto border border-zinc-200 p-6 rounded-md bg-white animate-fade-in">
              <h2 className="text-sm font-bold uppercase tracking-wider border-b pb-2 text-zinc-500">Crear Entregable</h2>
              
              <form onSubmit={handleCreateTask} className="flex flex-col gap-4 mt-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Cliente / Marca</label>
                    <select 
                      value={nuevaTarea.marca} 
                      onChange={(e) => setNuevaTarea({...nuevaTarea, marca: e.target.value})}
                      className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs rounded focus:outline-none bg-white font-semibold text-[#37352F]"
                    >
                      {marcasDisponibles.map(m => (
                        <option key={m} value={m}>{formatearMarca(m)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Categoría</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Material POP, Diseño, Digital..." 
                      value={nuevaTarea.categoria} 
                      onChange={(e) => setNuevaTarea({...nuevaTarea, categoria: e.target.value})}
                      className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 text-xs rounded focus:outline-none font-semibold text-[#37352F]" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Título del entregable</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Título del entregable..." 
                      value={nuevaTarea.info} 
                      onChange={(e) => setNuevaTarea({...nuevaTarea, info: e.target.value})}
                      className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 text-xs rounded focus:outline-none font-semibold text-[#37352F]" 
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Prioridad</label>
                    <select 
                      value={nuevaTarea.prioridad} 
                      onChange={(e) => setNuevaTarea({...nuevaTarea, prioridad: e.target.value})}
                      className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs rounded focus:outline-none bg-white font-semibold text-[#37352F]"
                    >
                      {PRIORIDADES_MAPA.map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Asignados</label>
                  <SelectorPersonasChips 
                    personasSeleccionadas={nuevaTarea.personas}
                    onChange={(val) => setNuevaTarea({...nuevaTarea, personas: val})}
                    listaGlobal={listaPersonas}
                    registrarNuevaPersona={registrarNuevaPersonaGlobal}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Estado</label>
                    <select 
                      value={nuevaTarea.estado} 
                      onChange={(e) => setNuevaTarea({...nuevaTarea, estado: e.target.value})}
                      className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs rounded focus:outline-none bg-white font-semibold text-[#37352F]"
                    >
                      {LISTA_ESTADOS_VALIDOS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Fecha de Entrega (Deadline)</label>
                    <input 
                      type="date" 
                      required
                      value={convertirFechaAInput(nuevaTarea.deadline)} 
                      onChange={(e) => setNuevaTarea({...nuevaTarea, deadline: e.target.value})}
                      className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 text-xs rounded focus:outline-none font-semibold text-[#37352F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Descripción / Notas</label>
                  <textarea 
                    rows="4"
                    placeholder="Ingresa notas o listas de subtareas (Ej: - [ ] Tarea)..."
                    value={nuevaTarea.detalles}
                    onChange={(e) => setNuevaTarea({...nuevaTarea, detalles: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 p-2.5 text-xs rounded focus:outline-none font-medium text-[#37352F]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button 
                    type="button" 
                    onClick={() => setPaginaActiva("home")}
                    className="px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting || syncing}
                    className="px-4 py-1.5 bg-[#37352F] text-white text-xs font-semibold rounded hover:bg-[#2c2a26] disabled:opacity-50"
                  >
                    Crear Entregable
                  </button>
                </div>
              </form>
            </div>
          )}

          {paginaActiva === "dashboard" && !isConfigOnlyAdmin && (
            <>
              {/* ── Móvil: lista o subpágina de filtros ── */}
              <div className="md:hidden flex flex-col gap-3 animate-fade-in">
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
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        <button onClick={() => setFiltroTiempo("TODAS")} className={`px-2 py-2 rounded text-[10px] font-semibold border ${filtroTiempo === "TODAS" ? "bg-[#37352F] text-white border-zinc-900" : "bg-white border-zinc-200 text-zinc-600"}`}>Todo</button>
                        <button onClick={() => setFiltroTiempo("HOY")} className={`px-2 py-2 rounded text-[10px] font-semibold border ${filtroTiempo === "HOY" ? "bg-blue-600 text-white border-blue-700" : "bg-white border-zinc-200 text-zinc-600"}`}>Hoy{metricaCounters.activasHoy > 0 ? ` (${metricaCounters.activasHoy})` : ""}</button>
                        <button onClick={() => setFiltroTiempo("ATRASADAS")} className={`px-2 py-2 rounded text-[10px] font-semibold border ${filtroTiempo === "ATRASADAS" ? "bg-red-600 text-white border-red-700" : "bg-white border-zinc-200 text-zinc-600"}`}>Atraso{metricaCounters.atrasadas > 0 ? ` (${metricaCounters.atrasadas})` : ""}</button>
                      </div>
                      {filtrosDashboardActivos && (
                        <button
                          type="button"
                          onClick={() => { setFiltroTiempo("TODAS"); setFiltroMarca("TODAS"); setFiltroEstado("TODOS"); setFiltroPrioridad("TODAS"); setSearchQuery(""); }}
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
                        <h2 className="text-sm font-bold text-[#37352F] truncate">
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
                      </div>
                    </div>

                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-zinc-400">
                        <i className="fa-solid fa-magnifying-glass text-[10px]"></i>
                      </span>
                      <input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-zinc-200 pl-8 pr-3 py-2 text-ui rounded-md focus:outline-none text-[#37352F]" />
                    </div>

                    {tareasSeleccionadas.size > 0 && (
                      <div className="border border-zinc-200 rounded-md p-2.5 bg-[#FAF9F6] flex flex-col gap-2">
                        <span className="text-ui-sm font-semibold text-zinc-700">{tareasSeleccionadas.size} seleccionado{tareasSeleccionadas.size !== 1 ? "s" : ""}</span>
                        <div className="grid grid-cols-2 gap-2">
                          <select value={bulkEstado} onChange={(e) => { const val = e.target.value; setBulkEstado(val); if (val) handleBulkUpdate("estado", val); }} className="text-ui-sm border border-zinc-200 rounded px-2 py-1.5 bg-white">
                            <option value="">Estado...</option>
                            {LISTA_ESTADOS_VALIDOS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                          </select>
                          <select value={bulkPrioridad} onChange={(e) => { const val = e.target.value; setBulkPrioridad(val); if (val) handleBulkUpdate("prioridad", val); }} className="text-ui-sm border border-zinc-200 rounded px-2 py-1.5 bg-white">
                            <option value="">Prioridad...</option>
                            {PRIORIDADES_MAPA.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                          </select>
                        </div>
                        <button type="button" onClick={limpiarSeleccionTareas} className="text-ui-sm text-zinc-500 text-left">Limpiar selección</button>
                      </div>
                    )}

                    {vistaModo === "TABLE" ? (
                      <LayoutTablaAgrupada tareas={tareasFiltradas} onUpdateField={handleUpdateField} onSelectTask={(t) => { setActiveTask(t); setIsEditing(true); }} onDeleteTask={(t) => setTaskToDelete(t)} getMarcaStyle={getMarcaStyle} currentTheme={currentTheme} tareasSeleccionadas={tareasSeleccionadas} onToggleSeleccion={toggleSeleccionTarea} onToggleSeleccionGrupo={(lista, seleccionar) => { setTareasSeleccionadas(prev => { const next = new Set(prev); lista.forEach(t => { const key = getTaskSelectionKey(t); if (seleccionar) next.add(key); else next.delete(key); }); return next; }); }} />
                    ) : (
                      <LayoutKanban tareas={tareasFiltradas} onUpdateField={handleUpdateField} onSelectTask={(t) => { setActiveTask(t); setIsEditing(true); }} onDeleteTask={(t) => setTaskToDelete(t)} getMarcaStyle={getMarcaStyle} currentTheme={currentTheme} />
                    )}
                  </>
                )}
              </div>

              {/* ── Desktop: sin cambios ── */}
              <div className="hidden md:flex flex-col gap-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-ui font-semibold text-[#37352F]">
                    {filtroMarca === "TODAS" ? "Entregables del área" : `Entregables: ${formatearMarca(filtroMarca)}`}
                  </h2>
                  <p className="text-ui-sm text-zinc-400 mt-0.5">
                    Mostrando {tareasFiltradas.length} de {tareas.length} entregables activos
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-[#FAF9F6] p-1 rounded border border-zinc-200">
                  <button onClick={() => { setVistaModo("TABLE"); setUserPreference("vistaModo", "TABLE"); }} className={`px-3 py-1 text-ui font-medium rounded transition-colors flex items-center gap-1.5 ${vistaModo === "TABLE" ? "bg-white text-zinc-800 border" : "text-zinc-450 hover:text-zinc-700"}`}>
                    <i className="fa-solid fa-list"></i> Lista
                  </button>
                  <button onClick={() => { setVistaModo("KANBAN"); setUserPreference("vistaModo", "KANBAN"); }} className={`px-3 py-1 text-ui font-medium rounded transition-colors flex items-center gap-1.5 ${vistaModo === "KANBAN" ? "bg-white text-zinc-800 border" : "text-zinc-450 hover:text-zinc-700"}`}>
                    <i className="fa-solid fa-chart-simple"></i> Tablero
                  </button>
                </div>
              </div>

              <div className="border border-zinc-200 p-3.5 rounded-md flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-zinc-400">
                      <i className="fa-solid fa-magnifying-glass text-[10px]"></i>
                    </span>
                    <input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#FAF9F6]/50 border border-zinc-200 pl-8 pr-3 py-1.5 text-ui rounded focus:outline-none text-[#37352F]" />
                  </div>
                  <div>
                    <select value={filtroMarca} onChange={(e) => setFiltroMarca(e.target.value)} className="w-full bg-white border border-zinc-200 p-1.5 text-ui rounded focus:outline-none text-zinc-600">
                      <option value="TODAS">Clientes: Todos</option>
                      {marcasDisponibles.map(m => (<option key={m} value={m}>{formatearMarca(m)}</option>))}
                    </select>
                  </div>
                  <div>
                    <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="w-full bg-white border border-zinc-200 p-1.5 text-ui rounded focus:outline-none text-zinc-600">
                      <option value="TODOS">Estados: Todos</option>
                      {LISTA_ESTADOS_VALIDOS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                    </select>
                  </div>
                  <div>
                    <select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)} className="w-full bg-white border border-zinc-200 p-1.5 text-ui rounded focus:outline-none text-zinc-600">
                      <option value="TODAS">Prioridades: Todas</option>
                      {PRIORIDADES_MAPA.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-150">
                  <button onClick={() => setFiltroTiempo("TODAS")} className={`px-2.5 py-1 rounded text-ui-sm font-medium transition-all border ${filtroTiempo === "TODAS" ? "bg-[#37352F] text-white border-zinc-900" : "bg-white border-zinc-200 text-zinc-550 hover:bg-zinc-50"}`}>Todo el tiempo</button>
                  <button onClick={() => setFiltroTiempo("HOY")} className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all border flex items-center gap-1 ${filtroTiempo === "HOY" ? "bg-blue-600 text-white border-blue-700" : "bg-white border-zinc-200 text-zinc-550 hover:bg-zinc-50"}`}>Entrega hoy {metricaCounters.activasHoy > 0 ? `(${metricaCounters.activasHoy})` : ""}</button>
                  <button onClick={() => setFiltroTiempo("ATRASADAS")} className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all border flex items-center gap-1 ${filtroTiempo === "ATRASADAS" ? "bg-red-600 text-white border-red-700" : "bg-white border-zinc-200 text-zinc-550 hover:bg-zinc-50"}`}>Atrasados {metricaCounters.atrasadas > 0 ? `(${metricaCounters.atrasadas})` : ""}</button>
                </div>
              </div>

              {tareasSeleccionadas.size > 0 && (
                <div className="border border-zinc-200 rounded-md p-3 bg-[#FAF9F6] flex flex-wrap items-center gap-3">
                  <span className="text-ui font-semibold text-zinc-700">{tareasSeleccionadas.size} seleccionado{tareasSeleccionadas.size !== 1 ? "s" : ""}</span>
                  <select value={bulkEstado} onChange={(e) => { const val = e.target.value; setBulkEstado(val); if (val) handleBulkUpdate("estado", val); }} className="text-ui-sm border border-zinc-200 rounded px-2 py-1 bg-white">
                    <option value="">Cambiar estado...</option>
                    {LISTA_ESTADOS_VALIDOS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                  </select>
                  <select value={bulkPrioridad} onChange={(e) => { const val = e.target.value; setBulkPrioridad(val); if (val) handleBulkUpdate("prioridad", val); }} className="text-ui-sm border border-zinc-200 rounded px-2 py-1 bg-white">
                    <option value="">Cambiar prioridad...</option>
                    {PRIORIDADES_MAPA.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                  </select>
                  <input type="date" value={bulkDeadline} onChange={(e) => { const val = e.target.value; setBulkDeadline(val); if (val) handleBulkUpdate("deadline", val); }} className="text-ui-sm border border-zinc-200 rounded px-2 py-1 bg-white" title="Cambiar fecha límite" />
                  <button type="button" onClick={limpiarSeleccionTareas} className="text-ui-sm text-zinc-500 hover:text-zinc-800 ml-auto">Limpiar selección</button>
                </div>
              )}

              {vistaModo === "TABLE" ? (
                <LayoutTablaAgrupada tareas={tareasFiltradas} onUpdateField={handleUpdateField} onSelectTask={(t) => { setActiveTask(t); setIsEditing(true); }} onDeleteTask={(t) => setTaskToDelete(t)} getMarcaStyle={getMarcaStyle} currentTheme={currentTheme} tareasSeleccionadas={tareasSeleccionadas} onToggleSeleccion={toggleSeleccionTarea} onToggleSeleccionGrupo={(lista, seleccionar) => { setTareasSeleccionadas(prev => { const next = new Set(prev); lista.forEach(t => { const key = getTaskSelectionKey(t); if (seleccionar) next.add(key); else next.delete(key); }); return next; }); }} />
              ) : (
                <LayoutKanban tareas={tareasFiltradas} onUpdateField={handleUpdateField} onSelectTask={(t) => { setActiveTask(t); setIsEditing(true); }} onDeleteTask={(t) => setTaskToDelete(t)} getMarcaStyle={getMarcaStyle} currentTheme={currentTheme} />
              )}
              </div>
            </>
          )}

          {paginaActiva === "clientes" && !isConfigOnlyAdmin && (
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
              {/* Móvil: menú + subpáginas */}
              <div className="md:hidden flex flex-col gap-3 animate-fade-in">
                {configMobileSeccion ? (
                  <div className="flex flex-col gap-3">
                    <MobileSubpageBar
                      title={
                        configMobileSeccion === "perfil" ? "Perfil" :
                        configMobileSeccion === "tema" ? "Tema" :
                        configMobileSeccion === "api" ? "Base de datos" :
                        configMobileSeccion === "usuarios" ? "Usuarios" :
                        configMobileSeccion === "widgets" ? "Enlaces" :
                        configMobileSeccion === "clientes" ? "Fichas clientes" : "Ajustes"
                      }
                      onBack={() => setConfigMobileSeccion(null)}
                    />

                    {configMobileSeccion === "perfil" && !isConfigOnlyAdmin && (
                      <form onSubmit={handleSaveNombreCompleto} className="bg-white border border-zinc-200 p-3 rounded-md flex flex-col gap-3">
                        <input type="text" placeholder="Tu nombre" value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm rounded font-semibold text-[#37352F]" />
                        <button type="submit" className="w-full py-2.5 bg-[#37352F] text-white text-ui font-semibold rounded-md">Guardar</button>
                      </form>
                    )}

                    {configMobileSeccion === "tema" && (
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleThemeChange("notion")} className={`p-3 rounded-md border text-sm font-semibold ${theme === "notion" ? "bg-[#37352F] text-white" : "bg-white border-zinc-200 text-zinc-600"}`}>Claro</button>
                        <button onClick={() => handleThemeChange("midnight")} className={`p-3 rounded-md border text-sm font-semibold ${theme === "midnight" ? "bg-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-600"}`}>Oscuro</button>
                      </div>
                    )}

                    {configMobileSeccion === "api" && (
                      <div className="bg-[#FAF9F6] p-3 rounded-md border border-zinc-200 text-xs text-zinc-600 flex items-start gap-2">
                        <i className="fa-solid fa-circle-check text-emerald-500 mt-0.5"></i>
                        <div className="min-w-0">
                          <p className="font-bold text-[#37352F]">Sheets conectado</p>
                          <p className="text-[11px] text-zinc-400 mt-1 break-all">{AUTO_API_URL}</p>
                        </div>
                      </div>
                    )}

                    {configMobileSeccion === "usuarios" && (
                      isAdmin ? (
                        <div className="bg-white border border-zinc-200 p-3 rounded-md flex flex-col gap-3">
                          <form onSubmit={handleAddUser} className="flex gap-2">
                            <input type="text" placeholder="Usuario" value={nuevoUsuarioInput} onChange={(e) => setNuevoUsuarioInput(e.target.value)} className="flex-1 bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm rounded font-semibold" />
                            <button type="submit" className="px-3 py-2 bg-[#37352F] text-white text-ui font-semibold rounded-md">+</button>
                          </form>
                          <div className="flex flex-wrap gap-1.5">
                            {listaUsuarios.map(u => (
                              <span key={u} className="inline-flex items-center gap-1 bg-zinc-50 border border-zinc-200 text-zinc-800 text-[11px] font-semibold px-2 py-1 rounded-full">
                                @{u}
                                {u !== "admin" && (
                                  <button type="button" onClick={() => { const filtered = listaUsuarios.filter(item => item !== u); setListaUsuarios(filtered); setLocalStorageItemSafe("robin_lista_usuarios", JSON.stringify(filtered)); showToast("Usuario desautorizado", "info"); }} className="text-zinc-400 font-bold">&times;</button>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-ui-sm text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-md p-3">Solo administradores.</p>
                      )
                    )}

                    {configMobileSeccion === "widgets" && isConfigOnlyAdmin && (
                      <WidgetsAdminPanel widgets={widgets} onAddWidget={handleAddWidget} onEditWidget={handleEditWidget} onDeleteWidget={handleDeleteWidget} />
                    )}

                    {configMobileSeccion === "clientes" && isConfigOnlyAdmin && (
                      <LayoutClientes key={clientesReset} marcas={marcasDisponibles} marcasMetadata={marcasMetadata} canEdit={canEditFichas} onSaveBrandMetadata={handleSaveBrandMetadata} onRegisterBrand={handleCreateBrand} onDeleteBrand={handleDeleteBrand} />
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <h2 className="text-base font-bold text-[#37352F] mb-1">Ajustes</h2>

                    {!isConfigOnlyAdmin && (
                      <button type="button" onClick={() => setConfigMobileSeccion("perfil")} className="mobile-menu-btn">
                        <span><i className="fa-solid fa-user"></i> Perfil</span>
                        <i className="fa-solid fa-chevron-right text-[10px] text-zinc-300"></i>
                      </button>
                    )}
                    <button type="button" onClick={() => setConfigMobileSeccion("tema")} className="mobile-menu-btn">
                      <span><i className="fa-solid fa-palette"></i> Tema</span>
                      <i className="fa-solid fa-chevron-right text-[10px] text-zinc-300"></i>
                    </button>
                    <button type="button" onClick={() => setConfigMobileSeccion("api")} className="mobile-menu-btn">
                      <span><i className="fa-solid fa-database"></i> Base de datos</span>
                      <i className="fa-solid fa-chevron-right text-[10px] text-zinc-300"></i>
                    </button>
                    {(isAdmin || !isConfigOnlyAdmin) && (
                      <button type="button" onClick={() => setConfigMobileSeccion("usuarios")} className="mobile-menu-btn">
                        <span><i className="fa-solid fa-users"></i> Usuarios</span>
                        <i className="fa-solid fa-chevron-right text-[10px] text-zinc-300"></i>
                      </button>
                    )}
                    {isConfigOnlyAdmin && (
                      <>
                        <button type="button" onClick={() => setConfigMobileSeccion("widgets")} className="mobile-menu-btn">
                          <span><i className="fa-solid fa-link"></i> Enlaces</span>
                          <i className="fa-solid fa-chevron-right text-[10px] text-zinc-300"></i>
                        </button>
                        <button type="button" onClick={() => setConfigMobileSeccion("clientes")} className="mobile-menu-btn">
                          <span><i className="fa-solid fa-id-card"></i> Fichas clientes</span>
                          <i className="fa-solid fa-chevron-right text-[10px] text-zinc-300"></i>
                        </button>
                      </>
                    )}

                    <button type="button" onClick={handleLogout} className="mobile-menu-btn is-danger mt-2">
                      <span><i className="fa-solid fa-right-from-bracket"></i> Cerrar sesión</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Desktop: sin cambios */}
              <div className={`hidden md:flex ${isConfigOnlyAdmin ? "max-w-6xl" : "max-w-xl"} mx-auto border border-zinc-200 p-6 rounded-md bg-white animate-fade-in flex-col gap-6`}>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider border-b pb-2 text-zinc-500">Ajustes del Sistema</h2>
                <p className="text-xs text-zinc-400 mt-1">Configuración técnica de origen de datos y autorización de personal.</p>
              </div>

              {/* Integración Google Sheets Informada */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Base de Datos</span>
                <div className="bg-[#FAF9F6] p-3 rounded border border-zinc-200 text-xs text-zinc-600 flex items-start gap-2.5 font-medium leading-normal">
                  <i className="fa-solid fa-circle-check text-emerald-500 mt-0.5"></i>
                  <div className="overflow-hidden">
                    <p className="text-[#37352F] font-bold">API de Google Sheets configurada</p>
                    <p className="text-zinc-455 font-normal mt-0.5 text-[11px] truncate max-w-full">
                      Enlace activo: {AUTO_API_URL}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ocultar sección de datos personales para administrador global */}
              {!isConfigOnlyAdmin && (
                <div className="flex flex-col gap-2 animate-fade-in">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Colaborador</span>
                  <form onSubmit={handleSaveNombreCompleto} className="bg-zinc-50 p-3 rounded border border-zinc-200 flex flex-col sm:flex-row gap-2 items-end">
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Nombre de perfil</label>
                      <input 
                        type="text" 
                        placeholder="Francisco Colmenares"
                        value={nombreCompleto}
                        onChange={(e) => setNombreCompleto(e.target.value)}
                        className="w-full bg-white border border-zinc-200 px-3 py-1.5 text-xs rounded focus:outline-none font-bold text-[#37352F]"
                      />
                    </div>
                    <button 
                      type="submit"
                      className="bg-[#37352F] hover:bg-[#2c2a26] text-white text-xs font-semibold px-4 py-2 rounded transition-colors whitespace-nowrap"
                    >
                      Guardar
                    </button>
                  </form>
                </div>
              )}

              {/* Estilo Visual */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Tema</span>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleThemeChange("notion")}
                    className={`p-2 rounded border text-xs font-semibold transition-all ${
                      theme === "notion" ? "bg-[#37352F] text-white border-zinc-950" : "bg-white border-zinc-200 text-zinc-550"
                    }`}
                  >
                    Notion Claro
                  </button>
                  <button 
                    onClick={() => handleThemeChange("midnight")}
                    className={`p-2 rounded border text-xs font-semibold transition-all ${
                      theme === "midnight" ? "bg-zinc-800 text-white border-zinc-900" : "bg-white border-zinc-200 text-zinc-550"
                    }`}
                  >
                    Oscuro
                  </button>
                </div>
              </div>

              {isConfigOnlyAdmin && (
                <WidgetsAdminPanel
                  widgets={widgets}
                  onAddWidget={handleAddWidget}
                  onEditWidget={handleEditWidget}
                  onDeleteWidget={handleDeleteWidget}
                />
              )}

              {isConfigOnlyAdmin && (
                <div className="flex flex-col gap-3 border-t border-zinc-200 pt-5">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Fichas técnicas de clientes</span>
                    <p className="text-xs text-zinc-400 mt-1">Gestión de equipos, contactos y lineamientos por marca.</p>
                  </div>
                  <LayoutClientes
                    key={clientesReset}
                    marcas={marcasDisponibles}
                    marcasMetadata={marcasMetadata}
                    canEdit={canEditFichas}
                    onSaveBrandMetadata={handleSaveBrandMetadata}
                    onRegisterBrand={handleCreateBrand}
                    onDeleteBrand={handleDeleteBrand}
                  />
                </div>
              )}

              {/* Control de Usuarios - Solo accesible para el rol de administrador */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Usuarios autorizados</span>
                {isAdmin ? (
                  <div className="bg-zinc-50 p-3 rounded border border-zinc-200 flex flex-col gap-3">
                    <form onSubmit={handleAddUser} className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Usuario (Ej: ralvarez)"
                        value={nuevoUsuarioInput}
                        onChange={(e) => setNuevoUsuarioInput(e.target.value)}
                        className="w-full bg-white border border-zinc-200 px-3 py-1.5 text-xs rounded focus:outline-none font-bold text-[#37352F]"
                      />
                      <button 
                        type="submit"
                        className="bg-[#37352F] hover:bg-[#2c2a26] text-white text-xs font-semibold px-4 py-2 rounded transition-colors whitespace-nowrap"
                      >
                        Autorizar
                      </button>
                    </form>
                    <div className="flex flex-wrap gap-1">
                      {listaUsuarios.map(u => (
                        <span key={u} className="inline-flex items-center gap-1 bg-white border border-zinc-200 text-zinc-800 text-[11px] font-semibold px-2 py-0.5 rounded">
                          @{u}
                          {u !== "admin" && (
                            <button 
                              type="button"
                              onClick={() => {
                                const filtered = listaUsuarios.filter(item => item !== u);
                                setListaUsuarios(filtered);
                                setLocalStorageItemSafe("robin_lista_usuarios", JSON.stringify(filtered));
                                showToast("Usuario desautorizado", "info");
                              }}
                              className="text-zinc-400 hover:text-red-500 font-bold ml-1"
                            >
                              &times;
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-50 p-3 rounded border border-zinc-200 text-zinc-500 text-xs font-medium flex items-start gap-2 leading-relaxed">
                    <i className="fa-solid fa-lock text-zinc-400 mt-0.5"></i>
                    <span>Requiere privilegios de administrador para autorizar o desautorizar colaboradores.</span>
                  </div>
                )}
              </div>

              </div>
            </>
          )}

        </div>
      </main>

      {!isConfigOnlyAdmin && (
        <MobileNavBar
          paginaActiva={paginaActiva}
          navegarA={navegarA}
          filtroMarca={filtroMarca}
          setFiltroMarca={setFiltroMarca}
          setFiltroTiempo={setFiltroTiempo}
          setFiltroEstado={setFiltroEstado}
          setFiltroPrioridad={setFiltroPrioridad}
          usuario={usuario}
          syncing={syncing}
          apiError={apiError}
          palabraEstadoSync={palabraEstadoSync}
          onSyncClick={handleSyncClick}
          onRefresh={() => fetchData(false)}
          loading={loading}
        />
      )}

      {/* MODALES ADICIONALES */}
      {isEditing && activeTask && !isConfigOnlyAdmin && (
        <ModalPortal>
          <ModalEdicionTarea 
            tarea={activeTask}
            onClose={() => { setIsEditing(false); setActiveTask(null); }}
            onSave={handleSaveTaskModal}
            listaPersonas={listaPersonas}
            registrarNuevaPersona={registrarNuevaPersonaGlobal}
            marcasDisponibles={marcasDisponibles}
            isSubmitting={isSubmitting}
          />
        </ModalPortal>
      )}

      {taskToDelete && !isConfigOnlyAdmin && (
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
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-red-650 hover:bg-red-500 text-white text-xs font-semibold rounded"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
