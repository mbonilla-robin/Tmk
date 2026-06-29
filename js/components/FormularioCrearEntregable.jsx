function PropertyRow({ icon, label, children }) {
  return (
    <div className="task-prop-row group flex items-center min-h-[34px] py-0.5 px-1 -mx-1 rounded hover:bg-zinc-50/80 transition-colors">
      <div className="task-prop-label flex items-center gap-2 w-[128px] shrink-0 text-ui-sm text-zinc-500">
        <i className={`${icon} w-3.5 text-center text-zinc-400 text-[11px]`} />
        <span>{label}</span>
      </div>
      <div className="task-prop-value flex-1 min-w-0">{children}</div>
    </div>
  );
}

function FormularioCrearEntregable({
  nuevaTarea,
  setNuevaTarea,
  onSubmit,
  onCancel,
  marcasDisponibles,
  listaPersonas,
  registrarNuevaPersona,
  listaCategorias,
  registrarNuevaCategoria
}) {
  const [subtareas, setSubtareas] = useState([]);
  const rolesIniciales = dividirCampoPersonasPorRol(nuevaTarea.personas || "");
  const [personasEjecutivos, setPersonasEjecutivos] = useState(rolesIniciales.ejecutivos);
  const [personasDisenadores, setPersonasDisenadores] = useState(rolesIniciales.disenadores);

  const listaEjecutivos = useMemo(
    () => fusionarListasPersonas(obtenerListaEjecutivosActiva(), partesCampoPersonas(personasEjecutivos)),
    [personasEjecutivos]
  );
  const listaDisenadores = useMemo(
    () => fusionarListasPersonas(obtenerListaDisenadoresActiva(), partesCampoPersonas(personasDisenadores)),
    [personasDisenadores]
  );

  const actualizarPersonasEjecutivos = (val) => {
    setPersonasEjecutivos(val);
    setPersonasDisenadores((disenadoresActual) => {
      setNuevaTarea((prev) => ({
        ...prev,
        personas: combinarEjecutivosYDisenadores(val, disenadoresActual)
      }));
      return disenadoresActual;
    });
  };

  const actualizarPersonasDisenadores = (val) => {
    setPersonasDisenadores(val);
    setPersonasEjecutivos((ejecutivosActual) => {
      setNuevaTarea((prev) => ({
        ...prev,
        personas: combinarEjecutivosYDisenadores(ejecutivosActual, val)
      }));
      return ejecutivosActual;
    });
  };

  const estadoVisual = ESTADOS_MAPA.find(e => cleanEstado(e.id) === cleanEstado(nuevaTarea.estado)) || ESTADOS_MAPA[0];
  const inputPropClass = "w-full bg-transparent border-0 text-ui-sm text-[#37352F] focus:outline-none cursor-pointer font-medium";

  const handleSubmit = (e) => {
    e.preventDefault();
    const detallesFinal = serializeDetalles(nuevaTarea.detalles, subtareas, [], nuevaTarea.link);
    const tareaPreparada = prepararTareaConCategoria(nuevaTarea);
    onSubmit(e, detallesFinal, tareaPreparada);
  };

  return (
    <div className="task-form-page task-form-page--standalone w-full animate-fade-in">
      <form onSubmit={handleSubmit}>
        <div className="px-5 md:px-12 lg:px-10 pt-1 pb-5 md:pt-6 md:pb-6">
          <span className="task-form-eyebrow text-ui-sm text-zinc-400">Nuevo entregable</span>
          <input
            type="text"
            required
            autoFocus
            value={nuevaTarea.info}
            onChange={(e) => setNuevaTarea({ ...nuevaTarea, info: e.target.value })}
            placeholder="Sin título"
            className="task-form-title w-full mt-2 text-2xl md:text-[1.75rem] font-bold text-[#37352F] bg-transparent border-0 focus:outline-none placeholder-zinc-300 leading-snug"
          />
        </div>

        <div className="px-5 md:px-12 lg:px-10">
          <div className="pb-2 flex flex-col gap-0.5 border-b border-zinc-100">
            <PropertyRow icon="fa-regular fa-building" label="Cliente">
              <select
                value={nuevaTarea.marca}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, marca: e.target.value })}
                className={inputPropClass}
              >
                {marcasDisponibles.map(m => (
                  <option key={m} value={m}>{formatearMarca(m)}</option>
                ))}
              </select>
            </PropertyRow>

            <PropertyRow icon="fa-regular fa-circle-dot" label="Estado">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${estadoVisual.dot}`} />
                <select
                  value={nuevaTarea.estado}
                  onChange={(e) => setNuevaTarea({ ...nuevaTarea, estado: e.target.value })}
                  className={inputPropClass}
                >
                  {LISTA_ESTADOS_VALIDOS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </PropertyRow>

            <PropertyRow icon="fa-solid fa-signal" label="Prioridad">
              <select
                value={nuevaTarea.prioridad}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, prioridad: e.target.value })}
                className={inputPropClass}
              >
                {PRIORIDADES_MAPA.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </PropertyRow>

            <PropertyRow icon="fa-regular fa-folder" label="Categoría">
              <SelectorCategoriasChips
                categoriasSeleccionadas={nuevaTarea.categoria}
                onChange={(val) => setNuevaTarea({ ...nuevaTarea, categoria: val })}
                listaGlobal={listaCategorias}
                registrarNuevaCategoria={registrarNuevaCategoria}
                variant="minimal"
              />
            </PropertyRow>

            <PropertyRow icon="fa-regular fa-calendar-check" label="Inicio">
              <InputFechaLibre
                value={nuevaTarea.fechaInicio || fechaHoyDisplay()}
                onChange={(val) => setNuevaTarea({ ...nuevaTarea, fechaInicio: val })}
                className={inputPropClass}
              />
            </PropertyRow>

            <PropertyRow icon="fa-regular fa-calendar" label="Entrega">
              <InputFechaLibre
                value={nuevaTarea.deadline}
                onChange={(val) => setNuevaTarea({ ...nuevaTarea, deadline: val })}
                className={inputPropClass}
                required
              />
            </PropertyRow>

            <PropertyRow icon="fa-regular fa-user" label="Ejecutivos">
              <SelectorPersonasChips
                personasSeleccionadas={personasEjecutivos}
                onChange={actualizarPersonasEjecutivos}
                listaGlobal={listaEjecutivos}
                registrarNuevaPersona={registrarNuevaPersona}
                variant="minimal"
              />
            </PropertyRow>

            <PropertyRow icon="fa-regular fa-user" label="Diseñadores">
              <SelectorPersonasChips
                personasSeleccionadas={personasDisenadores}
                onChange={actualizarPersonasDisenadores}
                listaGlobal={listaDisenadores}
                registrarNuevaPersona={registrarNuevaPersona}
                variant="minimal"
              />
            </PropertyRow>
          </div>

          <PropertyRow icon="fa-solid fa-link" label="Enlace">
            <div className="flex items-center gap-2 min-w-0">
              <input
                type="url"
                value={nuevaTarea.link || ""}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, link: e.target.value })}
                placeholder="https://..."
                className="flex-1 min-w-0 bg-transparent border-0 text-ui-sm text-[#37352F] focus:outline-none placeholder-zinc-400"
              />
              {normalizarUrlEnlace(nuevaTarea.link) && (
                <a
                  href={normalizarUrlEnlace(nuevaTarea.link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="task-link-open shrink-0 text-zinc-400 hover:text-blue-600 transition-colors"
                  title="Abrir enlace"
                  onClick={(e) => e.stopPropagation()}
                >
                  <i className="fa-solid fa-arrow-up-right-from-square text-[11px]" />
                </a>
              )}
            </div>
          </PropertyRow>

          <div className="py-4 border-b border-zinc-100">
            <div className="task-section-label flex items-center gap-2 mb-2 text-ui-sm text-zinc-500">
              <i className="fa-regular fa-note-sticky text-zinc-400 text-[11px]" />
              <span>Notas</span>
            </div>
            <EditorNotasRich
              value={nuevaTarea.detalles}
              onChange={(html) => setNuevaTarea({ ...nuevaTarea, detalles: html })}
            />
          </div>

          <ListaSubtareas subtareas={subtareas} onChange={setSubtareas} />

          <div className="task-form-actions task-form-actions--flow px-0 py-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-ui-sm font-medium text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 rounded transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#37352F] text-white text-ui-sm font-medium rounded hover:bg-[#2c2a26] transition-colors"
            >
              Crear entregable
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
