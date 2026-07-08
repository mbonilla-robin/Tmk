function FormularioRapidoEntregable({
  onSubmit,
  onClose,
  marcasDisponibles,
  listaPersonas,
  registrarNuevaPersona,
  marcaDefault = "La Santé"
}) {
  const [info, setInfo] = useState("");
  const [marca, setMarca] = useState(marcaDefault);
  const [deadline, setDeadline] = useState("");
  const [personasDisenadores, setPersonasDisenadores] = useState("");
  const [guardando, setGuardando] = useState(false);

  const listaDisenadores = useMemo(
    () => fusionarListasPersonas(obtenerListaDisenadoresActiva(), partesCampoPersonas(personasDisenadores)),
    [personasDisenadores]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!info.trim()) return;
    if (!normalizarDeadline(deadline)) return;

    setGuardando(true);
    try {
      const tarea = prepararTareaConCategoria({
        marca: normalizarMarca(marca),
        categoria: "Solicitud",
        info: info.trim(),
        personas: combinarEjecutivosYDisenadores("", personasDisenadores),
        detalles: "",
        link: "",
        estado: "Pendiente",
        deadline: normalizarDeadline(deadline),
        fechaInicio: fechaHoyDisplay(),
        prioridad: "Media"
      });
      await Promise.resolve(onSubmit(tarea));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="form-rapido-overlay">
      <button type="button" className="form-rapido-backdrop" onClick={onClose} aria-label="Cerrar" />
      <div className="form-rapido-panel">
        <div className="form-rapido-header">
          <h3 className="form-rapido-title">Entregable rápido</h3>
          <button type="button" onClick={onClose} className="form-rapido-close" aria-label="Cerrar">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-rapido-body">
          <label className="form-rapido-field">
            <span>Título</span>
            <input
              type="text"
              required
              autoFocus
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              placeholder="Ej: Arte PDV La Santé"
              className="form-rapido-input"
            />
          </label>

          <label className="form-rapido-field">
            <span>Cliente</span>
            <select value={marca} onChange={(e) => setMarca(e.target.value)} className="form-rapido-input">
              {marcasDisponibles.map((m) => (
                <option key={m} value={m}>{formatearMarca(m)}</option>
              ))}
            </select>
          </label>

          <label className="form-rapido-field">
            <span>Entrega</span>
            <InputFechaLibre value={deadline} onChange={setDeadline} className="form-rapido-input" required />
          </label>

          <div className="form-rapido-field">
            <span>Diseñador</span>
            <SelectorPersonasChips
              personasSeleccionadas={personasDisenadores}
              onChange={setPersonasDisenadores}
              listaGlobal={listaDisenadores}
              registrarNuevaPersona={registrarNuevaPersona}
              variant="minimal"
              expandirTradeComo="disenadores"
            />
          </div>

          <div className="form-rapido-actions">
            <button type="button" onClick={onClose} className="form-rapido-btn form-rapido-btn--ghost">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="form-rapido-btn form-rapido-btn--primary">
              {guardando ? "Creando…" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
