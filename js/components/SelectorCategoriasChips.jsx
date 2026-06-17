function SelectorCategoriasChips({ categoriasSeleccionadas, onChange, listaGlobal, registrarNuevaCategoria, variant = "default" }) {
  const [buscar, setBuscar] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef(null);

  const seleccionadas = useMemo(() => partesCampoCategorias(categoriasSeleccionadas), [categoriasSeleccionadas]);
  const principal = seleccionadas[0] || "";
  const subcategorias = seleccionadas.slice(1);

  const aplicarCambio = (items) => {
    const principalNueva = items[0] || "";
    onChange(serializarCategoriasTarea(principalNueva, items.slice(1)));
  };

  const handleToggle = (nombre) => {
    const clave = claveCategoria(nombre);
    const yaEsta = seleccionadas.some((c) => claveCategoria(c) === clave);
    if (yaEsta) {
      aplicarCambio(seleccionadas.filter((c) => claveCategoria(c) !== clave));
      return;
    }
    aplicarCambio([...seleccionadas, normalizarNombreCategoria(nombre)]);
  };

  const handlePromover = (e, nombre) => {
    e.stopPropagation();
    const clave = claveCategoria(nombre);
    const resto = seleccionadas.filter((c) => claveCategoria(c) !== clave);
    aplicarCambio([nombre, ...resto]);
  };

  const handleAddCustom = (e) => {
    if (e.key === "Enter" || e.type === "click") {
      e.preventDefault();
      const val = buscar.trim();
      if (!val || !esNombreCategoriaNuevaValido(val)) return;
      const canon = resolverCategoriaCanonica(val) || normalizarNombreCategoria(val);
      if (!canon) return;
      registrarNuevaCategoria(canon);
      if (!seleccionadas.some((c) => claveCategoria(c) === claveCategoria(val))) {
        aplicarCambio([...seleccionadas, val]);
      }
      setBuscar("");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const triggerClass = variant === "minimal"
    ? "min-h-[28px] w-full bg-transparent border-0 rounded p-0 flex flex-wrap gap-1 items-center cursor-pointer"
    : "min-h-[36px] w-full bg-white border border-zinc-200 rounded p-1.5 flex flex-wrap gap-1 items-center cursor-pointer hover:border-zinc-300 transition-colors";

  const renderChip = (nombre, esPrincipal) => {
    const estilo = obtenerEstiloCategoriaPorNombre(nombre, listaGlobal);
    return (
      <span
        key={nombre}
        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border ${estilo.bg} ${estilo.text} ${estilo.border} ${esPrincipal ? "ring-1 ring-offset-0 ring-zinc-300" : "opacity-90"}`}
        title={esPrincipal ? "Categoría principal (va al título)" : "Subcategoría — clic en la estrella para hacer principal"}
      >
        {esPrincipal ? (
          <i className="fa-solid fa-star text-[8px] opacity-70" />
        ) : (
          <button
            type="button"
            onClick={(e) => handlePromover(e, nombre)}
            className="text-zinc-400 hover:text-amber-500"
            title="Hacer principal"
          >
            <i className="fa-regular fa-star text-[8px]" />
          </button>
        )}
        {nombre}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleToggle(nombre); }}
          className="text-zinc-400 hover:text-red-500 ml-0.5 font-bold"
        >
          &times;
        </button>
      </span>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div onClick={() => setDropdownOpen(true)} className={triggerClass}>
        {seleccionadas.length === 0 ? (
          <span className="text-ui-sm text-zinc-400 font-normal">Sin categoría</span>
        ) : (
          <>
            {principal && renderChip(principal, true)}
            {subcategorias.map((cat) => renderChip(cat, false))}
          </>
        )}
      </div>

      {dropdownOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-zinc-200 rounded shadow-md p-2 flex flex-col gap-2 max-h-52 overflow-y-auto animate-zoom-in">
          <p className="text-[10px] text-zinc-400 px-1 leading-snug">
            La primera es la principal y se agrega al título. Las demás son subcategorías.
          </p>
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="Nueva categoría..."
              value={buscar}
              onChange={(e) => setBuscar(e.target.value.replace(/\s+/g, ""))}
              onKeyDown={handleAddCustom}
              className="flex-1 bg-zinc-50 border border-zinc-200 text-xs rounded px-2 py-1 focus:outline-none font-medium text-[#37352F]"
            />
            <button
              type="button"
              onClick={handleAddCustom}
              className="bg-zinc-800 text-white text-[11px] font-medium px-2.5 py-1 rounded"
            >
              Añadir
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            {listaGlobal
              .filter((c) => c.nombre.toLowerCase().includes(buscar.toLowerCase()))
              .map((c) => {
                const isSel = seleccionadas.some((s) => claveCategoria(s) === claveCategoria(c.nombre));
                const estilo = obtenerEstiloCategoria(c.color);
                return (
                  <div
                    key={c.nombre}
                    onClick={() => handleToggle(c.nombre)}
                    className={`flex items-center justify-between px-2 py-1 rounded text-xs font-medium cursor-pointer ${
                      isSel ? "bg-zinc-100 text-zinc-900 font-bold" : "hover:bg-zinc-50 text-zinc-600"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${estilo.dot}`} />
                      {c.nombre}
                      {isSel && claveCategoria(c.nombre) === claveCategoria(principal) && (
                        <span className="text-[9px] uppercase tracking-wide text-zinc-400">principal</span>
                      )}
                    </span>
                    {isSel && <i className="fa-solid fa-check text-zinc-600 text-[10px]" />}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
