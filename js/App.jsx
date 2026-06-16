function App() {
  const [usuario, setUsuario] = useState(() => getInicialUsuario());
  const [claveInput, setClaveInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = useMemo(() => {
    return usuario === "admin" || usuario === "fcolmenares";
  }, [usuario]);

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

  const [theme, setTheme] = useState(() => getLocalStorageItemSafe("robin_theme", "notion"));
  const currentTheme = useMemo(() => TEMAS[theme] || TEMAS.notion, [theme]);

  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [filtroTiempo, setFiltroTiempo] = useState("TODAS"); 
  const [filtroMarca, setFiltroMarca] = useState("TODAS");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroPrioridad, setFiltroPrioridad] = useState("TODAS"); 
  const [searchQuery, setSearchQuery] = useState("");
  
  const [paginaActiva, setPaginaActiva] = useState(() => {
    const u = getInicialUsuario();
    return u === "admin" ? "configuracion" : "home";
  }); 
  const [vistaModo, setVistaModo] = useState("TABLE"); 

  const [activeTask, setActiveTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [nuevoUsuarioInput, setNuevoUsuarioInput] = useState("");
  const [clientesReset, setClientesReset] = useState(0);

  const [nombreCompleto, setNombreCompleto] = useState(() => {
    return getLocalStorageItemSafe("robin_nombre_completo", "");
  });

  const [marcasMetadata, setMarcasMetadata] = useState({});
  const [widgets, setWidgets] = useState([]);

  const [usuariosConectados, setUsuariosConectados] = useState([]);
  const [presenceEstado, setPresenceEstado] = useState("idle");

  const [listaPersonas, setListaPersonas] = useState(() => {
    try {
      const guardadas = getLocalStorageItemSafe("robin_personas_v2", null);
      if (guardadas) return JSON.parse(guardadas);
    } catch(e) {}
    return ["@fcolmenares", "@ralvarez", "@dsalavarria", "@mbonilla", "@gnebrus", "@sgiucastro"];
  });

  const [nuevaTarea, setNuevaTarea] = useState({
    marca: "La Santé", categoria: "", info: "", personas: "", detalles: "", estado: "Pendiente", deadline: "", prioridad: "Media"
  });

  // 🚨 UBICACIÓN CORRECTA DE VARIABLES COMPUTADAS Y useMemo (Evita ReferenceError y TDZ)
  const marcasDisponibles = useMemo(() => {
    return obtenerMarcasUnicas([
      "La Santé", "Diageo", "Gama", "Robin", "TMK",
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
      if (filtroPrioridad !== "TODAS" && cleanPrioridad(t.prioridad) !== cleanPrioridad(filtroPrioridad)) return false;

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

    return () => {
      clearInterval(heartbeatInterval);
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
    const n = getLocalStorageItemSafe("robin_nombre_completo", null);
    if (!n) {
      removeLocalStorageItemSafe("robin_nombre_completo");
      setNombreCompleto("");
    }
  }, []);

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
    if (pagina === "clientes") setClientesReset(n => n + 1);
    if (extraFn) extraFn();
    setSidebarOpen(false);
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
          categoria: nuevoWidget.icon,
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
          categoria: widgetActualizado.icon,
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
    setLocalStorageItemSafe("robin_nombre_completo", nombreCompleto);
    showToast("Nombre guardado", "success");
  };

  const handleSaveBrandMetadata = async (brand, newMeta) => {
    if (!isAdmin) {
      showToast("Solo un administrador puede editar fichas de cliente", "error");
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
      await fetchData(true);
    } catch (e) {
      showToast("Guardado local (Falla de red)", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateBrand = async (brandPayload) => {
    if (!isAdmin) {
      showToast("Solo un administrador puede crear clientes", "error");
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
    setLocalStorageItemSafe("robin_theme", newTheme);
    showToast(`Tema cambiado`, "success");
  };

  const handleLogin = (e) => {
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
    if (userClean === "admin") {
      setPaginaActiva("configuracion");
    } else {
      setPaginaActiva("home");
    }
    showToast(`Sesión iniciada: @${userClean}`, "success");
  };

  const handleLogout = () => {
    try {
      removeLocalStorageItemSafe("robin_usuario_actual");
      removeLocalStorageItemSafe("robin_nombre_completo");
      clearLocalStorageSafe(); 
    } catch (e) {
      console.error("Error al limpiar sesión local:", e);
    }
    setUsuario(null);
    setNombreCompleto("");
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
          if (json.widgets) {
            setWidgets(json.widgets);
          }

          setUsuariosConectados(extraerPresenciaDesdeDatos(json.data));
          setPresenceEstado("ready");

          const tareasValidas = json.data.filter(t => {
            if (!t.info || t.info.toString().trim() === "") return false;
            if (!t.marca || t.marca.toString().trim() === "") return false;
            const cleanM = t.marca.toString().trim().toLowerCase();
            if (cleanM === "pendiente" || cleanM.includes("progreso") || cleanM.includes("seguimiento") || cleanM.includes("revision") || cleanM.includes("pausa") || cleanM.includes("completada") || cleanM === "config_marcas") {
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
              deduplicadas.push({ ...t, idTarea: realId, prioridad: t.prioridad || "Media" });
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

    const temp = tareas.map(t => {
      if ((t.idTarea === tarea.idTarea && t.idTarea) || t.info === tarea.info) {
        return { 
          ...t, 
          idTarea: taskTargetId,
          [campo]: nuevoValor,
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
          prioridad: campo === "prioridad" ? nuevoValor : (tarea.prioridad || "Media")
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
    if (original.prioridad !== editedTask.prioridad) cambios.push("prioridad");

    if (cambios.length > 0) {
      detallesAudoria += `\n• [${timestamp}] Editado (${cambios.join(", ")}) por @${usuario}`;
    }

    const taskConHistorial = { ...editedTask, detalles: detallesAudoria };
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
          prioridad: taskConHistorial.prioridad || "Media", campo: "todo"
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
      ...nuevaTarea, idTarea: autoId, detalles: detallesConCreador, fecha: new Date().toISOString().split('T')[0]
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
          deadline: nuevaConId.deadline, prioridad: nuevaConId.prioridad || "Media", campo: "todo"
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
      <div className="h-screen w-screen bg-[#FAFAFA] flex items-center justify-center p-4 select-none animate-fade-in">
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
        <div className="fixed bottom-6 right-6 z-[100] px-4 py-2.5 rounded shadow text-xs font-semibold flex items-center gap-2 border bg-zinc-900 text-white border-zinc-800 animate-zoom-in">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{toast.msg}</span>
        </div>
      )}

      {sidebarOpen && !isConfigOnlyAdmin && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-40 md:hidden"
        />
      )}

      {/* MENÚ LATERAL ESTILO NOTION - OCULTO COMPLETAMENTE PARA EL ADMIN GLOBAL DE CONFIGURACIÓN */}
      {!isConfigOnlyAdmin && (
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-52 ${currentTheme.sidebarBg} border-r border-zinc-200 flex flex-col justify-between shrink-0 transition-transform duration-200 transform
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0
        `}>
          <div className="flex flex-col h-full justify-between pb-4 overflow-y-auto">
            <div>
              <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RobinLogo className="h-5 w-auto" theme={theme} />
                  <span className="fallback-logo text-xs font-bold text-zinc-900 tracking-wider" style={{display: 'none'}}>ROBIN</span>
                </div>
                <button 
                  onClick={() => setSidebarOpen(false)}
                  className="md:hidden text-zinc-400 hover:text-zinc-800 p-1"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>

              <div className="mx-2.5 my-2.5 p-2 rounded bg-[#FAF9F6] border border-zinc-200 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[11px] font-bold truncate text-[#37352F]">@{usuario}</span>
                </div>

                {/* Panel de Presencia */}
                <div className="border-t border-zinc-200/60 pt-1.5">
                  <span className="text-[7.5px] font-semibold text-zinc-400 tracking-wider block mb-1 uppercase">En línea</span>
                  <div className="flex flex-col gap-1 max-h-20 overflow-y-auto">
                    {presenceEstado === "connecting" && (
                      <div className="text-[9px] text-zinc-400 italic">Conectando...</div>
                    )}
                    {presenceEstado === "error" && (
                      <div className="text-[9px] text-red-400 italic">Sin conexión</div>
                    )}
                    {presenceEstado === "ready" && otrosUsuariosEnLinea.length === 0 && (
                      <div className="text-[9px] text-zinc-400 italic">Solo tú en línea</div>
                    )}
                    {presenceEstado === "ready" && otrosUsuariosEnLinea.map((u, index) => (
                      <div key={u.uid || `user-${index}`} className="flex items-center gap-1 text-[9px] text-zinc-600 truncate font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="truncate">{u.nombre || `@${u.username}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-2.5 pt-1">
                <button 
                  disabled={isSubmitting || syncing}
                  onClick={() => navegarA("agregar")}
                  className="w-full bg-[#37352F] hover:bg-[#2c2a26] text-white font-medium py-1.5 px-3 rounded text-xs transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                >
                  <SVGIcon.Plus />
                  <span>Añadir entregable</span>
                </button>
              </div>

              <nav className="p-2.5 flex flex-col gap-1">
                <span className="px-2 text-[8px] font-bold text-zinc-400 tracking-wider uppercase mb-1">Navegación</span>
                
                <button
                  onClick={() => navegarA("home")}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs font-semibold transition-all ${
                    paginaActiva === "home" ? "bg-white shadow-sm font-bold text-zinc-900 border border-zinc-200" : "text-zinc-550 hover:bg-zinc-100/50"
                  }`}
                >
                  <SVGIcon.Home />Home
                </button>

                <button
                  onClick={() => navegarA("dashboard", () => { setFiltroTiempo("TODAS"); setFiltroMarca("TODAS"); setFiltroEstado("TODOS"); setFiltroPrioridad("TODAS"); })}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs font-semibold transition-all ${
                    paginaActiva === "dashboard" && filtroTiempo === "TODAS" && filtroMarca === "TODAS" && filtroEstado === "TODOS" && filtroPrioridad === "TODAS"
                      ? "bg-white shadow-sm font-bold text-zinc-900 border border-zinc-200" : "text-zinc-550 hover:bg-zinc-100/50"
                  }`}
                >
                  <SVGIcon.All />Todos los entregables
                </button>

                <span className="px-2 text-[8px] font-bold text-zinc-400 tracking-wider uppercase mb-1 mt-3">Marcas</span>
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => navegarA("clientes")}
                    className={`flex items-center gap-2 w-full px-2 py-1 rounded text-[11px] font-semibold text-left transition-all ${
                      paginaActiva === "clientes" ? "bg-zinc-200/50 text-[#37352F] font-bold" : "text-zinc-550 hover:bg-zinc-100/30"
                    }`}
                  >
                    <i className="fa-solid fa-layer-group text-[9px] text-zinc-400"></i>
                    <span>Todos los Clientes</span>
                  </button>
                  {marcasDisponibles.map(b => (
                    <button
                      key={b}
                      onClick={() => { setFiltroMarca(b); setFiltroTiempo("TODAS"); navegarA("dashboard"); }}
                      className={`flex items-center gap-1.5 w-full px-2 py-1 rounded text-[11px] font-semibold text-left transition-all ${
                        marcasCoinciden(filtroMarca, b) && paginaActiva === "dashboard" ? "bg-zinc-200/50 text-[#37352F] font-bold" : "text-zinc-550 hover:bg-zinc-100/30"
                      }`}
                    >
                      <i className="fa-solid fa-chevron-right text-[7px] text-zinc-400"></i>
                      <span className="truncate">{formatearMarca(b)}</span>
                    </button>
                  ))}
                </div>

                <span className="px-2 text-[8px] font-bold text-zinc-400 tracking-wider uppercase mb-1 mt-3">Soporte</span>
                <button
                  onClick={() => navegarA("configuracion")}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs font-semibold transition-all ${
                    paginaActiva === "configuracion" ? "bg-white shadow-sm font-bold text-zinc-900 border border-zinc-200" : "text-zinc-550 hover:bg-zinc-100/50"
                  }`}
                >
                  <i className="fa-solid fa-sliders text-zinc-400 text-[11px]"></i>Ajustes Portal
                </button>
              </nav>
            </div>

            <div className="px-3 pt-3">
              <button
                onClick={handleLogout}
                className="w-full text-center py-1.5 text-xs font-semibold text-red-650 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* CONTENEDOR PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        <header className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {sidebarOpen && !isConfigOnlyAdmin && (
              <button 
                onClick={() => setSidebarOpen(true)}
                className="md:hidden text-zinc-600 p-1 hover:bg-zinc-100 rounded"
              >
                <i className="fa-solid fa-bars text-sm"></i>
              </button>
            )}
            <h1 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Trade & Shopper Marketing Workspace {isConfigOnlyAdmin ? "- Admin" : ""}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-zinc-50 border border-zinc-200">
              {syncing ? (
                <>
                  <i className="fa-solid fa-cloud-arrow-up text-blue-500 animate-spin text-[10px]"></i>
                  <span className="text-zinc-400 text-[9px] font-bold uppercase">Sincronizando</span>
                </>
              ) : apiError ? (
                <>
                  <i className="fa-solid fa-cloud-arrow-down text-red-400 text-[10px]"></i>
                  <span className="text-zinc-400 text-[9px] font-bold uppercase">Local</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-cloud text-emerald-500 text-[10px]"></i>
                  <span className="text-zinc-400 text-[9px] font-bold uppercase">Sincronizado</span>
                </>
              )}
            </div>

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

        <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full">
          
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
            <div className="flex flex-col gap-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-[#37352F]">
                    {filtroMarca === "TODAS" ? "Entregables del Área" : `Entregables: ${filtroMarca}`}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Mostrando {tareasFiltradas.length} de {tareas.length} entregables activos.
                  </p>
                </div>

                {/* Selector de Vista */}
                <div className="flex items-center gap-1 bg-[#FAF9F6] p-1 rounded border border-zinc-200">
                  <button 
                    onClick={() => setVistaModo("TABLE")}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                      vistaModo === "TABLE" ? "bg-white text-zinc-800 border" : "text-zinc-450 hover:text-zinc-700"
                    }`}
                  >
                    <i className="fa-solid fa-list"></i> Lista
                  </button>
                  <button 
                    onClick={() => setVistaModo("KANBAN")}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                      vistaModo === "KANBAN" ? "bg-white text-zinc-800 border" : "text-zinc-450 hover:text-zinc-700"
                    }`}
                  >
                    <i className="fa-solid fa-chart-simple"></i> Tablero
                  </button>
                </div>
              </div>

              {/* Panel de Filtros Notion */}
              <div className="border border-zinc-200 p-3.5 rounded-md flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-zinc-400">
                      <i className="fa-solid fa-magnifying-glass text-[10px]"></i>
                    </span>
                    <input 
                      type="text" 
                      placeholder="Buscar..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#FAF9F6]/50 border border-zinc-200 pl-8 pr-3 py-1 text-xs rounded focus:outline-none font-semibold text-[#37352F]"
                    />
                  </div>

                  <div>
                    <select 
                      value={filtroMarca}
                      onChange={(e) => setFiltroMarca(e.target.value)}
                      className="w-full bg-white border border-zinc-200 p-1 text-xs rounded focus:outline-none font-semibold text-zinc-600"
                    >
                      <option value="TODAS">Clientes: Todos</option>
                      {marcasDisponibles.map(m => (
                        <option key={m} value={m}>{formatearMarca(m)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <select 
                      value={filtroEstado}
                      onChange={(e) => setFiltroEstado(e.target.value)}
                      className="w-full bg-white border border-zinc-200 p-1 text-xs rounded focus:outline-none font-semibold text-zinc-600"
                    >
                      <option value="TODOS">Estados: Todos</option>
                      {LISTA_ESTADOS_VALIDOS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <select 
                      value={filtroPrioridad}
                      onChange={(e) => setFiltroPrioridad(e.target.value)}
                      className="w-full bg-white border border-zinc-200 p-1 text-xs rounded focus:outline-none font-semibold text-zinc-600"
                    >
                      <option value="TODAS">Prioridades: Todas</option>
                      {PRIORIDADES_MAPA.map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-150">
                  <button 
                    onClick={() => setFiltroTiempo("TODAS")}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all border ${
                      filtroTiempo === "TODAS" ? "bg-[#37352F] text-white border-zinc-900" : "bg-white border-zinc-200 text-zinc-550 hover:bg-zinc-50"
                    }`}
                  >
                    Todo el tiempo
                  </button>
                  <button 
                    onClick={() => setFiltroTiempo("HOY")}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all border flex items-center gap-1 ${
                      filtroTiempo === "HOY" ? "bg-blue-600 text-white border-blue-700" : "bg-white border-zinc-200 text-zinc-550 hover:bg-zinc-50"
                    }`}
                  >
                    Entrega hoy {metricaCounters.activasHoy > 0 ? `(${metricaCounters.activasHoy})` : ""}
                  </button>
                  <button 
                    onClick={() => setFiltroTiempo("ATRASADAS")}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all border flex items-center gap-1 ${
                      filtroTiempo === "ATRASADAS" ? "bg-red-600 text-white border-red-700" : "bg-white border-zinc-200 text-zinc-550 hover:bg-zinc-50"
                    }`}
                  >
                    Atrasados {metricaCounters.atrasadas > 0 ? `(${metricaCounters.atrasadas})` : ""}
                  </button>
                </div>
              </div>

              {/* Renderizado de Tareas */}
              {vistaModo === "TABLE" ? (
                <LayoutTablaAgrupada 
                  tareas={tareasFiltradas}
                  onUpdateField={handleUpdateField}
                  onSelectTask={(t) => { setActiveTask(t); setIsEditing(true); }}
                  onDeleteTask={(t) => setTaskToDelete(t)}
                  getMarcaStyle={getMarcaStyle}
                  currentTheme={currentTheme}
                />
              ) : (
                <LayoutKanban 
                  tareas={tareasFiltradas}
                  onUpdateField={handleUpdateField}
                  onSelectTask={(t) => { setActiveTask(t); setIsEditing(true); }}
                  onDeleteTask={(t) => setTaskToDelete(t)}
                  getMarcaStyle={getMarcaStyle}
                  currentTheme={currentTheme}
                />
              )}
            </div>
          )}

          {paginaActiva === "clientes" && !isConfigOnlyAdmin && (
            <LayoutClientes
              key={clientesReset}
              marcas={marcasDisponibles}
              marcasMetadata={marcasMetadata}
              canEdit={isAdmin}
              onSaveBrandMetadata={handleSaveBrandMetadata}
              onRegisterBrand={handleCreateBrand}
            />
          )}

          {paginaActiva === "configuracion" && (
            <div className="max-w-xl mx-auto border border-zinc-200 p-6 rounded-md bg-white animate-fade-in flex flex-col gap-6">
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
          )}

        </div>
      </main>

      {/* MODALES ADICIONALES */}
      {isEditing && activeTask && !isConfigOnlyAdmin && (
        <ModalEdicionTarea 
          tarea={activeTask}
          onClose={() => { setIsEditing(false); setActiveTask(null); }}
          onSave={handleSaveTaskModal}
          listaPersonas={listaPersonas}
          registrarNuevaPersona={registrarNuevaPersonaGlobal}
          marcasDisponibles={marcasDisponibles}
          isSubmitting={isSubmitting}
        />
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
