function etiquetaAutorNotasChat(author, nombreUsuario, usuarioActual) {
  const handle = String(author || "").replace(/^@/, "").trim();
  if (!handle) return "Nota";
  const yo = String(usuarioActual || "").replace(/^@/, "").trim().toLowerCase();
  if (yo && handle.toLowerCase() === yo && nombreUsuario) {
    return String(nombreUsuario).replace(/^@/, "").trim() || handle;
  }
  if (typeof obtenerNombreDisplayEquipo === "function") {
    const display = obtenerNombreDisplayEquipo(handle);
    if (display) return String(display).replace(/^@/, "").trim();
  }
  if (typeof NOMBRES_DISPLAY_EQUIPO !== "undefined" && NOMBRES_DISPLAY_EQUIPO[handle.toLowerCase()]) {
    return String(NOMBRES_DISPLAY_EQUIPO[handle.toLowerCase()]).replace(/^@/, "").trim();
  }
  return handle;
}

function NotasChatConfirmCor({ abierto, onSi, onNo, onCancel }) {
  if (!abierto) return null;
  const overlay = (
    <div className="notas-chat-confirm" role="dialog" aria-modal="true" aria-labelledby="notas-chat-cor-title">
      <div className="notas-chat-confirm__backdrop" aria-hidden="true" onClick={onCancel} />
      <div className="notas-chat-confirm__card">
        <h4 id="notas-chat-cor-title" className="notas-chat-confirm__title">Subir a COR</h4>
        <p className="notas-chat-confirm__copy">¿Quieres subir este ajuste a COR?</p>
        <p className="notas-chat-confirm__hint">
          Si eliges sí, la tarea queda en la lista Por subir en COR.
        </p>
        <div className="notas-chat-confirm__actions">
          <button type="button" className="notas-chat-confirm__cancel" onClick={onNo}>
            No, solo guardar
          </button>
          <button type="button" className="notas-chat-confirm__ok" onClick={onSi}>
            Sí, subir a COR
          </button>
        </div>
      </div>
    </div>
  );
  if (typeof ReactDOM !== "undefined" && ReactDOM.createPortal) {
    return ReactDOM.createPortal(overlay, document.body);
  }
  return overlay;
}

function NotasChatPanel({
  notes,
  usuario,
  nombreUsuario,
  soloLectura = false,
  onCommit,
  disabled = false
}) {
  const [draft, setDraft] = useState("");
  const [editando, setEditando] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [pendienteConfirm, setPendienteConfirm] = useState(null);
  const [migrandoNotas, setMigrandoNotas] = useState(false);
  const composeRef = useRef(null);
  const editRef = useRef(null);

  const { contexto, entradas } = useMemo(() => {
    if (typeof obtenerEntradasNotasChat === "function") {
      return obtenerEntradasNotasChat(notes);
    }
    if (typeof notasYComentarioEstatus === "function" && typeof parseEntradasComentarioEstatus === "function") {
      const partes = notasYComentarioEstatus(notes);
      return {
        contexto: partes.comentario ? String(partes.notas || "").trim() : "",
        entradas: parseEntradasComentarioEstatus(partes.comentario || partes.notas || "")
      };
    }
    const texto = String(notes || "").trim();
    return { contexto: "", entradas: texto ? [{ stamp: "", author: "", texto }] : [] };
  }, [notes]);
  
  // Detectar si las notas necesitan migración
  const necesitaMigracion = useMemo(() => {
    const texto = String(notes || "").trim();
    if (!texto) return false;
    
    // Tiene formato de lista numerada o bullets con @usuario
    const tieneListaNumerada = /^\s*\d+\.\s*@\w+\s*:/m.test(texto);
    const tieneListaBullets = /^\s*[•\-\*]\s*@\w+\s*:/m.test(texto);
    
    // Ya tiene timestamps
    const tieneTimestamps = /\[\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s+\d{1,2}:\d{2}\]/.test(texto);
    
    return (tieneListaNumerada || tieneListaBullets) && !tieneTimestamps;
  }, [notes]);

  useEffect(() => {
    if (!pendienteConfirm) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setPendienteConfirm(null);
    };
    document.addEventListener("keydown", onKey);
    document.documentElement.classList.add("notas-chat-confirm-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("notas-chat-confirm-open");
    };
  }, [pendienteConfirm]);

  useEffect(() => {
    const el = composeRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft]);

  useEffect(() => {
    const el = editRef.current;
    if (!el || !editando) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    el.focus();
  }, [editando, editDraft]);

  const ultimaIdx = entradas.length - 1;

  const pedirConfirmCor = (payload) => {
    setPendienteConfirm(payload);
  };

  const ejecutarCommit = async (payload, pendienteCor) => {
    if (typeof onCommit !== "function" || guardando) return;
    setGuardando(true);
    try {
      await Promise.resolve(onCommit({
        ...payload,
        pendienteCor: Boolean(pendienteCor)
      }));
      if (payload.modo === "add") setDraft("");
      if (payload.modo === "edit") {
        setEditando(false);
        setEditDraft("");
      }
    } finally {
      setGuardando(false);
      setPendienteConfirm(null);
    }
  };

  const handleEnviar = () => {
    const texto = draft.trim();
    if (!texto || guardando || disabled || soloLectura) return;
    pedirConfirmCor({ modo: "add", texto });
  };

  const handleGuardarEdicion = () => {
    const texto = editDraft.trim();
    if (!texto || guardando || disabled || soloLectura) return;
    pedirConfirmCor({ modo: "edit", texto });
  };

  const iniciarEdicion = () => {
    if (soloLectura || ultimaIdx < 0) return;
    setEditDraft(entradas[ultimaIdx].texto || "");
    setEditando(true);
  };

  const cancelarEdicion = () => {
    setEditando(false);
    setEditDraft("");
  };

  const handleComposeKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  const handleEditKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelarEdicion();
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGuardarEdicion();
    }
  };
  
  const handleMigrarNotas = async () => {
    if (typeof migrarNotasDeTexto !== "function" || guardando || soloLectura) return;
    
    setMigrandoNotas(true);
    try {
      const notasMigradas = await migrarNotasDeTexto(notes, new Date());
      
      if (notasMigradas && notasMigradas !== notes && typeof onCommit === "function") {
        // Guardar las notas migradas directamente (sin pasar por el diálogo de COR)
        await Promise.resolve(onCommit({
          modo: "migrar",
          texto: notasMigradas,
          pendienteCor: false
        }));
      }
    } catch (error) {
      console.error("Error migrando notas:", error);
    } finally {
      setMigrandoNotas(false);
    }
  };
  
  return (
    <div className="notas-chat">
      {necesitaMigracion && !soloLectura ? (
        <div className="notas-chat__banner-migracion">
          <div className="notas-chat__banner-contenido">
            <i className="fa-solid fa-info-circle notas-chat__banner-icono" aria-hidden="true" />
            <div className="notas-chat__banner-texto">
              <strong>Notas en formato antiguo</strong>
              <p>Estas notas están en formato de lista. Migra al nuevo formato de chat con burbujas.</p>
            </div>
          </div>
          <button
            type="button"
            className="notas-chat__btn-migrar"
            onClick={handleMigrarNotas}
            disabled={migrandoNotas || guardando || disabled}
          >
            {migrandoNotas ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                {" Migrando..."}
              </>
            ) : (
              <>
                <i className="fa-solid fa-magic" aria-hidden="true" />
                {" Migrar notas"}
              </>
            )}
          </button>
        </div>
      ) : null}
      
      {contexto ? (
        <div className="notas-chat__contexto">
          <span className="notas-chat__contexto-label">Contexto</span>
          <p className="notas-chat__contexto-body">{contexto}</p>
        </div>
      ) : null}

      <div className="notas-chat__thread">
        {entradas.length === 0 ? (
          <p className="notas-chat__empty">Todavía no hay comentarios de ajuste. Escribe el primero abajo.</p>
        ) : (
          entradas.map((entrada, idx) => {
            const esUltima = idx === ultimaIdx;
            const autor = etiquetaAutorNotasChat(entrada.author, nombreUsuario, usuario);
            return (
              <article key={`${entrada.stamp || "x"}-${idx}`} className={`notas-chat__bubble${esUltima ? " is-last" : ""}`}>
                <div className="notas-chat__meta">
                  <span className="notas-chat__author">{autor}</span>
                  {entrada.stamp ? <span className="notas-chat__time">{entrada.stamp}</span> : null}
                  {esUltima && !soloLectura && !editando ? (
                    <button
                      type="button"
                      className="notas-chat__edit-btn"
                      title="Editar último comentario"
                      aria-label="Editar último comentario"
                      onClick={iniciarEdicion}
                      disabled={guardando || disabled}
                    >
                      <i className="fa-solid fa-pen" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
                {esUltima && editando ? (
                  <div className="notas-chat__edit">
                    <textarea
                      ref={editRef}
                      className="notas-chat__textarea"
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      rows={3}
                      disabled={guardando || disabled}
                    />
                    <div className="notas-chat__edit-actions">
                      <button type="button" className="notas-chat__btn-cancel" onClick={cancelarEdicion} disabled={guardando}>
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="notas-chat__btn-save"
                        onClick={handleGuardarEdicion}
                        disabled={guardando || !editDraft.trim()}
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="notas-chat__body">{entrada.texto}</p>
                )}
              </article>
            );
          })
        )}
      </div>

      {!soloLectura ? (
        <div className="notas-chat__compose">
          <textarea
            ref={composeRef}
            className="notas-chat__textarea notas-chat__textarea--compose"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleComposeKeyDown}
            placeholder="Agregar comentario de ajuste…"
            rows={2}
            disabled={guardando || disabled || editando}
          />
          <button
            type="button"
            className={`notas-chat__send${draft.trim() ? " is-ready" : ""}`}
            onClick={handleEnviar}
            disabled={guardando || disabled || editando || !draft.trim()}
            title="Enviar comentario"
            aria-label="Enviar comentario"
          >
            <i className="fa-solid fa-arrow-up" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <NotasChatConfirmCor
        abierto={Boolean(pendienteConfirm)}
        onCancel={() => setPendienteConfirm(null)}
        onNo={() => {
          if (!pendienteConfirm) return;
          ejecutarCommit(pendienteConfirm, false);
        }}
        onSi={() => {
          if (!pendienteConfirm) return;
          ejecutarCommit(pendienteConfirm, true);
        }}
      />
    </div>
  );
}
