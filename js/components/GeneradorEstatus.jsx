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
      <div className="fixed inset-0 bg-black/5 backdrop-blur-[2px] z-[250] flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-lg border border-zinc-200 shadow-xl w-full max-w-5xl animate-zoom-in my-auto flex flex-col overflow-hidden" style={{maxHeight: "min(90vh, 800px)"}}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 shrink-0">
            <h2 className="text-sm font-semibold text-zinc-900">
              {vista === "formulario" ? "Generador de estatus" : "Estatus generado"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>

          {vista === "formulario" ? (
            <form onSubmit={handleGenerar} className="grid grid-cols-2 gap-x-6 p-6 overflow-y-auto bg-white">
              {/* Columna izquierda */}
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-2">Marcas</label>
                  <div className="flex flex-wrap gap-1.5">
                  {marcasDisponibles.map(m => {
                    const seleccionada = marcasSeleccionadas.some(ms => marcasCoinciden(ms, m));
                    const estilo = getMarcaStyle(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleMarca(m)}
                        className={`text-xs font-medium px-2.5 py-1.5 rounded border transition-colors ${
                          seleccionada
                            ? `${estilo.surface} border-current`
                            : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                        }`}
                      >
                        {formatearMarca(m)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-2">Estados a incluir</label>
                <div className={`flex flex-wrap gap-1.5 ${organizarPor === "espera-comentarios" ? "opacity-50 pointer-events-none" : ""}`}>
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
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded border transition-colors ${
                          seleccionado
                            ? `${config?.bg || "bg-zinc-50"} border-current`
                            : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config?.dot || "bg-zinc-400"}`}></span>
                        {estado}
                      </button>
                    );
                  })}
                </div>
                {organizarPor === "espera-comentarios" && (
                  <p className="mt-2 text-[11px] text-zinc-500">
                    Este modo usa solo tareas en <span className="font-medium">Seguimiento</span> (espera al cliente).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-2">
                  Personas <span className="font-normal text-zinc-400">(opcional)</span>
                </label>
                <SelectorPersonasChips
                  personasSeleccionadas={personasFiltro}
                  onChange={setPersonasFiltro}
                  listaGlobal={personasDisponibles}
                  registrarNuevaPersona={registrarNuevaPersona}
                  titulo="Personas"
                />
              </div>
              </div>

              {/* Columna derecha */}
              <div className="space-y-5">
              {subclientesDisponibles.length > 0 && (
                <div className="rounded border border-zinc-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSubclientesDesplegados((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
                    aria-expanded={subclientesDesplegados}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <i
                        className={`fa-solid ${subclientesDesplegados ? "fa-chevron-down" : "fa-chevron-right"} text-[10px] text-zinc-400 shrink-0`}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-medium text-zinc-600">
                        Subclientes
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-zinc-500 shrink-0">
                      {subclientesFiltro.length > 0
                        ? `${subclientesFiltro.length} de ${subclientesDisponibles.length}`
                        : `${subclientesDisponibles.length} disponibles`}
                    </span>
                  </button>

                  {subclientesDesplegados && (
                    <div className="px-3 py-2 border-t border-zinc-200">
                      <div className="flex flex-wrap gap-1.5">
                        {subclientesDisponibles.map((nombre) => {
                          const seleccionado = subclientesFiltro.some((s) => subclientesCoinciden(s, nombre));
                          return (
                            <button
                              key={nombre}
                              type="button"
                              onClick={() => toggleSubcliente(nombre)}
                              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded border transition-colors ${
                                seleccionado
                                  ? "bg-zinc-900 text-white border-zinc-900"
                                  : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                              }`}
                            >
                              <i className="fa-solid fa-store text-[10px]" />
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
                <label className="block text-xs font-medium text-zinc-600 mb-2">Organizar estatus</label>
                <div className="flex flex-wrap gap-1.5">
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
                      className={`text-xs font-medium px-2.5 py-1.5 rounded border transition-colors ${
                        organizarPor === opcion.id
                          ? "bg-zinc-900 text-white border-zinc-900"
                          : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      {opcion.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-2">Opciones</label>
                <div className="flex flex-wrap gap-1.5">
                  {organizarPor !== "espera-comentarios" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIncluirSubtareas((v) => !v)}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded border transition-colors ${
                          incluirSubtareas
                            ? "bg-zinc-900 text-white border-zinc-900"
                            : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                        }`}
                        aria-pressed={incluirSubtareas}
                      >
                        <i className={`fa-solid ${incluirSubtareas ? "fa-check-square" : "fa-square"} text-xs`} aria-hidden="true" />
                        {incluirSubtareas ? "Con subtareas" : "Sin subtareas"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIncluirPrioridad((v) => !v)}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded border transition-colors ${
                          incluirPrioridad
                            ? "bg-zinc-900 text-white border-zinc-900"
                            : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                        }`}
                        aria-pressed={incluirPrioridad}
                      >
                        <i className={`fa-solid ${incluirPrioridad ? "fa-check-square" : "fa-square"} text-xs`} aria-hidden="true" />
                        Agregar prioridad
                      </button>
                    </>
                  )}
                  {organizarPor === "espera-comentarios" && (
                    <button
                      type="button"
                      onClick={() => setIncluirDetalle((v) => !v)}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded border transition-colors ${
                        incluirDetalle
                          ? "bg-zinc-900 text-white border-zinc-900"
                          : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                      }`}
                      aria-pressed={incluirDetalle}
                    >
                      <i className={`fa-solid ${incluirDetalle ? "fa-check-square" : "fa-square"} text-xs`} aria-hidden="true" />
                      Agregar detalle
                    </button>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-zinc-400">
                  {organizarPor === "espera-comentarios" 
                    ? "El detalle muestra los entregables específicos con sus links y estados."
                    : "Prioridad marca con ⚠️ las tareas altas. Por defecto no se incluyen subtareas ni prioridad."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-600 mb-2 block">Filtro de fecha</label>
                  <select
                    value={filtroTiempo}
                    onChange={(e) => setFiltroTiempo(e.target.value)}
                    className="w-full bg-white border border-zinc-200 px-2.5 py-1.5 text-xs rounded focus:border-zinc-400 focus:outline-none text-zinc-700 cursor-pointer hover:border-zinc-300 transition-colors"
                  >
                    <option value="todas">Todas las fechas</option>
                    <option value="hoy">Solo hoy</option>
                    <option value="atrasadas">Solo atrasadas</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600 mb-2 block">Ordenar por</label>
                  <select
                    value={ordenarPor}
                    onChange={(e) => setOrdenarPor(e.target.value)}
                    className="w-full bg-white border border-zinc-200 px-2.5 py-1.5 text-xs rounded focus:border-zinc-400 focus:outline-none text-zinc-700 cursor-pointer hover:border-zinc-300 transition-colors"
                  >
                    <option value="estado">Estado</option>
                    <option value="deadline">Deadline</option>
                  </select>
                </div>
              </div>

              </div>
              </div>

              {marcasSeleccionadas.length > 0 && (
                <p className="text-xs text-zinc-500 px-3 py-2 bg-zinc-50 border border-zinc-100 rounded col-span-2">
                  <span className="font-medium text-zinc-700">{tareasPreview}</span> tarea{tareasPreview !== 1 ? "s" : ""} coinciden con los filtros
                </p>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t border-zinc-100 col-span-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={marcasSeleccionadas.length === 0 || (organizarPor !== "espera-comentarios" && estadosSeleccionados.length === 0)}
                  className="px-4 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Generar estatus
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-4 p-6 overflow-y-auto bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-2">Organizar estatus</label>
                  <div className="flex flex-wrap gap-1.5">
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
                      className={`text-xs font-medium px-2.5 py-1.5 rounded border transition-colors ${
                        organizarPor === opcion.id
                          ? "bg-zinc-900 text-white border-zinc-900"
                          : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      {opcion.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-2">Opciones</label>
                <div className="flex flex-wrap gap-1.5">
                  {organizarPor !== "espera-comentarios" && (
                    <>
                      <button
                        type="button"
                        onClick={() => generarConOpciones(organizarPor, !incluirSubtareas, incluirPrioridad, incluirDetalle)}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded border transition-colors ${
                          incluirSubtareas
                            ? "bg-zinc-900 text-white border-zinc-900"
                            : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                        }`}
                        aria-pressed={incluirSubtareas}
                      >
                        <i className={`fa-solid ${incluirSubtareas ? "fa-check-square" : "fa-square"} text-xs`} aria-hidden="true" />
                        {incluirSubtareas ? "Con subtareas" : "Sin subtareas"}
                      </button>
                      <button
                        type="button"
                        onClick={() => generarConOpciones(organizarPor, incluirSubtareas, !incluirPrioridad, incluirDetalle)}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded border transition-colors ${
                          incluirPrioridad
                            ? "bg-zinc-900 text-white border-zinc-900"
                            : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                        }`}
                        aria-pressed={incluirPrioridad}
                      >
                        <i className={`fa-solid ${incluirPrioridad ? "fa-check-square" : "fa-square"} text-xs`} aria-hidden="true" />
                        Agregar prioridad
                      </button>
                    </>
                  )}
                  {organizarPor === "espera-comentarios" && (
                    <button
                      type="button"
                      onClick={() => generarConOpciones(organizarPor, incluirSubtareas, incluirPrioridad, !incluirDetalle)}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded border transition-colors ${
                        incluirDetalle
                          ? "bg-zinc-900 text-white border-zinc-900"
                          : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                      }`}
                      aria-pressed={incluirDetalle}
                    >
                      <i className={`fa-solid ${incluirDetalle ? "fa-check-square" : "fa-square"} text-xs`} aria-hidden="true" />
                      Agregar detalle
                    </button>
                  )}
                </div>
              </div>
              </div>
              
              <pre className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap font-mono bg-zinc-50 border border-zinc-200 rounded p-4 flex-1 overflow-y-auto">
                {textoGenerado}
              </pre>

              <div className="flex gap-2 justify-end pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setVista("formulario")}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-600 border border-zinc-200 rounded hover:bg-zinc-50 transition-colors"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={handleCopiar}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-100 border border-zinc-200 rounded hover:bg-zinc-200 transition-colors"
                >
                  {copiado ? "¡Copiado!" : "Copiar"}
                </button>
                <button
                  type="button"
                  onClick={handleCompartir}
                  className="px-4 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded hover:bg-zinc-700 transition-colors inline-flex items-center gap-1.5"
                >
                  <i className={`fa-solid ${compartido ? "fa-check" : "fa-share-nodes"} text-xs`} aria-hidden="true" />
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
