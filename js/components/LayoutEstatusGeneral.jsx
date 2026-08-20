function LayoutEstatusGeneral({
  marca,
  tareas,
  onSelectTask,
  onBack,
  nombreMarca,
  listaDisenadores = [],
  puedeEditar = false,
  onEnviarCliente,
  onGuardarComentario,
  onCambiarEnvioTipo
}) {
  const tareasActivas = useMemo(
    () => (tareas || []).filter((t) => (
      typeof esTareaOcultaEnEstatus === "function" ? !esTareaOcultaEnEstatus(t) : true
    )),
    [tareas]
  );
  const gruposSubcliente = useMemo(
    () => (typeof agruparTareasPorSubclienteEstatus === "function"
      ? agruparTareasPorSubclienteEstatus(tareasActivas, marca)
      : []),
    [tareasActivas, marca]
  );
  const gruposPersona = useMemo(
    () => (typeof agruparTareasPorPersonaEstatus === "function"
      ? agruparTareasPorPersonaEstatus(tareasActivas, listaDisenadores)
      : []),
    [tareasActivas, listaDisenadores]
  );
  const [vistaDetalle, setVistaDetalle] = useState("subcliente");
  const etiquetaMarca = (nombreMarca || (typeof formatearMarca === "function" ? formatearMarca(marca) : marca) || "esta marca").trim();
  const grupos = vistaDetalle === "persona" ? gruposPersona : gruposSubcliente;
  const carga = useMemo(
    () => (typeof resumenCargaDisenadoresEstatus === "function"
      ? resumenCargaDisenadoresEstatus(tareasActivas, listaDisenadores)
      : { items: [], totalActivas: 0, lideres: [] }),
    [tareasActivas, listaDisenadores]
  );
  const presentacion = useMemo(
    () => (typeof resumenPresentacionEstatus === "function"
      ? resumenPresentacionEstatus(tareas)
      : {
        activos: tareasActivas.length,
        diseno: 0,
        porEnviar: 0,
        cliente: 0,
        atrasados: 0,
        vencenSemana: 0,
        esperaLarga: 0,
        listo: 0,
        listas: { porEnviar: [], esperaCliente: [], faltaHacer: [] },
        atrasadosItems: [],
        listoItems: []
      }),
    [tareas, tareasActivas.length]
  );
  const listas = presentacion.listas || { porEnviar: [], esperaCliente: [], faltaHacer: [] };
  const [abiertos, setAbiertos] = useState({});
  const [envioPendiente, setEnvioPendiente] = useState("");
  const [disenadorAbierto, setDisenadorAbierto] = useState(null);
  const [comentarioEditando, setComentarioEditando] = useState("");
  const [comentarioDraft, setComentarioDraft] = useState("");
  const [comentarioTip, setComentarioTip] = useState(null);
  const [esperaExpandida, setEsperaExpandida] = useState(false);
  const [faltaExpandida, setFaltaExpandida] = useState(false);
  const [panelSnapshot, setPanelSnapshot] = useState(null);
  const filasEstatus = useMemo(
    () => (typeof filasEstatusReferencia === "function" ? filasEstatusReferencia() : []),
    []
  );

  const etiquetaEnvio = (tarea) => (
    typeof etiquetaEnvioTipoEstatus === "function"
      ? etiquetaEnvioTipoEstatus(tarea, filasEstatus)
      : ""
  );

  const alternarEnvioTipo = (tarea) => {
    if (!onCambiarEnvioTipo) return;
    const actual = typeof obtenerEnvioTipoTarea === "function" ? obtenerEnvioTipoTarea(tarea) : "";
    onCambiarEnvioTipo(tarea, actual === "arte-final" ? "propuesta" : "arte-final");
  };
  const LISTA_VISIBLE_INICIAL = 5;

  const nombresGrupos = grupos.map((g) => g.nombre).join("|");
  useEffect(() => {
    if (vistaDetalle === "persona") return;
    const inicial = {};
    grupos.forEach((g) => { inicial[g.nombre] = true; });
    setAbiertos(inicial);
  }, [nombresGrupos, vistaDetalle]);

  const toggleGrupo = (nombre) => {
    setAbiertos((prev) => ({ ...prev, [nombre]: !prev[nombre] }));
  };

  const titulo = (valor) => (typeof textoEstatusLegible === "function" ? textoEstatusLegible(valor) : valor);
  const tituloEntregable = (info, cadena) => (
    typeof textoEstatusEntregable === "function" ? textoEstatusEntregable(info, cadena) : titulo(info)
  );

  const fechaCorta = (val) => {
    if (!val || val === "—") return "—";
    if (typeof parsearFechaLibre === "function") {
      const parsed = parsearFechaLibre(val);
      if (parsed) {
        const aa = String(parsed.anio).slice(-2);
        return `${String(parsed.dia).padStart(2, "0")}/${String(parsed.mes).padStart(2, "0")}/${aa}`;
      }
    }
    const iso = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1].slice(-2)}`;
    return String(val);
  };

  const linkDeTarea = (t) => {
    if (typeof obtenerLinkTarea === "function") return obtenerLinkTarea(t) || "";
    const parsed = typeof parseDetalles === "function" ? parseDetalles(t?.detalles || "") : {};
    const raw = t?.link || parsed.link || "";
    return typeof normalizarUrlEnlace === "function" ? normalizarUrlEnlace(raw) : String(raw || "").trim();
  };

  const botonCor = (href) => {
    if (!href) return null;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="estatus-cor-btn"
        title="Abrir en Cor"
        onClick={(e) => e.stopPropagation()}
      >
        Cor
        <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
      </a>
    );
  };
  const renderFilaTarea = (t, cadena, grupoNombre) => {
    const cEstado = ESTADOS_MAPA.find((e) => cleanEstado(e.id) === cleanEstado(t.estado)) || { dot: "bg-zinc-400", bg: "" };
    const parsed = parseDetalles(t.detalles || "");
    const partes = notasYComentarioEstatus(parsed.notas);
    const comentario = partes.comentario || partes.notas;
    const fecha = fechaCorta(t.deadline || t.fechaInicio || "—");
    const link = linkDeTarea(t);
    return (
      <tr key={getTaskSelectionKey(t)} onClick={() => onSelectTask(t)}>
        <td className="estatus-notion-title">{tituloEntregable(t.info || "Sin título", cadena || grupoNombre)}</td>
        <td className="estatus-notion-fecha">{fecha}</td>
        <td>
          <span className={`estatus-task-estado ${cEstado.bg || ""}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cEstado.dot}`} />
            {normalizarEstado(t.estado) || "Sin estado"}
          </span>
        </td>
        <td className="estatus-notion-coment">
          <span className="estatus-notion-coment-row">
            <span>{comentario || "—"}</span>
            {botonCor(link)}
          </span>
        </td>
      </tr>
    );
  };

  const renderTablaGrupo = (grupo) => {
    const abierto = abiertos[grupo.nombre] !== false;
    return (
      <section key={grupo.nombre} className="estatus-notion-group">
        <div className="estatus-notion-head">
          <button type="button" className="estatus-notion-head-toggle" onClick={() => toggleGrupo(grupo.nombre)}>
            <i className={`fa-solid ${abierto ? "fa-chevron-down" : "fa-chevron-right"}`} />
            <span className="estatus-cadena-title">{titulo(grupo.nombre)}</span>
          </button>
          <span className="estatus-cadena-count">{grupo.tareas.length}</span>
        </div>
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
                  const cadena = typeof obtenerSubclienteTarea === "function"
                    ? obtenerSubclienteTarea(t)
                    : (t.subcliente || "");
                  return renderFilaTarea(t, cadena, grupo.nombre);
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  };

  const renderGrupoPersona = (grupo) => {
    const subgrupos = grupo.subgrupos && grupo.subgrupos.length
      ? grupo.subgrupos
      : [{ nombre: "Sin cadena", tareas: grupo.tareas || [] }];
    const total = subgrupos.reduce((n, sub) => n + (sub.tareas || []).length, 0);

    return (
      <section key={grupo.nombre} className="estatus-notion-group estatus-notion-group--persona">
        <div className="estatus-persona-head">
          <span className="estatus-cadena-title">{titulo(grupo.nombre)}</span>
          <span className="estatus-cadena-count">{total}</span>
        </div>
        {subgrupos.map((sub) => (
          <div key={`${grupo.nombre}-${sub.nombre}`} className="estatus-cadena-subgroup">
            <div className="estatus-cadena-subhead">
              <span>{titulo(sub.nombre) || "Sin cadena"}</span>
              <span>{(sub.tareas || []).length}</span>
            </div>
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
                  {(sub.tareas || []).map((t) => renderFilaTarea(t, sub.nombre, grupo.nombre))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>
    );
  };

  const maxCarga = Math.max(1, ...(carga.items || []).map((item) => item.activas || 0));
  const hintCarga = !carga.lideres || !carga.lideres.length
    ? "Nadie tiene carga ahora. Cuenta Pendiente, En progreso y En revisión, según diseño → contenido → ejecutivo."
    : carga.lideres.length === 1
      ? `Más carga ahora: ${carga.lideres[0].nombre} (${carga.lideres[0].activas}).`
      : `Misma carga: ${carga.lideres.map((l) => l.nombre).join(" y ")}.`;

  const confirmarEnvio = (tarea, tipo) => {
    if (onEnviarCliente) onEnviarCliente(tarea, tipo);
    setEnvioPendiente("");
  };

  const abrirEditorComentario = (key, comentarioActual) => {
    setComentarioEditando(key);
    setComentarioDraft(comentarioActual || "");
  };

  const cerrarEditorComentario = () => {
    setComentarioEditando("");
    setComentarioDraft("");
  };

  const guardarComentario = (tarea) => {
    if (!onGuardarComentario) return;
    onGuardarComentario(tarea, comentarioDraft);
    cerrarEditorComentario();
  };

  const textoTipComentario = (valor) => {
    if (typeof htmlNotasAPlainText === "function") return htmlNotasAPlainText(valor);
    return String(valor || "").trim();
  };

  const mostrarTipComentario = (event, comentario) => {
    const texto = textoTipComentario(comentario);
    if (!texto) {
      setComentarioTip(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const maxW = Math.min(320, window.innerWidth - 24);
    let left = rect.left;
    if (left + maxW > window.innerWidth - 12) left = Math.max(12, window.innerWidth - maxW - 12);
    const espacioAbajo = window.innerHeight - rect.bottom;
    const colocarArriba = espacioAbajo < 96 && rect.top > espacioAbajo;
    setComentarioTip({
      texto,
      left,
      top: colocarArriba ? rect.top : rect.bottom,
      arriba: colocarArriba,
      maxW
    });
  };

  const ocultarTipComentario = () => setComentarioTip(null);

  useEffect(() => {
    if (!comentarioTip) return undefined;
    const hide = () => setComentarioTip(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [comentarioTip]);

  const abrirPanelSnapshot = (key) => {
    const paneles = {
      diseno: { titulo: "Por hacer", items: listas.faltaHacer || [], modo: "diseno" },
      enviar: { titulo: "Por enviar", items: listas.porEnviar || [], modo: "enviar" },
      cliente: { titulo: "Con el cliente", items: listas.esperaCliente || [], modo: "cliente" },
      atrasados: { titulo: "Atrasados", items: presentacion.atrasadosItems || [], modo: "atrasados" },
      listo: { titulo: "Listo esta semana", items: presentacion.listoItems || [], modo: "listo" }
    };
    const panel = paneles[key];
    if (!panel) return;
    setPanelSnapshot(panel);
  };

  const etiquetaDiasItem = (tarea, modo) => (
    typeof etiquetaDiasSnapshotEstatus === "function"
      ? etiquetaDiasSnapshotEstatus(tarea, modo)
      : ""
  );

  const itemDisenador = disenadorAbierto
    ? ((carga.items || []).find((i) => i.handle === disenadorAbierto.handle) || disenadorAbierto)
    : null;
  const filasDisenador = itemDisenador?.tareasActivas || [];

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
          <p className="estatus-lista-empty">No tiene entregables activos en {etiquetaMarca}</p>
        ) : (
          <ul className="estatus-mini-sheet-list">
            {filasDisenador.map((row) => {
              const t = row.tarea;
              const cEstado = ESTADOS_MAPA.find((e) => cleanEstado(e.id) === cleanEstado(t.estado)) || { dot: "bg-zinc-400", bg: "" };
              return (
                <li key={getTaskSelectionKey(t)}>
                  <button type="button" className="estatus-enviar-main estatus-enviar-main--solo" onClick={() => onSelectTask(t)}>
                    <span className="estatus-item-title">{tituloEntregable(row.entregable, row.cadena)}</span>
                    <span className="estatus-item-subtitle">{titulo(row.cadena) || "Sin cadena"}</span>
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

  const overlaySnapshot = panelSnapshot ? (
    <div className="estatus-mini-overlay" onClick={() => setPanelSnapshot(null)}>
      <div
        className="estatus-mini-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={panelSnapshot.titulo}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="estatus-mini-sheet-head">
          <button type="button" className="estatus-mini-sheet-back" onClick={() => setPanelSnapshot(null)}>
            <i className="fa-solid fa-chevron-left" />
            <span>Estatus</span>
          </button>
          <div className="estatus-mini-sheet-title">
            <strong>{panelSnapshot.titulo}</strong>
            <span>{(panelSnapshot.items || []).length} entregables</span>
          </div>
        </header>
        {(panelSnapshot.items || []).length === 0 ? (
          <p className="estatus-lista-empty">No hay entregables en este grupo</p>
        ) : (
          <ul className="estatus-mini-sheet-list">
            {(panelSnapshot.items || []).map((item) => {
              const t = item.tarea;
              const dias = etiquetaDiasItem(t, panelSnapshot.modo);
              return (
                <li key={getTaskSelectionKey(t)}>
                  <button
                    type="button"
                    className="estatus-enviar-main estatus-enviar-main--solo"
                    onClick={() => {
                      setPanelSnapshot(null);
                      onSelectTask(t);
                    }}
                  >
                    <span className="estatus-item-title">{tituloEntregable(item.entregable, item.cadena)}</span>
                    <span className="estatus-item-subtitle">{titulo(item.cadena) || "Sin cadena"}</span>
                    <em className="estatus-carga-task-meta">
                      <span className={`estatus-chip ${/atrasado/i.test(dias) ? "is-late" : (panelSnapshot.modo === "cliente" ? "is-wait" : "is-week")}`}>
                        {dias}
                      </span>
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

  const renderListaFalta = (items) => {
    const restantes = Math.max(0, items.length - LISTA_VISIBLE_INICIAL);
    const visibles = faltaExpandida || restantes === 0
      ? items
      : items.slice(0, LISTA_VISIBLE_INICIAL);
    return (
      <section className="estatus-lista-card estatus-lista-card--falta">
        <div className="estatus-lista-card-head">
          <h3>Falta por hacer</h3>
          <span>{items.length}</span>
        </div>
        {items.length === 0 ? (
          <p className="estatus-lista-empty">Nada pendiente internamente</p>
        ) : (
          <>
            <ul>
              {visibles.map((item) => {
                const t = item.tarea;
                const cEstado = ESTADOS_MAPA.find((e) => cleanEstado(e.id) === cleanEstado(t.estado)) || { dot: "bg-zinc-400", bg: "" };
                return (
                  <li key={getTaskSelectionKey(t)}>
                    <button type="button" className="estatus-enviar-main estatus-enviar-main--solo" onClick={() => onSelectTask(t)}>
                      <span className="estatus-item-title">{tituloEntregable(item.entregable, item.cadena)}</span>
                      <span className="estatus-item-subtitle">{titulo(item.cadena) || "Sin cadena"}</span>
                      <em className="estatus-carga-task-meta">
                        <span className={`estatus-task-estado ${cEstado.bg || ""}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cEstado.dot}`} />
                          {normalizarEstado(t.estado) || "Sin estado"}
                        </span>
                      </em>
                    </button>
                  </li>
                );
              })}
            </ul>
            {restantes > 0 ? (
              <button
                type="button"
                className={`estatus-espera-more ${faltaExpandida ? "is-collapse" : ""}`}
                onClick={() => setFaltaExpandida((v) => !v)}
                aria-label={faltaExpandida ? "Ocultar pendientes" : `Ver ${restantes} más`}
              >
                {faltaExpandida ? (
                  <i className="fa-solid fa-chevron-up" aria-hidden="true" />
                ) : (
                  `${restantes}+`
                )}
              </button>
            ) : null}
          </>
        )}
      </section>
    );
  };

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
                    <span className="estatus-item-title">{tituloEntregable(item.entregable, item.cadena)}</span>
                    <span className="estatus-item-subtitle">{titulo(item.cadena) || "Sin cadena"}</span>
                  </button>
                  {etiquetaEnvio(item.tarea) ? (
                    puedeEditar && onCambiarEnvioTipo ? (
                      <button
                        type="button"
                        className="estatus-enviar-tipo"
                        onClick={() => alternarEnvioTipo(item.tarea)}
                        title="Clic para cambiar entre propuesta y arte final"
                      >
                        {etiquetaEnvio(item.tarea)}
                      </button>
                    ) : (
                      <span className="estatus-enviar-tipo estatus-enviar-tipo--static">
                        {etiquetaEnvio(item.tarea)}
                      </span>
                    )
                  ) : null}
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

  const renderListaEspera = (items) => {
    const restantes = Math.max(0, items.length - LISTA_VISIBLE_INICIAL);
    const visibles = esperaExpandida || restantes === 0
      ? items
      : items.slice(0, LISTA_VISIBLE_INICIAL);

    return (
    <section className="estatus-lista-card estatus-lista-card--espera">
      <div className="estatus-lista-card-head">
        <h3>Espera de comentarios</h3>
        <span>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="estatus-lista-empty">Nada en espera de comentarios</p>
      ) : (
        <div className="estatus-espera-table-wrap">
          <div className="estatus-espera-table-head" aria-hidden="true">
            <span>Cadena</span>
            <span>Entregable</span>
            <span>Comentario</span>
            <span />
          </div>
          <ul className="estatus-espera-table">
            {visibles.map((item) => {
              const key = getTaskSelectionKey(item.tarea);
              const comentario = String(item.comentario || "").trim();
              const editando = comentarioEditando === key;
              return (
                <li key={key} className={editando ? "is-open" : ""}>
                  <div className="estatus-espera-table-row">
                    <button
                      type="button"
                      className="estatus-espera-cell estatus-espera-cell--cadena"
                      onClick={() => onSelectTask(item.tarea)}
                    >
                      {titulo(item.cadena) || "Sin cadena"}
                    </button>
                    <button
                      type="button"
                      className="estatus-espera-cell estatus-espera-cell--entregable"
                      onClick={() => onSelectTask(item.tarea)}
                    >
                      {tituloEntregable(item.entregable, item.cadena)}
                    </button>
                    <span
                      className={`estatus-espera-coment-wrap ${comentario ? "has-tip" : ""}`}
                      onMouseEnter={(e) => mostrarTipComentario(e, comentario)}
                      onMouseLeave={ocultarTipComentario}
                    >
                      <span
                        className={`estatus-espera-cell estatus-espera-cell--coment ${comentario ? "" : "is-empty"}`}
                      >
                        {comentario || "—"}
                      </span>
                    </span>
                    {puedeEditar && onGuardarComentario ? (
                      <button
                        type="button"
                        className={`estatus-comentario-btn estatus-comentario-btn--icon ${editando ? "is-open" : ""}`}
                        aria-label={comentario ? "Editar comentario" : "Añadir comentario"}
                        onClick={() => (editando ? cerrarEditorComentario() : abrirEditorComentario(key, comentario))}
                      >
                        <i className={`fa-${comentario ? "solid" : "regular"} fa-comment`} />
                      </button>
                    ) : (
                      <span className="estatus-espera-cell estatus-espera-cell--action" aria-hidden="true" />
                    )}
                  </div>
                  {editando ? (
                    <div className="estatus-comentario-editor estatus-comentario-editor--inline">
                      <textarea
                        value={comentarioDraft}
                        onChange={(e) => setComentarioDraft(e.target.value)}
                        placeholder="Comentario del cliente…"
                        rows={2}
                      />
                      <div className="estatus-comentario-editor-actions">
                        <button type="button" className="estatus-comentario-cancel" onClick={cerrarEditorComentario}>
                          Cancelar
                        </button>
                        <button type="button" className="estatus-comentario-save" onClick={() => guardarComentario(item.tarea)}>
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {restantes > 0 ? (
            <button
              type="button"
              className={`estatus-espera-more ${esperaExpandida ? "is-collapse" : ""}`}
              onClick={() => setEsperaExpandida((v) => !v)}
              aria-label={esperaExpandida ? "Ocultar pendientes" : `Ver ${restantes} más`}
            >
              {esperaExpandida ? (
                <i className="fa-solid fa-chevron-up" aria-hidden="true" />
              ) : (
                `${restantes}+`
              )}
            </button>
          ) : null}
        </div>
      )}
    </section>
    );
  };

  const overlays = (
    <>
      {overlayDisenador}
      {overlaySnapshot}
    </>
  );
  const portalOverlay = (overlayDisenador || overlaySnapshot) && typeof ModalPortal === "function"
    ? <ModalPortal>{overlays}</ModalPortal>
    : overlays;

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

      <section className="estatus-semana">
        <div className="estatus-section-label">Resumen de la semana</div>
        <ul className="estatus-snapshot">
          {[
            { key: "activos", label: "Activos", value: presentacion.activos },
            { key: "diseno", label: "Por hacer", value: presentacion.diseno, panel: true },
            { key: "enviar", label: "Por enviar", value: presentacion.porEnviar, panel: true },
            { key: "cliente", label: "Con el cliente", value: presentacion.cliente, panel: true },
            { key: "listo", label: "Listo", value: presentacion.listo, panel: true },
            { key: "atrasados", label: "Atrasados", value: presentacion.atrasados, late: true, panel: true }
          ].map((tile) => {
            const clase = `estatus-snapshot-tile ${tile.late && tile.value > 0 ? "is-late" : ""} ${tile.panel ? "is-btn" : ""}`;
            const inner = (
              <>
                <strong>{tile.value}</strong>
                <span>{tile.label}</span>
              </>
            );
            return (
              <li key={tile.key}>
                {tile.panel ? (
                  <button type="button" className={clase} onClick={() => abrirPanelSnapshot(tile.key)}>
                    {inner}
                  </button>
                ) : (
                  <div className={clase}>{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="estatus-section-hint">
          {presentacion.vencenSemana} vencen esta semana
          {" · "}
          {presentacion.esperaLarga} llevan 7+ días con el cliente
        </p>
        <div className="estatus-flujo">
          <div className="estatus-flujo-track">
            {[
              { key: "diseno", label: "Diseño", value: presentacion.diseno, color: "#2F7A4E" },
              { key: "enviar", label: "Por enviar", value: presentacion.porEnviar, color: "#40916C" },
              { key: "cliente", label: "Cliente", value: presentacion.cliente, color: "#74C69D" },
              { key: "listo", label: "Listo", value: presentacion.listo, color: "#D8F3DC" }
            ].filter((seg) => seg.value > 0).map((seg) => (
              <div
                key={seg.key}
                className="estatus-flujo-cell"
                style={{ flexGrow: seg.value }}
              >
                <div className="estatus-flujo-seg" style={{ background: seg.color }} />
                <span className="estatus-flujo-tip">({seg.value}) {seg.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="estatus-carga-panel estatus-carga-panel--bars">
        <div className="estatus-section-label">Carga del equipo</div>
        <p className="estatus-section-hint">{hintCarga}</p>
        {(carga.items || []).length === 0 ? (
          <p className="estatus-lista-empty">Sin personas con carga activa</p>
        ) : (
          <ul className="estatus-carga-bars">
            {(carga.items || []).map((item) => {
              const pct = Math.round(((item.activas || 0) / maxCarga) * 100);
              return (
                <li key={item.handle}>
                  <button
                    type="button"
                    className="estatus-carga-bar-row"
                    onClick={() => setDisenadorAbierto(item)}
                  >
                    <span className="estatus-carga-bar-person">
                      <span className="estatus-carga-bar-label">{item.nombre}</span>
                      <span className="estatus-carga-bar-rol">{item.rolLabel || "Diseño"}</span>
                    </span>
                    <div className="estatus-carga-bar-track">
                      <div
                        className="estatus-carga-bar-fill"
                        style={{ width: `${pct}%`, background: item.color }}
                      />
                    </div>
                    <span className="estatus-carga-bar-count">{item.activas}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="estatus-listas-separated">
        {renderListaFalta(listas.faltaHacer || [])}
        {renderListaEnviar(listas.porEnviar)}
        {renderListaEspera(listas.esperaCliente)}
      </div>

      <div className="estatus-cadenas-head">
        <div>
          <h3>Detalle de entregables</h3>
          <span>{grupos.length} {vistaDetalle === "persona" ? "personas" : "cadenas"} · {tareasActivas.length} entregables</span>
        </div>
        <div className="lista-agrupacion-pills estatus-detalle-pills">
          <button
            type="button"
            onClick={() => setVistaDetalle("subcliente")}
            className={`lista-agrupacion-pill ${vistaDetalle === "subcliente" ? "is-active" : ""}`}
          >
            Por subcliente
          </button>
          <button
            type="button"
            onClick={() => setVistaDetalle("persona")}
            className={`lista-agrupacion-pill ${vistaDetalle === "persona" ? "is-active" : ""}`}
          >
            Por persona
          </button>
        </div>
      </div>

      {grupos.length === 0 ? (
        <div className="marca-subclientes-empty">
          {vistaDetalle === "persona"
            ? "Aún no hay entregables activos con persona asignada."
            : `Aún no hay entregables con cadena en ${etiquetaMarca}.`}
        </div>
      ) : (
        <div className="estatus-notion">
          {grupos.map((grupo) => (
            vistaDetalle === "persona" ? renderGrupoPersona(grupo) : renderTablaGrupo(grupo)
          ))}
        </div>
      )}
      {portalOverlay}
      {comentarioTip && typeof ModalPortal === "function" ? (
        <ModalPortal>
          <div
            className={`estatus-espera-coment-float ${comentarioTip.arriba ? "is-above" : ""}`}
            style={{
              left: `${comentarioTip.left}px`,
              top: `${comentarioTip.top}px`,
              maxWidth: `${comentarioTip.maxW}px`
            }}
            role="tooltip"
          >
            {comentarioTip.texto}
          </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}
