function SelectorPersonasChips({
  personasSeleccionadas,
  onChange,
  listaGlobal,
  registrarNuevaPersona,
  variant = "default",
  mostrarBotonTrade = false
}) {
  const [buscar, setBuscar] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef(null);

  const seleccionadasArray = useMemo(() => partesCampoPersonas(personasSeleccionadas), [personasSeleccionadas]);

  const aplicarCambio = (items) => {
    onChange(normalizarCampoPersonas(items.join(", ")));
  };

  const handleTogglePersona = (p) => {
    const objetivos = partesCampoPersonas(p);
    const todosSeleccionados = objetivos.length > 0 && objetivos.every((handle) => seleccionadasArray.includes(handle));

    let nuevas;
    if (todosSeleccionados) {
      const quitar = new Set(objetivos);
      nuevas = seleccionadasArray.filter((item) => !quitar.has(item));
    } else {
      nuevas = [...seleccionadasArray];
      objetivos.forEach((handle) => {
        if (!nuevas.includes(handle)) nuevas.push(handle);
      });
    }
    aplicarCambio(nuevas);
  };

  const handleAddCustom = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      e.preventDefault();
      let val = buscar.trim();
      if (!val) return;
      if (!val.startsWith("@")) val = "@" + val;
      const entrada = obtenerEntradaListaPermitida(val);
      if (!entrada) {
        setBuscar("");
        return;
      }
      registrarNuevaPersona(entrada);
      aplicarCambio([...seleccionadasArray, entrada]);
      setBuscar("");
    }
  };

  const handleAgregarTrade = () => {
    const base = Array.isArray(listaGlobal) ? listaGlobal : [];
    const disenadores = base
      .filter((persona) => {
        const entrada = String(persona || "").trim();
        if (!entrada) return false;
        if (normalizarClavePersona(entrada) === "cliente") return false;
        if (typeof esPersonaDisenador === "function") return esPersonaDisenador(entrada);
        return normalizarClavePersona(entrada) !== "trade";
      })
      .map((persona) => formatearEntradaListaPersona(persona))
      .filter(Boolean);

    aplicarCambio(["@Trade", ...disenadores, ...seleccionadasArray]);
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

  return (
    <div ref={containerRef} className="relative w-full">
      <div 
        onClick={() => setDropdownOpen(true)}
        className={triggerClass}
      >
        {seleccionadasArray.length === 0 ? (
          <span className="text-ui-sm text-zinc-400 font-normal">Vacío</span>
        ) : (
          seleccionadasArray.map(p => (
            <span key={p} className="inline-flex items-center gap-1 bg-zinc-100 text-[#37352F] text-[11px] font-medium px-2 py-0.5 rounded border border-zinc-200">
              {p}
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); handleTogglePersona(p); }}
                className="text-zinc-400 hover:text-red-500 ml-0.5 font-bold"
              >
                &times;
              </button>
            </span>
          ))
        )}
      </div>

      {dropdownOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-zinc-200 rounded shadow-md p-2 flex flex-col gap-2 max-h-48 overflow-y-auto animate-zoom-in">
          <div className="flex gap-1">
            <input 
              type="text"
              placeholder="Escribir o buscar..."
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
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
            {mostrarBotonTrade && (
              <button
                type="button"
                onClick={handleAgregarTrade}
                className="bg-amber-500/90 text-white text-[11px] font-medium px-2.5 py-1 rounded hover:bg-amber-500 transition-colors"
              >
                Trade
              </button>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            {listaGlobal
              .filter(p => p.toLowerCase().includes(buscar.toLowerCase()))
              .map(p => {
                const isSel = personaEstaSeleccionada(p, seleccionadasArray);
                return (
                  <div 
                    key={p}
                    onClick={() => handleTogglePersona(p)}
                    className={`flex items-center justify-between px-2 py-1 rounded text-xs font-medium cursor-pointer ${
                      isSel ? 'bg-zinc-100 text-zinc-900 font-bold' : 'hover:bg-zinc-50 text-zinc-600'
                    }`}
                  >
                    <span>{p}</span>
                    {isSel && <i className="fa-solid fa-check text-zinc-600 text-[10px]"></i>}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 🏠 COMPONENTE: LAYOUT DE HOME (WORKSPACE MINIMALISTA DE NOTION)
// =========================================================================
