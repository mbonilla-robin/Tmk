function SelectorPersonasChips({
  personasSeleccionadas,
  onChange,
  listaGlobal,
  registrarNuevaPersona,
  variant = "default",
  expandirTradeComo = "equipo"
}) {
  const [buscar, setBuscar] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef(null);

  const seleccionadasArray = useMemo(() => partesCampoPersonas(personasSeleccionadas), [personasSeleccionadas]);

  const aplicarCambio = (items) => {
    onChange(normalizarCampoPersonas(items.join(", ")));
  };

  const obtenerObjetivosTradeDisenadores = () => {
    const base = Array.isArray(listaGlobal) ? listaGlobal : [];
    const objetivos = base
      .filter((persona) => {
        const entrada = String(persona || "").trim();
        if (!entrada) return false;
        const clave = normalizarClavePersona(entrada);
        if (clave === "trade" || clave === "cliente") return false;
        return esPersonaDisenador(entrada);
      })
      .map((persona) => formatearEntradaListaPersona(persona))
      .filter(Boolean);

    return objetivos.length ? objetivos : obtenerListaDisenadoresActiva().filter(esPersonaDisenador);
  };

  const handleTogglePersona = (p) => {
    const esTrade = normalizarClavePersona(p) === "trade";
    const objetivos = esTrade && expandirTradeComo === "disenadores"
      ? obtenerObjetivosTradeDisenadores()
      : partesCampoPersonas(p);
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
      const esTrade = normalizarClavePersona(entrada) === "trade";
      if (esTrade && expandirTradeComo === "disenadores") {
        aplicarCambio([...seleccionadasArray, ...obtenerObjetivosTradeDisenadores()]);
      } else {
        aplicarCambio([...seleccionadasArray, entrada]);
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
            <span key={claveUnicaPersonaLista(p) || p} className="inline-flex items-center gap-1 bg-zinc-100 text-[#37352F] text-[11px] font-medium px-2 py-0.5 rounded border border-zinc-200">
              {etiquetaDisplayListaPersona(p)}
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
          </div>
          <div className="flex flex-col gap-0.5">
            {listaGlobal
              .filter(p => {
                const etiqueta = etiquetaDisplayListaPersona(p);
                const busqueda = buscar.toLowerCase();
                return etiqueta.toLowerCase().includes(busqueda)
                  || p.toLowerCase().includes(busqueda);
              })
              .map(p => {
                const isSel = personaEstaSeleccionada(p, seleccionadasArray);
                const clave = claveUnicaPersonaLista(p);
                return (
                  <div 
                    key={clave || p}
                    onClick={() => handleTogglePersona(p)}
                    className={`flex items-center justify-between px-2 py-1 rounded text-xs font-medium cursor-pointer ${
                      isSel ? 'bg-zinc-100 text-zinc-900 font-bold' : 'hover:bg-zinc-50 text-zinc-600'
                    }`}
                  >
                    <span>{etiquetaDisplayListaPersona(p)}</span>
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
