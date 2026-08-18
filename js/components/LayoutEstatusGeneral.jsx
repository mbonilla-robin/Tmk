function LayoutEstatusGeneral({
  marca,
  tareas,
  onSelectTask,
  onBack,
  nombreMarca,
  listaDisenadores = [],
  puedeEditar = false,
  onEnviarCliente
}) {
  const tareasActivas = useMemo(
    () => (tareas || []).filter((t) => {
      if (typeof esTareaCompletada === "function" && esTareaCompletada(t)) return false;
      if (typeof esTareaSuspendida === "function" && esTareaSuspendida(t)) return false;
      return true;
    }),
    [tareas]
  );
  const grupos = useMemo(
    () => (typeof agruparTareasPorSubcliente === "function"
      ? agruparTareasPorSubcliente(tareasActivas, marca)
      : []),
    [tareasActivas, marca]
  );
  const carga = useMemo(
    () => (typeof resumenCargaDisenadoresEstatus === "function"
      ? resumenCargaDisenadoresEstatus(tareasActivas, listaDisenadores)
      : { items: [], totalActivas: 0, lideres: [] }),
    [tareasActivas, listaDisenadores]
  );
  const listas = useMemo(
    () => (typeof listasOperativasEstatus === "function"
      ? listasOperativasEstatus(tareas)
      : { porEnviar: [], esperaCliente: [] }),
    [tareas]
  );
  const [abiertos, setAbiertos] = useState({});
  const [envioPendiente, setEnvioPendiente] = useState("");
  const [disenadorAbierto, setDisenadorAbierto] = useState(null);
  const [esperaDesplegada, setEsperaDesplegada] = useState({});

  const nombresGrupos = grupos.map((g) => g.nombre).join("|");
  useEffect(() => {
    const inicial = {};
    grupos.forEach((g) => { inicial[g.nombre] = true; });
    setAbiertos(inicial);
  }, [nombresGrupos]);

  const toggleGrupo = (nombre) => {
    setAbiertos((prev) => ({ ...prev, [nombre]: !prev[nombre] }));
  };

  const titulo = (valor) => (typeof textoEstatusLegible === "function" ? textoEstatusLegible(valor) : valor);
  const tituloEntregable = (info, cadena) => (
    typeof textoEstatusEntregable === "function" ? textoEstatusEntregable(info, cadena) : titulo(info)
  );
  const pieSlices = (carga.items || []).filter((item) => item.activas > 0);
  const pieTotal = carga.totalActivas || 0;
  let pieAcc = 0;
  const pieParts = pieSlices.map((item) => {
    const start = pieAcc;
    pieAcc += pieTotal ? (item.activas / pieTotal) * 100 : 0;
    return `${item.color} ${start}% ${pieAcc}%`;
  });
  const pieBg = pieParts.length
    ? `conic-gradient(${pieParts.join(", ")})`
    : "conic-gradient(#e4e4e7 0 100%)";
  const hintCarga = !carga.lideres || !carga.lideres.length
    ? "Nadie tiene carga ahora. Cuentan Pendiente, En progreso, Seguimiento y En revisión."
    : carga.lideres.length === 1
      ? `Más carga ahora: ${carga.lideres[0].nombre} (${carga.lideres[0].activas}).`
      : `Misma carga: ${carga.lideres.map((l) => l.nombre).join(" y ")}.`;

  const confirmarEnvio = (tarea, tipo) => {
    if (onEnviarCliente) onEnviarCliente(tarea, tipo);
    setEnvioPendiente("");
  };

  const itemDisenador = disenadorAbierto
    ? ((carga.items || []).find((i) => i.handle === disenadorAbierto.handle) || disenadorAbierto)
    : null;
  const filasDisenador = itemDisenador?.tareasActivas || [];

  const toggleEsperaComentarios = (key) => {
    setEsperaDesplegada((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const overlayDisenador = itemDisenador ? (
    <div
      className="estatus-mini-overlay"
      onClick={() => setDisenadorAbierto(null)}
    >
      <div
        className="estatus-mini-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={itemDisenador.nombreCompleto || itemDisenador.nombre}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="estatus-mini-sheet-head">
          <button type="button" className="estatus-mini-sheet-back" onClick={() => setDisenadorAbierto(null)}>
            <i className="fa-solid fa-chevron-left" />
            <span>Estatus</span>
          </button>
          <div className="estatus-mini-sheet-title">
            <strong>{itemDisenador.nombreCompleto || itemDisenador.nombre}</strong>
            <span>{itemDisenador.activas} en carga</span>
          </div>
        </header>
        {filasDisenador.length === 0 ? (
          <p className="estatus-lista-empty">No tiene entregables activos en La Santé</p>
        ) : (
          <ul className="estatus-mini-sheet-list">
            {filasDisenador.map((row) => {
              const t = row.tarea;
              const cEstado = ESTADOS_MAPA.find((e) => cleanEstado(e.id) === cleanEstado(t.estado)) || { dot: "bg-zinc-400", bg: "" };
              return (
                <li key={getTaskSelectionKey(t)}>
                  <button type="button" className="estatus-enviar-main estatus-enviar-main--solo" onClick={() => onSelectTask(t)}>
                    <strong>{titulo(row.cadena) || "Sin cadena"}</strong>
                    <span>{tituloEntregable(row.entregable, row.cadena)}</span>
                    <em className="estatus-carga-task-meta">
                      <span className={`estatus-task-estado ${cEstado.bg || ""}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cEstado.dot}`} />
                        {normalizarEstado(t.estado) || "Sin estado"}
                      </span>
                      {t.deadline || t.fechaInicio || ""}
                    </em>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  ) : null;

  const renderListaEnviar = (items) => (
    <section className="estatus-lista-card">
      <div className="estatus-lista-card-head">
        <h3>Por enviar al cliente</h3>
        <span>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="estatus-lista-empty">Nada pendiente de envío</p>
      ) : (
        <ul>
          {items.map((item) => {
            const key = getTaskSelectionKey(item.tarea);
            const abierto = envioPendiente === key;
            return (
              <li key={key} className={abierto ? "is-open" : ""}>
                <div className="estatus-enviar-row">
                  {puedeEditar && onEnviarCliente ? (
                    <button
                      type="button"
                      className={`estatus-check-btn ${abierto ? "is-open" : ""}`}
                      aria-label="Marcar enviado al cliente"
                      onClick={() => setEnvioPendiente(abierto ? "" : key)}
                    >
                      <i className="fa-solid fa-check" />
                    </button>
                  ) : null}
                  <button type="button" className="estatus-enviar-main" onClick={() => onSelectTask(item.tarea)}>
                    <strong>{titulo(item.cadena) || "Sin cadena"}</strong>
                    <span>{tituloEntregable(item.entregable, item.cadena)}</span>
                  </button>
                </div>
                {abierto ? (
                  <div className="estatus-enviar-menu">
                    <p>¿Qué se envió?</p>
                    <button type="button" onClick={() => confirmarEnvio(item.tarea, "propuesta")}>
                      Propuesta
                      <em>Pasa a espera de comentarios</em>
                    </button>
                    <button type="button" onClick={() => confirmarEnvio(item.tarea, "arte-final")}>
                      Arte final
                      <em>La tarea queda completada</em>
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  const renderListaEspera = (items) => (
    <section className="estatus-lista-card">
      <div className="estatus-lista-card-head">
        <h3>Espera de comentarios</h3>
        <span>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="estatus-lista-empty">Nada en seguimiento con el cliente</p>
      ) : (
        <ul>
          {items.map((item) => {
            const key = getTaskSelectionKey(item.tarea);
            const comentario = String(item.comentario || "").trim();
            const desplegado = Boolean(esperaDesplegada[key]);
            return (
              <li key={key} className={desplegado ? "is-open" : ""}>
                <div className="estatus-espera-row">
                  <button type="button" className="estatus-enviar-main estatus-enviar-main--solo" onClick={() => onSelectTask(item.tarea)}>
                    <strong>{titulo(item.cadena) || "Sin cadena"}</strong>
                    <span>{tituloEntregable(item.entregable, item.cadena)}</span>
                  </button>
                  {comentario ? (
                    <button
                      type="button"
                      className={`estatus-espera-toggle ${desplegado ? "is-open" : ""}`}
                      aria-expanded={desplegado}
                      onClick={() => toggleEsperaComentarios(key)}
                    >
                      <i className={`fa-solid ${desplegado ? "fa-chevron-down" : "fa-chevron-right"}`} />
                      <span>{desplegado ? "Ocultar comentarios" : "Ver comentarios"}</span>
                    </button>
                  ) : null}
                </div>
                {desplegado && comentario ? (
                  <p className="estatus-espera-coment">{comentario}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  const portalOverlay = overlayDisenador && typeof ModalPortal === "function"
    ? <ModalPortal>{overlayDisenador}</ModalPortal>
    : overlayDisenador;

  return (
    <div className="estatus-general-page">
      <MobileSubpageBar
        title="Estatus general"
        onBack={onBack}
        backLabel={nombreMarca}
      />
      <div className="robin-desktop-only marca-info-desktop-bar">
        <button type="button" onClick={onBack} className="marca-info-desktop-back">
          <i className="fa-solid fa-chevron-left text-[10px]" />
          <span>{nombreMarca}</span>
        </button>
        <h2 className="marca-info-desktop-title">Estatus general</h2>
      </div>

      <section className="estatus-carga-panel">
        <div className="estatus-section-label">Carga de diseño</div>
        <p className="estatus-section-hint">{hintCarga}</p>
        <div className="estatus-carga-layout">
          <div className="estatus-carga-pie-wrap">
            <div className="estatus-carga-pie" style={{ background: pieBg }}>
              <div className="estatus-carga-pie-hole">
                <strong>{pieTotal}</strong>
                <span>en carga</span>
              </div>
            </div>
          </div>
          <ul className="estatus-carga-legend">
            {(carga.items || []).map((item) => (
              <li key={item.handle}>
                <button
                  type="button"
                  className="estatus-carga-legend-btn"
                  onClick={() => setDisenadorAbierto(item)}
                >
                  <span className="estatus-carga-dot" style={{ background: item.color }} />
                  <span className="estatus-carga-name">{item.nombre}</span>
                  <span className="estatus-carga-count">
                    <b>{item.activas}</b> en carga
                  </span>
                  <i className="fa-solid fa-chevron-right" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="estatus-listas-grid">
        {renderListaEnviar(listas.porEnviar)}
        {renderListaEspera(listas.esperaCliente)}
      </div>

      <div className="estatus-cadenas-head">
        <h3>Por cadena</h3>
        <span>{grupos.length} cadenas · {tareasActivas.length} entregables</span>
      </div>

      {grupos.length === 0 ? (
        <div className="marca-subclientes-empty">
          Aún no hay entregables con cadena en La Santé. Súbelos desde Configuración → Base de datos.
        </div>
      ) : (
        <div className="estatus-notion">
          {grupos.map((grupo) => {
            const abierto = abiertos[grupo.nombre] !== false;
            return (
              <section key={grupo.nombre} className="estatus-notion-group">
                <button type="button" className="estatus-notion-head" onClick={() => toggleGrupo(grupo.nombre)}>
                  <i className={`fa-solid ${abierto ? "fa-chevron-down" : "fa-chevron-right"}`} />
                  <span className="estatus-cadena-title">{titulo(grupo.nombre)}</span>
                  <span className="estatus-cadena-count">{grupo.tareas.length}</span>
                </button>
                {abierto && (
                  <div className="estatus-notion-table-wrap">
                    <table className="estatus-notion-table">
                      <thead>
                        <tr>
                          <th>Entregable</th>
                          <th>Fecha</th>
                          <th>Estado</th>
                          <th>Comentarios</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.tareas.map((t) => {
                          const cEstado = ESTADOS_MAPA.find((e) => cleanEstado(e.id) === cleanEstado(t.estado)) || { dot: "bg-zinc-400", bg: "" };
                          const parsed = parseDetalles(t.detalles || "");
                          const partes = notasYComentarioEstatus(parsed.notas);
                          const comentario = partes.comentario || partes.notas;
                          const fecha = t.deadline || t.fechaInicio || "—";
                          return (
                            <tr key={getTaskSelectionKey(t)} onClick={() => onSelectTask(t)}>
                              <td className="estatus-notion-title">{tituloEntregable(t.info || "Sin título", grupo.nombre)}</td>
                              <td className="estatus-notion-fecha">{fecha}</td>
                              <td>
                                <span className={`estatus-task-estado ${cEstado.bg || ""}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cEstado.dot}`} />
                                  {normalizarEstado(t.estado) || "Sin estado"}
                                </span>
                              </td>
                              <td className="estatus-notion-coment">{comentario || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
      {portalOverlay}
    </div>
  );
}
