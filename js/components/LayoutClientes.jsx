function ListaPersonasEditor({ items, onChange, placeholder, showTipo, tipoPlaceholder }) {
  const actualizar = (index, campo, valor) => {
    const copia = items.map((item, i) => i === index ? { ...item, [campo]: valor } : item);
    onChange(copia);
  };

  const agregar = () => {
    onChange([...items, { nombre: "", tipo: "" }]);
  };

  const eliminar = (index) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2 items-start">
          <div className={`flex-1 grid gap-2 ${showTipo ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
            <input
              type="text"
              placeholder={placeholder}
              value={item.nombre}
              onChange={(e) => actualizar(index, "nombre", e.target.value)}
              className="w-full bg-white/80 border border-zinc-200 px-3 py-1.5 text-xs rounded focus:outline-none font-semibold text-[#37352F]"
            />
            {showTipo && (
              <input
                type="text"
                placeholder={tipoPlaceholder || "Tipo de diseño"}
                value={item.tipo || ""}
                onChange={(e) => actualizar(index, "tipo", e.target.value)}
                className="w-full bg-white/80 border border-zinc-200 px-3 py-1.5 text-xs rounded focus:outline-none font-semibold text-[#37352F]"
              />
            )}
          </div>
          <button
            type="button"
            onClick={() => eliminar(index)}
            className="p-1.5 text-zinc-400 hover:text-red-500 shrink-0 mt-0.5"
            title="Quitar persona"
          >
            <i className="fa-regular fa-trash-can text-[10px]"></i>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={agregar}
        className="self-start text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
      >
        + Añadir persona
      </button>
    </div>
  );
}

function BloquePersonasLectura({ titulo, items, mostrarTipo }) {
  return (
    <div>
      <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">{titulo}</span>
      {items.length === 0 ? (
        <p className="text-xs text-zinc-500 italic">Sin asignar</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((p, i) => (
            <li key={i} className="text-xs font-semibold text-[#37352F]">
              {p.nombre}
              {mostrarTipo && p.tipo ? (
                <span className="font-normal text-zinc-500"> · {p.tipo}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LayoutClientes({ marcas, marcasMetadata, canEdit, onSaveBrandMetadata, onRegisterBrand, onDeleteBrand, onAbrirMarca, marcaDetalleInicial, onMarcaDetalleConsumido }) {
  const [vista, setVista] = useState("grid");
  const [selectedBrand, setSelectedBrand] = useState(marcas[0] || "La Santé");
  const [ficha, setFicha] = useState(() => metadataMarcaVacia());

  const [nuevaMarcaNombre, setNuevaMarcaNombre] = useState("");
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [marcaAEliminar, setMarcaAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [fichaSucia, setFichaSucia] = useState(false);

  useEffect(() => {
    if (!marcaDetalleInicial) return;
    const match = marcas.find(m => marcasCoinciden(m, marcaDetalleInicial));
    if (match) {
      setSelectedBrand(match);
      setVista("detalle");
    }
    if (typeof onMarcaDetalleConsumido === "function") {
      onMarcaDetalleConsumido();
    }
  }, [marcaDetalleInicial]);

  useEffect(() => {
    setFicha(obtenerMetadataMarca(marcasMetadata, selectedBrand));
    setFichaSucia(false);
  }, [selectedBrand]);

  useEffect(() => {
    if (fichaSucia) return;
    setFicha(obtenerMetadataMarca(marcasMetadata, selectedBrand));
  }, [marcasMetadata, selectedBrand, fichaSucia]);

  const abrirDetalle = (marca) => {
    setSelectedBrand(marca);
    setVista("detalle");
  };

  const volverAlGrid = () => {
    setVista("grid");
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!canEdit) return;
    const normalizada = normalizarMetadataMarcaEntry(ficha);
    onSaveBrandMetadata(selectedBrand, normalizada);
    setFicha(normalizada);
    setFichaSucia(false);
  };

  const handleAddBrandSubmit = (e) => {
    e.preventDefault();
    if (!canEdit || !nuevaMarcaNombre.trim()) return;
    const nombre = formatearMarca(nuevaMarcaNombre.trim());
    onRegisterBrand({ nuevaMarca: nombre, ...metadataMarcaVacia() });
    setNuevaMarcaNombre("");
    setShowAddBrandModal(false);
    setSelectedBrand(nombre);
    setVista("detalle");
  };

  const actualizarFicha = (campo, valor) => {
    setFichaSucia(true);
    setFicha(prev => ({ ...prev, [campo]: valor }));
  };

  const confirmarEliminarMarca = async () => {
    if (!marcaAEliminar || !onDeleteBrand || eliminando) return;
    setEliminando(true);
    try {
      const ok = await onDeleteBrand(marcaAEliminar);
      if (ok) {
        setMarcaAEliminar(null);
        setVista("grid");
      }
    } finally {
      setEliminando(false);
    }
  };

  const modalEliminarMarca = marcaAEliminar && (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[250] flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white p-5 rounded-md border border-zinc-300 shadow-md w-full max-w-sm animate-zoom-in my-auto flex flex-col gap-4">
          <h4 className="text-xs font-bold uppercase text-zinc-500 tracking-wider border-b pb-2">
            Eliminar cliente
          </h4>
          <p className="text-xs text-zinc-500 leading-relaxed font-semibold">
            ¿Eliminar permanentemente a <span className="text-zinc-800">{formatearMarca(marcaAEliminar)}</span>?
            Se borrará su pestaña en Google Sheets y todos sus entregables.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setMarcaAEliminar(null)}
              disabled={eliminando}
              className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarEliminarMarca}
              disabled={eliminando}
              className="px-4 py-1.5 bg-red-650 hover:bg-red-500 text-white text-xs font-semibold rounded disabled:opacity-50"
            >
              {eliminando ? "Eliminando..." : "Eliminar"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );

  if (vista === "grid") {
    const abrirMarcaCliente = (m) => {
      if (typeof onAbrirMarca === "function") {
        onAbrirMarca(m);
        return;
      }
      abrirDetalle(m);
    };

    return (
      <div className="flex flex-col gap-4 md:gap-5 animate-fade-in">
        <header className="clientes-page-header clientes-page-header--slim-mobile">
          <div className="clientes-page-header__bg" aria-hidden="true">
            <div className="clientes-page-header__orb clientes-page-header__orb--1" />
            <div className="clientes-page-header__orb clientes-page-header__orb--2" />
          </div>
          <div className="clientes-page-header__content">
            <h2 className="clientes-page-header__title">Clientes</h2>
            <p className="clientes-page-header__subtitle hidden md:block">
              Toca un cliente para entrar a su espacio de trabajo.
            </p>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowAddBrandModal(true)}
              className="clientes-page-header__add-btn"
            >
              + Añadir cliente
            </button>
          )}
        </header>

        {marcas.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 text-sm italic border border-dashed border-zinc-200 rounded-md">
            No hay clientes registrados todavía.
          </div>
        ) : (
          <>
            <div className="mobile-widget-grid md:hidden">
              {marcas.map((m) => {
                const cMarca = getMarcaStyle(m);
                return (
                  <div key={m} className="clientes-marca-tile-wrap">
                    {canEdit && onDeleteBrand && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMarcaAEliminar(m);
                        }}
                        className="clientes-marca-tile__delete"
                        title="Eliminar cliente"
                        aria-label={`Eliminar ${formatearMarca(m)}`}
                      >
                        <i className="fa-regular fa-trash-can text-[9px]" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => abrirMarcaCliente(m)}
                      className={`mobile-widget-tile clientes-marca-tile border ${cMarca.surface}`}
                    >
                      <span className="clientes-marca-tile__icon" aria-hidden="true">
                        <SVGIcon.MarcaIcon marca={m} className="w-5 h-5" />
                      </span>
                      <span className="mobile-widget-tile-label">{formatearMarca(m)}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="clientes-marca-grid hidden md:grid">
              {marcas.map((m) => {
                const gradientes = obtenerGradientesMarcaTarjeta(m);
                return (
                  <div key={m} className="clientes-marca-btn-wrap">
                    {canEdit && onDeleteBrand && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMarcaAEliminar(m);
                        }}
                        className="clientes-marca-btn__delete"
                        title="Eliminar cliente"
                      >
                        <i className="fa-regular fa-trash-can text-[10px]"></i>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => abrirMarcaCliente(m)}
                      className="clientes-marca-btn"
                      style={{
                        background: gradientes.card,
                        borderColor: gradientes.border,
                        boxShadow: `0 10px 32px ${gradientes.shadow}`
                      }}
                    >
                      <span className="clientes-marca-btn__name">{formatearMarca(m)}</span>
                      <i className="fa-solid fa-chevron-right clientes-marca-btn__arrow" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {canEdit && showAddBrandModal && (
          <ModalPortal>
          <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[250] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white p-5 rounded-md border border-zinc-300 shadow-md w-full max-w-sm animate-zoom-in my-auto">
              <div className="flex items-center justify-between border-b pb-2 mb-3">
                <span className="text-xs font-bold uppercase text-zinc-500 tracking-wider">Crear Nuevo Cliente</span>
                <button
                  type="button"
                  onClick={() => setShowAddBrandModal(false)}
                  className="text-zinc-400 hover:text-zinc-800 font-bold"
                >
                  &times;
                </button>
              </div>
              <form onSubmit={handleAddBrandSubmit} className="flex flex-col gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Nombre del Cliente / Marca</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Pepsi"
                    value={nuevaMarcaNombre}
                    onChange={(e) => setNuevaMarcaNombre(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 text-xs rounded focus:outline-none font-semibold text-[#37352F]"
                  />
                </div>
                <div className="flex gap-2 justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddBrandModal(false)}
                    className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#37352F] text-white text-xs font-semibold rounded hover:bg-[#2c2a26]"
                  >
                    Crear Cliente
                  </button>
                </div>
              </form>
            </div>
          </div>
          </ModalPortal>
        )}

        {modalEliminarMarca}
      </div>
    );
  }

  const estiloDetalle = getMarcaStyle(selectedBrand);

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="flex items-center gap-3 border-b border-zinc-200 pb-4">
        <button
          type="button"
          onClick={volverAlGrid}
          className="px-2.5 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded bg-white hover:bg-zinc-50 transition-colors"
        >
          ← Todos los clientes
        </button>
        <div>
          <h3 className="text-base font-bold" style={{ color: estiloDetalle.accent }}>
            Ficha Técnica: {formatearMarca(selectedBrand)}
          </h3>
          <p className="text-xs text-zinc-400">
            {canEdit ? "Parámetros corporativos y recursos de diseño asociados." : "Consulta de información del cliente."}
          </p>
        </div>
      </div>

      <div
        className="border border-zinc-200 p-6 rounded-md flex flex-col gap-6 bg-white border-l-[3px]"
        style={{ borderLeftColor: estiloDetalle.accent }}
      >
        {canEdit ? (
          <form onSubmit={handleSave} className="flex flex-col gap-5">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Cliente directo</label>
              <p className="text-[10px] text-zinc-400 mb-2">Persona de la empresa cliente que habla con la agencia.</p>
              <input
                type="text"
                placeholder="Ej: María González"
                value={ficha.clienteDirecto}
                onChange={(e) => actualizarFicha("clienteDirecto", e.target.value)}
                className="w-full bg-white/80 border border-zinc-200 px-3 py-1.5 text-xs rounded focus:outline-none font-semibold text-[#37352F]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Ejecutivos de Trade Marketing</label>
              <ListaPersonasEditor
                items={ficha.ejecutivos.length ? ficha.ejecutivos : [{ nombre: "", tipo: "" }]}
                onChange={(items) => actualizarFicha("ejecutivos", items)}
                placeholder="Nombre del ejecutivo"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Diseñadores</label>
              <ListaPersonasEditor
                items={ficha.disenadores.length ? ficha.disenadores : [{ nombre: "", tipo: "" }]}
                onChange={(items) => actualizarFicha("disenadores", items)}
                placeholder="Nombre del diseñador"
                showTipo
                tipoPlaceholder="Ej: POP, Digital, Packaging..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Content</label>
              <ListaPersonasEditor
                items={ficha.contentEquipo.length ? ficha.contentEquipo : [{ nombre: "", tipo: "" }]}
                onChange={(items) => actualizarFicha("contentEquipo", items)}
                placeholder="Nombre del content"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Brand Guidelines / Notas Técnicas</label>
              <textarea
                rows="8"
                placeholder="Paleta de colores, tipografías, accesos web y lineamientos de marca."
                value={ficha.notas}
                onChange={(e) => actualizarFicha("notas", e.target.value)}
                className="w-full bg-white/80 border border-zinc-200 p-3 text-xs rounded focus:outline-none font-semibold text-[#37352F]"
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-zinc-200/60 gap-2">
              {onDeleteBrand && (
                <button
                  type="button"
                  onClick={() => setMarcaAEliminar(selectedBrand)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 text-xs font-semibold rounded transition-colors"
                >
                  Eliminar cliente
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-2 bg-[#37352F] text-white hover:bg-[#2c2a26] text-xs font-semibold rounded shadow-sm transition-colors ml-auto"
              >
                Guardar Ficha
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-5">
            {ficha.clienteDirecto && (
              <div>
                <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Cliente directo</span>
                <p className="text-xs font-semibold text-[#37352F]">{ficha.clienteDirecto}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BloquePersonasLectura titulo="Ejecutivos de Trade Marketing" items={ficha.ejecutivos} />
              <BloquePersonasLectura titulo="Content" items={ficha.contentEquipo} />
            </div>

            <BloquePersonasLectura titulo="Diseñadores" items={ficha.disenadores} mostrarTipo />

            <div>
              <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Brand Guidelines / Notas Técnicas</span>
              <p className="text-xs leading-relaxed whitespace-pre-wrap text-[#37352F]">
                {ficha.notas || "Sin notas técnicas registradas."}
              </p>
            </div>
          </div>
        )}
      </div>

      {modalEliminarMarca}
    </div>
  );
}
