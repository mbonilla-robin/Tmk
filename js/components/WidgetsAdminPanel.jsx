function WidgetsAdminPanel({ widgets, onAddWidget, onEditWidget, onDeleteWidget, marcasDisponibles }) {
  const widgetsVisibles = useMemo(() => {
    return filtrarWidgetsReales(widgets).map(normalizarWidgetDesdeApi).filter(Boolean);
  }, [widgets]);
  const [widgetTitulo, setWidgetTitulo] = useState("");
  const [widgetLink, setWidgetLink] = useState("");
  const [widgetIcon, setWidgetIcon] = useState("link");
  const [widgetColor, setWidgetColor] = useState("sky");
  const [widgetSeccion, setWidgetSeccion] = useState("robin");
  const [widgetMarca, setWidgetMarca] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const resetForm = () => {
    setWidgetTitulo("");
    setWidgetLink("");
    setWidgetIcon("link");
    setWidgetColor("sky");
    setWidgetSeccion("robin");
    setWidgetMarca("");
    setEditingId(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (w) => {
    setEditingId(w.id);
    setWidgetTitulo(w.titulo || "");
    setWidgetLink(w.link || "");
    setWidgetIcon(w.icon || "link");
    setWidgetColor(resolverClaveColorWidget(w.color || "sky"));
    setWidgetSeccion(normalizarSeccionWidget(w.seccion || "robin"));
    setWidgetMarca(w.marca || "");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!widgetTitulo.trim() || !widgetLink.trim()) return;

    const payload = {
      id: editingId || ("WID-" + Date.now()),
      titulo: widgetTitulo.trim(),
      link: widgetLink.trim(),
      icon: widgetIcon,
      color: widgetColor,
      seccion: widgetSeccion,
      marca: widgetMarca || ""
    };

    if (editingId) {
      onEditWidget({ ...payload, id: editingId });
    } else {
      onAddWidget(payload);
    }
    closeModal();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Accesos</span>
        <button
          type="button"
          onClick={openAddModal}
          className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
        >
          + Añadir enlace
        </button>
      </div>

      <div className="bg-zinc-50 p-3 rounded border border-zinc-200 flex flex-col gap-2">
        {widgetsVisibles.length === 0 ? (
          <p className="text-xs text-zinc-400 italic">No hay enlaces registrados.</p>
        ) : (
          widgetsVisibles.map(w => {
            const estilo = getWidgetEstilo(w.color);
            const seccionLabel = WIDGET_SECCIONES[w.seccion]?.label || "Robin";
            const etiqueta = formatearTituloWidget(w.titulo);
            const marcaLabel = w.marca ? formatearMarca(w.marca) : null;
            return (
            <div
              key={w.id}
              className="flex items-center justify-between gap-3 bg-white border border-zinc-200 rounded-lg px-3 py-2.5"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border shrink-0 ${estilo.button}`}>
                  <WidgetIcon iconName={w.icon} className="w-4 h-4" />
                  <span className="text-xs font-semibold whitespace-nowrap">{etiqueta}</span>
                </div>
                <div className="min-w-0 hidden sm:block">
                  <p className="text-[10px] font-semibold text-zinc-500">
                    {seccionLabel}{marcaLabel ? ` · ${marcaLabel}` : ""}
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate">{w.link}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditModal(w)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-800 rounded"
                  title="Editar enlace"
                >
                  <i className="fa-regular fa-pen-to-square text-[10px]"></i>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteWidget(w.id, w.titulo)}
                  className="p-1.5 text-zinc-400 hover:text-red-500 rounded"
                  title="Eliminar enlace"
                >
                  <i className="fa-regular fa-trash-can text-[10px]"></i>
                </button>
              </div>
            </div>
            );
          })
        )}
      </div>

      {showModal && (
        <ModalPortal>
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[250] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white p-5 rounded border border-zinc-200 shadow-md w-full max-w-sm animate-zoom-in my-auto">
            <div className="flex items-center justify-between border-b pb-2.5 mb-3.5 border-zinc-200">
              <span className="text-xs font-bold uppercase text-zinc-500 tracking-wider">
                {editingId ? "Editar enlace" : "Añadir enlace"}
              </span>
              <button
                type="button"
                onClick={closeModal}
                className="text-zinc-400 hover:text-zinc-800 font-bold"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carpeta de Diseños, Drive..."
                  value={widgetTitulo}
                  onChange={(e) => setWidgetTitulo(e.target.value)}
                  className="w-full bg-white border border-zinc-200 px-3 py-1.5 text-xs rounded focus:border-zinc-400 focus:outline-none font-semibold text-[#37352F]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Enlace (URL)</label>
                <input
                  type="url"
                  required
                  placeholder="https://docs.google.com/..."
                  value={widgetLink}
                  onChange={(e) => setWidgetLink(e.target.value)}
                  className="w-full bg-white border border-zinc-200 px-3 py-1.5 text-xs rounded focus:border-zinc-400 focus:outline-none font-semibold text-[#37352F]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Fila en Home</label>
                <select
                  value={widgetSeccion}
                  onChange={(e) => setWidgetSeccion(e.target.value)}
                  className="w-full bg-white border border-zinc-200 px-3 py-1.5 text-xs rounded focus:border-zinc-400 focus:outline-none font-semibold text-[#37352F] cursor-pointer hover:bg-zinc-50 transition-colors"
                >
                  {obtenerOpcionesSeccionWidget().map(op => (
                    <option key={op.id} value={op.id}>{op.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Marca</label>
                <p className="text-[10px] text-zinc-400 mb-1.5">Vacío = solo Home. Con marca = aparece en la vista de esa marca.</p>
                <select
                  value={widgetMarca}
                  onChange={(e) => setWidgetMarca(e.target.value)}
                  className="w-full bg-white border border-zinc-200 px-3 py-1.5 text-xs rounded focus:border-zinc-400 focus:outline-none font-semibold text-[#37352F] cursor-pointer hover:bg-zinc-50 transition-colors"
                >
                  <option value="">Sin marca (solo Home)</option>
                  {(marcasDisponibles || []).map(m => (
                    <option key={m} value={m}>{formatearMarca(m)}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Icono</label>
                  <select
                    value={widgetIcon}
                    onChange={(e) => setWidgetIcon(e.target.value)}
                    className="w-full bg-white border border-zinc-200 px-3 py-1.5 text-xs rounded focus:border-zinc-400 focus:outline-none font-semibold text-[#37352F] cursor-pointer hover:bg-zinc-50 transition-colors"
                  >
                    <option value="link">Enlace</option>
                    <option value="chart">Métricas</option>
                    <option value="folder">Carpeta (Drive)</option>
                    <option value="file">Documento</option>
                    <option value="globe">Web</option>
                    <option value="image">Diseño / Imagen</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Color pastel</label>
                  <select
                    value={widgetColor}
                    onChange={(e) => setWidgetColor(e.target.value)}
                    className="w-full bg-white border border-zinc-200 px-3 py-1.5 text-xs rounded focus:border-zinc-400 focus:outline-none font-semibold text-[#37352F] cursor-pointer hover:bg-zinc-50 transition-colors"
                  >
                    {obtenerOpcionesColorWidget().map(op => (
                      <option key={op.id} value={op.id}>{op.label}</option>
                    ))}
                  </select>
                  <div className={`mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${getWidgetEstilo(widgetColor).button}`}>
                    <WidgetIcon iconName={widgetIcon} className="w-4 h-4" />
                    <span>Vista previa</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-3 border-t pt-3.5 border-zinc-150">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#37352F] text-white text-xs font-semibold rounded hover:bg-[#2c2a26]"
                >
                  {editingId ? "Guardar cambios" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
