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

  const generarConOpciones = (modoOrganizar = organizarPor) => {
    const texto = generarTextoEstatus(tareas, {
      marcas: marcasSeleccionadas,
      estados: estadosSeleccionados,
      filtroTiempo: filtroTiempo === "todas" ? "" : filtroTiempo,
      ordenarPor,
      organizarPor: modoOrganizar,
      personas: personasFiltroArray,
      subclientes: subclientesFiltro
    });

    setOrganizarPor(modoOrganizar);
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
      <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[250] flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-lg border border-zinc-200 shadow-lg w-full max-w-lg animate-zoom-in my-auto max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between border-b px-5 py-3 border-zinc-200 shrink-0">
            <span className="text-xs font-bold uppercase text-zinc-500 tracking-wider">
              {vista === "formulario" ? "Generador de estatus" : "Estatus generado"}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-800 font-bold text-lg leading-none"
            >
              &times;
            </button>
          </div>

          {vista === "formulario" ? (
            <form onSubmit={handleGenerar} className="flex flex-col gap-4 p-5 overflow-y-auto">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Marcas</label>
                <div className="flex flex-wrap gap-2">
                  {marcasDisponibles.map(m => {
                    const seleccionada = marcasSeleccionadas.some(ms => marcasCoinciden(ms, m));
                    const estilo = getMarcaStyle(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleMarca(m)}
                        className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                          seleccionada
                            ? `${estilo.surface} ring-2 ring-offset-1 ring-zinc-300`
                            : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                        }`}
                      >
                        {formatearMarca(m)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Estados a incluir</label>
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
                        className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                          seleccionado
                            ? `${config?.bg || "bg-zinc-50"} ring-2 ring-offset-1 ring-zinc-300`
                            : "bg-white text-zinc-400 border-zinc-200 hover:border-zinc-300"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${config?.dot || "bg-zinc-400"}`}></span>
                        {estado}
                      </button>
                    );
                  })}
                </div>
                {organizarPor === "espera-comentarios" && (
                  <p className="mt-2 text-[10px] text-zinc-400">
                    Este modo usa solo tareas en <span className="font-semibold">Seguimiento</span> (espera al cliente).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">
                  Personas <span className="font-normal normal-case">(opcional)</span>
                </label>
                <SelectorPersonasChips
                  personasSeleccionadas={personasFiltro}
                  onChange={setPersonasFiltro}
                  listaGlobal={personasDisponibles}
                  registrarNuevaPersona={registrarNuevaPersona}
                  titulo="Personas"
                />
              </div>

              {subclientesDisponibles.length > 0 && (
                <div className="rounded-lg border border-zinc-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSubclientesDesplegados((v) => !v)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
                    aria-expanded={subclientesDesplegados}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <i
                        className={`fa-solid ${subclientesDesplegados ? "fa-chevron-down" : "fa-chevron-right"} text-[9px] text-zinc-400 shrink-0`}
                        aria-hidden="true"
                      />
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">
                        Subclientes{" "}
                        <span className="font-normal normal-case text-zinc-500">(opcional)</span>
                      </span>
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-500 shrink-0">
                      {subclientesFiltro.length > 0
                        ? `${subclientesFiltro.length} de ${subclientesDisponibles.length}`
                        : `${subclientesDisponibles.length} disponibles`}
                    </span>
                  </button>

                  {subclientesDesplegados && (
                    <div className="px-3 py-2.5 border-t border-zinc-200 max-h-36 overflow-y-auto">
                      <div className="flex flex-wrap gap-2">
                        {subclientesDisponibles.map((nombre) => {
                          const seleccionado = subclientesFiltro.some((s) => subclientesCoinciden(s, nombre));
                          return (
                            <button
                              key={nombre}
                              type="button"
                              onClick={() => toggleSubcliente(nombre)}
                              className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                                seleccionado
                                  ? "bg-zinc-100 text-zinc-800 ring-2 ring-offset-1 ring-zinc-300 border-zinc-300"
                                  : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                              }`}
                            >
                              <i className="fa-solid fa-store text-[9px] opacity-60" />
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
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Organizar estatus</label>
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
                      className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                        organizarPor === opcion.id
                          ? "bg-zinc-900 text-white border-zinc-900"
                          : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      {opcion.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-zinc-400 leading-relaxed">
                  {organizarPor === "espera-comentarios" ? (
                    <>
                      Formato: <span className="font-mono">- Espera de comentarios: *Subcliente* (n entregables)</span>.
                      Lista para compartir con el cliente.
                    </>
                  ) : organizarPor === "persona" ? (
                    <>
                      Formato: <span className="font-mono">*@Persona*</span>, luego{" "}
                      <span className="font-mono">*Subcliente*</span> y{" "}
                      <span className="font-mono">- Título | _Estado_ | link</span>.
                      Diseño {'>'} contenido {'>'} ejecutivo. Si hay varios del mismo rol, aparecen todos.
                    </>
                  ) : (
                    <>
                      Formato: <span className="font-mono">*Grupo*</span> y luego{" "}
                      <span className="font-mono">- Título | _Estado_ | link</span>
                    </>
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Filtro de fecha</label>
                  <select
                    value={filtroTiempo}
                    onChange={(e) => setFiltroTiempo(e.target.value)}
                    className="w-full bg-white border border-zinc-200 px-3 py-2 text-xs rounded-lg focus:border-zinc-400 focus:outline-none font-semibold text-[#37352F] cursor-pointer"
                  >
                    <option value="todas">Todas las fechas</option>
                    <option value="hoy">Solo hoy</option>
                    <option value="atrasadas">Solo atrasadas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Ordenar por</label>
                  <select
                    value={ordenarPor}
                    onChange={(e) => setOrdenarPor(e.target.value)}
                    className="w-full bg-white border border-zinc-200 px-3 py-2 text-xs rounded-lg focus:border-zinc-400 focus:outline-none font-semibold text-[#37352F] cursor-pointer"
                  >
                    <option value="estado">Estado</option>
                    <option value="deadline">Deadline</option>
                  </select>
                </div>
              </div>

              {marcasSeleccionadas.length > 0 && (
                <p className="text-[11px] text-zinc-400">
                  {tareasPreview} tarea{tareasPreview !== 1 ? "s" : ""} coinciden con los filtros
                </p>
              )}

              <div className="flex gap-2 justify-end pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 text-xs text-zinc-500 hover:text-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={marcasSeleccionadas.length === 0 || (organizarPor !== "espera-comentarios" && estadosSeleccionados.length === 0)}
                  className="px-4 py-2 bg-[#37352F] text-white text-xs font-semibold rounded-lg hover:bg-[#2c2a26] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Generar estatus
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-4 p-5 overflow-y-auto">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Organizar estatus</label>
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
                      onClick={() => generarConOpciones(opcion.id)}
                      className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                        organizarPor === opcion.id
                          ? "bg-zinc-900 text-white border-zinc-900"
                          : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      {opcion.label}
                    </button>
                  ))}
                </div>
              </div>
              <pre className="text-[12px] text-[#37352F] leading-relaxed whitespace-pre-wrap font-mono bg-zinc-50 border border-zinc-200 rounded-lg p-4 max-h-[50vh] overflow-y-auto">
                {textoGenerado}
              </pre>

              <div className="flex gap-2 justify-end pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setVista("formulario")}
                  className="px-3 py-2 text-xs font-semibold text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={handleCopiar}
                  className="px-3 py-2 text-xs font-semibold text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50"
                >
                  {copiado ? "¡Copiado!" : "Copiar"}
                </button>
                <button
                  type="button"
                  onClick={handleCompartir}
                  className="px-4 py-2 bg-[#37352F] text-white text-xs font-semibold rounded-lg hover:bg-[#2c2a26] inline-flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-share-nodes" aria-hidden="true" />
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
