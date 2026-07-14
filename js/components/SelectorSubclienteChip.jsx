function SelectorSubclienteChip({
  valor,
  onChange,
  marca,
  listaGlobal,
  registrarNuevoSubcliente,
  variant = "default"
}) {
  const [buscar, setBuscar] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef(null);

  const seleccionado = useMemo(() => normalizarNombreSubcliente(valor), [valor]);

  const opciones = useMemo(() => {
    return listarSubclientesPorMarca(listaGlobal, marca).map((s) => s.nombre);
  }, [listaGlobal, marca]);

  const opcionesFiltradas = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    if (!q) return opciones;
    return opciones.filter((n) => n.toLowerCase().includes(q));
  }, [opciones, buscar]);

  const handleSelect = (nombre) => {
    const norm = normalizarNombreSubcliente(nombre);
    if (!norm) return;
    if (subclientesCoinciden(seleccionado, norm)) {
      onChange("");
    } else {
      onChange(norm);
    }
    setBuscar("");
    setDropdownOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
  };

  const handleAddCustom = (e) => {
    if (e.key === "Enter" || e.type === "click") {
      e.preventDefault();
      const val = buscar.trim();
      if (!val || !esNombreSubclienteNuevoValido(val)) return;
      const canon = normalizarNombreSubcliente(val);
      if (!canon) return;
      if (typeof registrarNuevoSubcliente === "function") {
        registrarNuevoSubcliente(marca, canon);
      }
      onChange(canon);
      setBuscar("");
      setDropdownOpen(false);
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

  const puedeCrear = esNombreSubclienteNuevoValido(buscar)
    && !opciones.some((n) => subclientesCoinciden(n, buscar));

  return (
    <div ref={containerRef} className="relative w-full">
      <div onClick={() => setDropdownOpen(true)} className={triggerClass}>
        {!seleccionado ? (
          <span className="text-ui-sm text-zinc-400 font-normal">Sin subcliente</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border bg-zinc-50 text-zinc-700 border-zinc-200">
            <i className="fa-solid fa-store text-[8px] opacity-60" />
            {seleccionado}
            <button
              type="button"
              onClick={handleClear}
              className="text-zinc-400 hover:text-red-500 ml-0.5 font-bold"
            >
              &times;
            </button>
          </span>
        )}
      </div>

      {dropdownOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-zinc-200 rounded shadow-md p-2 flex flex-col gap-2 max-h-52 overflow-y-auto animate-zoom-in">
          <p className="text-[10px] text-zinc-400 px-1 leading-snug">
            Opcional. Busca un subcliente de esta marca o crea uno nuevo.
          </p>
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="Buscar o crear..."
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              onKeyDown={handleAddCustom}
              className="flex-1 bg-zinc-50 border border-zinc-200 text-xs rounded px-2 py-1 focus:outline-none font-medium text-[#37352F]"
              autoFocus
            />
            <button
              type="button"
              onClick={handleAddCustom}
              disabled={!puedeCrear}
              className="bg-zinc-800 text-white text-[11px] font-medium px-2.5 py-1 rounded disabled:opacity-40"
            >
              Añadir
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            {opcionesFiltradas.length === 0 && !puedeCrear ? (
              <p className="text-[11px] text-zinc-400 px-2 py-1.5">
                {buscar.trim() ? "Sin coincidencias" : "Aún no hay subclientes en esta marca"}
              </p>
            ) : (
              opcionesFiltradas.map((nombre) => {
                const isSel = subclientesCoinciden(seleccionado, nombre);
                return (
                  <div
                    key={nombre}
                    onClick={() => handleSelect(nombre)}
                    className={`flex items-center justify-between px-2 py-1 rounded text-xs font-medium cursor-pointer ${
                      isSel ? "bg-zinc-100 text-zinc-900 font-bold" : "hover:bg-zinc-50 text-zinc-600"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <i className="fa-solid fa-store text-[9px] text-zinc-400" />
                      {nombre}
                    </span>
                    {isSel && <i className="fa-solid fa-check text-zinc-600 text-[10px]" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
