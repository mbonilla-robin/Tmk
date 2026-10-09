function GeneradorEstatus({ tareas, marcasDisponibles, listaPersonas, registrarNuevaPersona, listaSubclientes = [], onClose }) {
  const [vista, setVista] = useState("formulario");
  const [marcasSeleccionadas, setMarcasSeleccionadas] = useState([]);
  const [estadosSeleccionados, setEstadosSeleccionados] = useState(
    () => ["Pendiente", "En progreso"]
  );
  const [personasFiltro, setPersonasFiltro] = useState("");
  const [subclientesFiltro, setSubclientesFiltro] = useState([]);
  const [filtroTiempo, setFiltroTiempo] = useState("todas");
  const [ordenarPor, setOrdenarPor] = useState("estado");
  const [organizarPor, setOrganizarPor] = useState("persona");
  const [incluirSubtareas, setIncluirSubtareas] = useState(false);
  const [incluirPrioridad, setIncluirPrioridad] = useState(false);
  const [incluirDetalle, setIncluirDetalle] = useState(false);
  const [subclientesDesplegados, setSubclientesDesplegados] = useState(false);
  const [textoGenerado, setTextoGenerado] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [compartido, setCompartido] = useState(false);

  const personasDisponibles = useMemo(() => listaPersonas, [listaPersonas]);

  const personasFiltroArray = useMemo(() => {
    if (!personasFiltro) return [];
    return personasFiltro.split(",").map(p => p.trim()).filter(Boolean);
  }, [personasFiltro]);

  const subclientesDisponibles = useMemo(() => {
    if (marcasSeleccionadas.length === 0) return [];
    const nombres = new Map();
    marcasSeleccionadas.forEach((marca) => {
      listarSubclientesDisponiblesParaMarca(listaSubclientes, marca, tareas).forEach((nombre) => {
        const key = claveSubcliente(nombre);
        if (!nombres.has(key)) nombres.set(key, nombre);
      });
    });
    return Array.from(nombres.values()).sort((a, b) => a.localeCompare(b, "es"));
  }, [marcasSeleccionadas, listaSubclientes, tareas]);

  const toggleMarca = (marca) => {
    setMarcasSeleccionadas(prev =>
      prev.some(m => marcasCoinciden(m, marca))
        ? prev.filter(m => !marcasCoinciden(m, marca))
        : [...prev, marca]
    );
  };

  const toggleEstado = (estado) => {
    setEstadosSeleccionados(prev =>
      prev.some(e => cleanEstado(e) === cleanEstado(estado))
        ? prev.filter(e => cleanEstado(e) !== cleanEstado(estado))
        : [...prev, estado]
    );
  };

  const toggleSubcliente = (nombre) => {
    setSubclientesFiltro((prev) =>
      prev.some((s) => subclientesCoinciden(s, nombre))
        ? prev.filter((s) => !subclientesCoinciden(s, nombre))
        : [...prev, nombre]
    );
  };

  const handleGenerar = (e) => {
    e.preventDefault();
    if (marcasSeleccionadas.length === 0) return;
    generarConOpciones(organizarPor);
  };

  const generarConOpciones = (modoOrganizar = organizarPor, conSubtareas = incluirSubtareas, conPrioridad = incluirPrioridad, conDetalle = incluirDetalle) => {
    const texto = generarTextoEstatus(tareas, {
      marcas: marcasSeleccionadas,
      estados: estadosSeleccionados,
      filtroTiempo: filtroTiempo === "todas" ? "" : filtroTiempo,
      ordenarPor,
      organizarPor: modoOrganizar,
      personas: personasFiltroArray,
      subclientes: subclientesFiltro,
      incluirSubtareas: conSubtareas,
      incluirPrioridad: conPrioridad,
      incluirDetalle: conDetalle
    });

    setOrganizarPor(modoOrganizar);
    setIncluirSubtareas(Boolean(conSubtareas));
    setIncluirPrioridad(Boolean(conPrioridad));
    setIncluirDetalle(Boolean(conDetalle));
    setTextoGenerado(texto || "No hay tareas que coincidan con los filtros seleccionados.");
    setVista("resultado");
    setCopiado(false);
  };

  const handleCompartir = async () => {
    const resultado = await compartirTexto(textoGenerado, { titulo: "Estatus ROBIN" });
    if (resultado.ok) {
      setCompartido(true);
      setTimeout(() => setCompartido(false), 2000);
    }
  };

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(textoGenerado);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = textoGenerado;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  const tareasPreview = useMemo(() => {
    if (marcasSeleccionadas.length === 0) return 0;
    const estadosPreview = organizarPor === "espera-comentarios"
      ? ["Seguimiento"]
      : estadosSeleccionados;
    return filtrarTareasParaEstatus(tareas, {
      marcas: marcasSeleccionadas,
      estados: estadosPreview,
      filtroTiempo: filtroTiempo === "todas" ? "" : filtroTiempo,
      personas: personasFiltroArray,
      subclientes: subclientesFiltro
    }).length;
  }, [tareas, marcasSeleccionadas, estadosSeleccionados, filtroTiempo, personasFiltroArray, subclientesFiltro, organizarPor]);

  useEffect(() => {
    setSubclientesFiltro((prev) =>
      prev.filter((s) => subclientesDisponibles.some((d) => subclientesCoinciden(d, s)))
    );
  }, [subclientesDisponibles]);

  useEffect(() => {
    if (subclientesDisponibles.length > 0) {
      setSubclientesDesplegados(true);
    } else {
      setSubclientesDesplegados(false);
    }
  }, [subclientesDisponibles.length]);

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-md z-[250] flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-zoom-in my-auto max-h-[92vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-8 py-5 bg-gradient-to-b from-zinc-50 to-white border-b border-zinc-100 shrink-0">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 mb-0.5">
                {vista === "formulario" ? "Generador de estatus" : "Estatus generado"}
              </h2>
              <p className="text-[11px] text-zinc-500">
                {vista === "formulario" ? "Configura los filtros para tu reporte" : "Revisa y comparte tu estatus"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-all"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          {vista === "formulario" ? (
            <form onSubmit={handleGenerar} className="flex flex-col gap-8 p-8 overflow-y-auto bg-gradient-to-b from-white to-zinc-50/30">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                  <label className="text-sm font-semibold text-zinc-700">Marcas</label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {marcasDisponibles.map(m => {
                    const seleccionada = marcasSeleccionadas.some(ms => marcasCoinciden(ms, m));
                    const estilo = getMarcaStyle(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleMarca(m)}
                        className={`text-sm font-medium px-4 py-2.5 rounded-xl border-2 transition-all duration-200 ${
                          seleccionada
                            ? `${estilo.surface} border-current shadow-sm scale-[1.02]`
                            : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
                        }`}
                      >
                        {formatearMarca(m)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
                  <label className="text-sm font-semibold text-zinc-700">Estados a incluir</label>
                </div>
                <div className={`flex flex-wrap gap-2 ${organizarPor === "espera-comentarios" ? "opacity-50 pointer-events-none" : ""}`}>
                  {obtenerEstadosGeneradorEstatus().map(estado => {
                    const seleccionado = organizarPor === "espera-comentarios"
                      ? cleanEstado(estado) === "seguimiento"
                      : estadosSeleccionados.some(e => cleanEstado(e) === cleanEstado(estado));
                    const config = ESTADOS_MAPA.find(e => cleanEstado(e.id) === cleanEstado(estado));
                    return (
                      <button
                        key={estado}
                        type="button"
                        onClick={() => toggleEstado(estado)}
                        className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border-2 transition-all duration-200 ${
                          seleccionado
                            ? `${config?.bg || "bg-zinc-50"} border-current shadow-sm scale-[1.02]`
                            : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${config?.dot || "bg-zinc-400"}`}></span>
                        {estado}
                      </button>
                    );
                  })}
                </div>
                {organizarPor === "espera-comentarios" && (
                  <div className="mt-3 flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <i className="fa-solid fa-circle-info text-blue-500 text-sm mt-0.5"></i>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Este modo usa solo tareas en <span className="font-semibold">Seguimiento</span> (espera al cliente).
                    </p>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-green-500 rounded-full"></div>
                  <label className="text-sm font-semibold text-zinc-700">
                    Personas <span className="font-normal text-zinc-500">(opcional)</span>
                  </label>
                </div>
                <SelectorPersonasChips
                  personasSeleccionadas={personasFiltro}
                  onChange={setPersonasFiltro}
                  listaGlobal={personasDisponibles}
                  registrarNuevaPersona={registrarNuevaPersona}
                  titulo="Personas"
                />
              </div>

              {subclientesDisponibles.length > 0 && (
                <div className="rounded-xl border-2 border-zinc-200 overflow-hidden bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => setSubclientesDesplegados((v) => !v)}
                    className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-zinc-50 transition-colors text-left"
                    aria-expanded={subclientesDesplegados}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <i
                        className={`fa-solid ${subclientesDesplegados ? "fa-chevron-down" : "fa-chevron-right"} text-xs text-zinc-400 shrink-0 transition-transform`}
                        aria-hidden="true"
                      />
                      <div>
                        <span className="text-sm font-semibold text-zinc-700 block">
                          Subclientes
                        </span>
                        <span className="text-xs text-zinc-500">Filtra por proyecto específico</span>
                      </div>
                    </span>
                    <span className="text-xs font-semibold text-zinc-600 bg-zinc-100 px-2.5 py-1 rounded-lg shrink-0">
                      {subclientesFiltro.length > 0
                        ? `${subclientesFiltro.length} de ${subclientesDisponibles.length}`
                        : `${subclientesDisponibles.length} disponibles`}
                    </span>
                  </button>

                  {subclientesDesplegados && (
                    <div className="px-5 py-4 border-t-2 border-zinc-100 bg-zinc-50/50">
                      <div className="flex flex-wrap gap-2">
                        {subclientesDisponibles.map((nombre) => {
                          const seleccionado = subclientesFiltro.some((s) => subclientesCoinciden(s, nombre));
                          return (
                            <button
                              key={nombre}
                              type="button"
                              onClick={() => toggleSubcliente(nombre)}
                              className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border-2 transition-all duration-200 ${
                                seleccionado
                                  ? "bg-zinc-900 text-white border-zinc-900 shadow-md scale-[1.02]"
                                  : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
                              }`}
                            >
                              <i className="fa-solid fa-store text-sm opacity-70" />
                              {nombre}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-orange-500 rounded-full"></div>
                  <label className="text-sm font-semibold text-zinc-700">Organizar estatus</label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(typeof ORGANIZAR_ESTATUS_OPCIONES !== "undefined" ? ORGANIZAR_ESTATUS_OPCIONES : [
                    { id: "persona", label: "Por personas" },
                    { id: "marca", label: "Por marca" },
                    { id: "subcliente", label: "Por subcliente" },
                    { id: "espera-comentarios", label: "Espera de comentarios" }
                  ]).map((opcion) => (
                    <button
                      key={opcion.id}
                      type="button"
                      onClick={() => setOrganizarPor(opcion.id)}
                      className={`text-sm font-medium px-5 py-2.5 rounded-xl border-2 transition-all duration-200 ${
                        organizarPor === opcion.id
                          ? "bg-zinc-900 text-white border-zinc-900 shadow-md scale-[1.02]"
                          : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
                      }`}
                    >
                      {opcion.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-pink-500 rounded-full"></div>
                  <label className="text-sm font-semibold text-zinc-700">Opciones</label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {organizarPor !== "espera-comentarios" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIncluirSubtareas((v) => !v)}
                        className={`inline-flex items-center gap-2.5 text-sm font-medium px-5 py-2.5 rounded-xl border-2 transition-all duration-200 ${
                          incluirSubtareas
                            ? "bg-zinc-900 text-white border-zinc-900 shadow-md"
                            : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
                        }`}
                        aria-pressed={incluirSubtareas}
                      >
                        <i className={`fa-solid ${incluirSubtareas ? "fa-check-circle" : "fa-circle"} text-base`} aria-hidden="true" />
                        {incluirSubtareas ? "Con subtareas" : "Sin subtareas"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIncluirPrioridad((v) => !v)}
                        className={`inline-flex items-center gap-2.5 text-sm font-medium px-5 py-2.5 rounded-xl border-2 transition-all duration-200 ${
                          incluirPrioridad
                            ? "bg-zinc-900 text-white border-zinc-900 shadow-md"
                            : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
                        }`}
                        aria-pressed={incluirPrioridad}
                      >
                        <i className={`fa-solid ${incluirPrioridad ? "fa-check-circle" : "fa-circle"} text-base`} aria-hidden="true" />
                        Agregar prioridad
                      </button>
                    </>
                  )}
                  {organizarPor === "espera-comentarios" && (
                    <button
                      type="button"
                      onClick={() => setIncluirDetalle((v) => !v)}
                      className={`inline-flex items-center gap-2.5 text-sm font-medium px-5 py-2.5 rounded-xl border-2 transition-all duration-200 ${
                        incluirDetalle
                          ? "bg-zinc-900 text-white border-zinc-900 shadow-md"
                          : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
                      }`}
                      aria-pressed={incluirDetalle}
                    >
                      <i className={`fa-solid ${incluirDetalle ? "fa-check-circle" : "fa-circle"} text-base`} aria-hidden="true" />
                      Agregar detalle
                    </button>
                  )}
                </div>
                <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <i className="fa-solid fa-lightbulb text-amber-600 text-sm mt-0.5"></i>
                  <p className="text-xs text-amber-800 leading-relaxed">
                  {organizarPor === "espera-comentarios" 
                    ? "El detalle muestra los entregables específicos con sus links y estados."
                    : "Prioridad marca con ⚠️ las tareas altas. Por defecto no se incluyen subtareas ni prioridad."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-semibold text-zinc-700 mb-2 block">Filtro de fecha</label>
                  <select
                    value={filtroTiempo}
                    onChange={(e) => setFiltroTiempo(e.target.value)}
                    className="w-full bg-white border-2 border-zinc-200 px-4 py-2.5 text-sm font-medium rounded-xl focus:border-zinc-400 focus:outline-none text-zinc-700 cursor-pointer hover:border-zinc-300 transition-colors"
                  >
                    <option value="todas">Todas las fechas</option>
                    <option value="hoy">Solo hoy</option>
                    <option value="atrasadas">Solo atrasadas</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-zinc-700 mb-2 block">Ordenar por</label>
                  <select
                    value={ordenarPor}
                    onChange={(e) => setOrdenarPor(e.target.value)}
                    className="w-full bg-white border-2 border-zinc-200 px-4 py-2.5 text-sm font-medium rounded-xl focus:border-zinc-400 focus:outline-none text-zinc-700 cursor-pointer hover:border-zinc-300 transition-colors"
                  >
                    <option value="estado">Estado</option>
                    <option value="deadline">Deadline</option>
                  </select>
                </div>
              </div>

              {marcasSeleccionadas.length > 0 && (
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-100 rounded-xl">
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-list-check text-white text-lg"></i>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {tareasPreview} tarea{tareasPreview !== 1 ? "s" : ""} encontrada{tareasPreview !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-zinc-600">Coinciden con los filtros seleccionados</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-6 border-t-2 border-zinc-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={marcasSeleccionadas.length === 0 || (organizarPor !== "espera-comentarios" && estadosSeleccionados.length === 0)}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg disabled:shadow-none flex items-center gap-2"
                >
                  <i className="fa-solid fa-wand-magic-sparkles"></i>
                  Generar estatus
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-8 p-8 overflow-y-auto bg-gradient-to-b from-white to-zinc-50/30">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-orange-500 rounded-full"></div>
                  <label className="text-sm font-semibold text-zinc-700">Organizar estatus</label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(typeof ORGANIZAR_ESTATUS_OPCIONES !== "undefined" ? ORGANIZAR_ESTATUS_OPCIONES : [
                    { id: "persona", label: "Por personas" },
                    { id: "marca", label: "Por marca" },
                    { id: "subcliente", label: "Por subcliente" },
                    { id: "espera-comentarios", label: "Espera de comentarios" }
                  ]).map((opcion) => (
                    <button
                      key={opcion.id}
                      type="button"
                      onClick={() => generarConOpciones(opcion.id, incluirSubtareas, incluirPrioridad, incluirDetalle)}
                      className={`text-sm font-medium px-5 py-2.5 rounded-xl border-2 transition-all duration-200 ${
                        organizarPor === opcion.id
                          ? "bg-zinc-900 text-white border-zinc-900 shadow-md scale-[1.02]"
                          : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
                      }`}
                    >
                      {opcion.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-pink-500 rounded-full"></div>
                  <label className="text-sm font-semibold text-zinc-700">Opciones</label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {organizarPor !== "espera-comentarios" && (
                    <>
                      <button
                        type="button"
                        onClick={() => generarConOpciones(organizarPor, !incluirSubtareas, incluirPrioridad, incluirDetalle)}
                        className={`inline-flex items-center gap-2.5 text-sm font-medium px-5 py-2.5 rounded-xl border-2 transition-all duration-200 ${
                          incluirSubtareas
                            ? "bg-zinc-900 text-white border-zinc-900 shadow-md"
                            : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
                        }`}
                        aria-pressed={incluirSubtareas}
                      >
                        <i className={`fa-solid ${incluirSubtareas ? "fa-check-circle" : "fa-circle"} text-base`} aria-hidden="true" />
                        {incluirSubtareas ? "Con subtareas" : "Sin subtareas"}
                      </button>
                      <button
                        type="button"
                        onClick={() => generarConOpciones(organizarPor, incluirSubtareas, !incluirPrioridad, incluirDetalle)}
                        className={`inline-flex items-center gap-2.5 text-sm font-medium px-5 py-2.5 rounded-xl border-2 transition-all duration-200 ${
                          incluirPrioridad
                            ? "bg-zinc-900 text-white border-zinc-900 shadow-md"
                            : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
                        }`}
                        aria-pressed={incluirPrioridad}
                      >
                        <i className={`fa-solid ${incluirPrioridad ? "fa-check-circle" : "fa-circle"} text-base`} aria-hidden="true" />
                        Agregar prioridad
                      </button>
                    </>
                  )}
                  {organizarPor === "espera-comentarios" && (
                    <button
                      type="button"
                      onClick={() => generarConOpciones(organizarPor, incluirSubtareas, incluirPrioridad, !incluirDetalle)}
                      className={`inline-flex items-center gap-2.5 text-sm font-medium px-5 py-2.5 rounded-xl border-2 transition-all duration-200 ${
                        incluirDetalle
                          ? "bg-zinc-900 text-white border-zinc-900 shadow-md"
                          : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
                      }`}
                      aria-pressed={incluirDetalle}
                    >
                      <i className={`fa-solid ${incluirDetalle ? "fa-check-circle" : "fa-circle"} text-base`} aria-hidden="true" />
                      Agregar detalle
                    </button>
                  )}
                </div>
              </div>
              <div className="rounded-xl border-2 border-zinc-200 overflow-hidden bg-white shadow-sm">
                <div className="bg-gradient-to-r from-zinc-50 to-zinc-100 px-5 py-3 border-b-2 border-zinc-200">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-file-lines text-zinc-600"></i>
                    <span className="text-sm font-semibold text-zinc-700">Vista previa del estatus</span>
                  </div>
                </div>
                <pre className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap font-mono bg-white p-6 max-h-[50vh] overflow-y-auto">
                  {textoGenerado}
                </pre>
              </div>

              <div className="flex gap-3 justify-end pt-6 border-t-2 border-zinc-100">
                <button
                  type="button"
                  onClick={() => setVista("formulario")}
                  className="px-5 py-2.5 text-sm font-semibold text-zinc-600 border-2 border-zinc-200 rounded-xl hover:bg-zinc-50 hover:border-zinc-300 transition-all flex items-center gap-2"
                >
                  <i className="fa-solid fa-arrow-left text-xs"></i>
                  Editar
                </button>
                <button
                  type="button"
                  onClick={handleCopiar}
                  className="px-5 py-2.5 text-sm font-semibold text-zinc-700 bg-zinc-100 border-2 border-zinc-200 rounded-xl hover:bg-zinc-200 hover:border-zinc-300 transition-all flex items-center gap-2"
                >
                  <i className={`fa-solid ${copiado ? "fa-check" : "fa-copy"} text-sm`}></i>
                  {copiado ? "¡Copiado!" : "Copiar"}
                </button>
                <button
                  type="button"
                  onClick={handleCompartir}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg flex items-center gap-2"
                >
                  <i className={`fa-solid ${compartido ? "fa-check" : "fa-share-nodes"}`} aria-hidden="true" />
                  {compartido ? "¡Listo!" : "Compartir"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
