function PorSubirCorPanel({
  tareas,
  onSelectTask,
  onMarcarSubidoCor,
  onToast,
  currentTheme,
  mostrarVacio = false,
  className = ""
}) {
  const [copiadoKey, setCopiadoKey] = useState("");
  const [tareaAConfirmar, setTareaAConfirmar] = useState(null);
  const pendientesCor = useMemo(() => {
    if (!onMarcarSubidoCor) return [];
    if (typeof listarTareasPendientesSubirCor === "function") {
      return listarTareasPendientesSubirCor(tareas);
    }
    return (tareas || []).filter((t) => typeof tareaPendienteSubirCor === "function" && tareaPendienteSubirCor(t));
  }, [tareas, onMarcarSubidoCor]);

  const cerrarConfirmacion = () => setTareaAConfirmar(null);

  useEffect(() => {
    if (!tareaAConfirmar) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setTareaAConfirmar(null);
    };
    document.addEventListener("keydown", onKey);
    document.documentElement.classList.add("home-cor-confirm-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("home-cor-confirm-open");
    };
  }, [tareaAConfirmar]);

  if (!onMarcarSubidoCor) return null;
  if (!mostrarVacio && pendientesCor.length === 0 && !tareaAConfirmar) return null;

  const textoAjusteCor = (tarea) => {
    if (typeof obtenerUltimoAjusteCor === "function") return obtenerUltimoAjusteCor(tarea);
    if (typeof obtenerAjusteComentarioEstatus === "function") return obtenerAjusteComentarioEstatus(tarea);
    if (typeof parseDetalles === "function" && typeof notasYComentarioEstatus === "function") {
      const partes = notasYComentarioEstatus(parseDetalles(tarea.detalles || "").notas);
      return String(partes.comentario || partes.notas || "").trim();
    }
    return "";
  };

  const linkTareaCor = (tarea) => {
    if (typeof obtenerLinkTarea === "function") return obtenerLinkTarea(tarea) || "";
    return String(tarea?.link || "").trim();
  };

  const keyTarea = (tarea) => (
    typeof getTaskSelectionKey === "function" ? getTaskSelectionKey(tarea) : (tarea.idTarea || tarea.info)
  );

  const copiarMensajeCor = async (tarea) => {
    const mensaje = typeof construirMensajeAjusteCor === "function"
      ? construirMensajeAjusteCor(tarea)
      : textoAjusteCor(tarea);
    const copiar = typeof copiarTextoAlPortapapeles === "function"
      ? copiarTextoAlPortapapeles
      : async (texto) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(texto);
          return true;
        }
        return false;
      };
    const ok = await copiar(mensaje);
    const key = keyTarea(tarea);
    if (ok) {
      setCopiadoKey(key);
      window.setTimeout(() => {
        setCopiadoKey((prev) => (prev === key ? "" : prev));
      }, 1800);
      if (onToast) onToast("Mensaje copiado. En COR pega con Cmd+Shift+V si se junta.", "success");
    } else if (onToast) {
      onToast("No se pudo copiar el mensaje", "error");
    }
    return ok;
  };

  const confirmarPasoAProgreso = () => {
    if (!tareaAConfirmar || !onMarcarSubidoCor) return;
    onMarcarSubidoCor(tareaAConfirmar);
    setTareaAConfirmar(null);
  };

  const overlayConfirmacion = tareaAConfirmar ? (
    <div
      className="home-cor-confirm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="home-cor-confirm-title"
    >
      <div
        className="home-cor-confirm__backdrop"
        aria-hidden="true"
        onClick={cerrarConfirmacion}
      />
      <div className="home-cor-confirm__card">
        <h4 id="home-cor-confirm-title" className="home-cor-confirm__title">Pasar a En progreso</h4>
        <p className="home-cor-confirm__copy">
          ¿Quieres pasar esta tarea a En progreso?
        </p>
        <div className="home-cor-confirm__task">
          {tareaAConfirmar.info}
        </div>
        <div className="home-cor-confirm__actions">
          <button
            type="button"
            className="home-cor-confirm__cancel"
            onClick={cerrarConfirmacion}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="home-cor-confirm__ok"
            onClick={confirmarPasoAProgreso}
          >
            Sí, pasar
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const overlayPortaled = overlayConfirmacion && typeof ReactDOM !== "undefined" && ReactDOM.createPortal
    ? ReactDOM.createPortal(overlayConfirmacion, document.body)
    : overlayConfirmacion;

  const themeBorder = currentTheme?.border || "border-zinc-200";
  const themeCard = currentTheme?.cardBg || "bg-white";

  return (
    <>
    <div className={`home-cor-panel border ${themeBorder} rounded-md ${themeCard} overflow-hidden ${className}`}>
      <div className={`home-cor-panel__header px-3 py-2.5 md:px-4 border-b ${themeBorder} flex items-center justify-between gap-2`}>
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Por subir en COR</span>
        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
          {pendientesCor.length}
        </span>
      </div>
      {pendientesCor.length === 0 ? (
        <p className="px-3 py-4 md:px-4 text-xs text-zinc-400 leading-relaxed">
          Nada pendiente. Cuando registres un comentario de cliente en Estatus, la tarea aparece aquí para subir el ajuste a COR.
        </p>
      ) : (
        <div className="home-cor-table-wrap">
          <table className="home-cor-table">
            <thead>
              <tr>
                <th>Tarea</th>
                <th>Último ajuste</th>
                <th>COR</th>
                <th className="home-cor-table__check">Listo</th>
              </tr>
            </thead>
            <tbody>
              {pendientesCor.map((t) => {
                const ajuste = textoAjusteCor(t);
                const link = linkTareaCor(t);
                const key = keyTarea(t);
                const copiado = copiadoKey === key;
                return (
                  <tr key={key}>
                    <td>
                      <button
                        type="button"
                        className="home-cor-table__task"
                        onClick={() => onSelectTask && onSelectTask(t)}
                      >
                        <span className="home-cor-table__task-title">{t.info || "Sin título"}</span>
                        <span className="home-cor-table__task-meta">
                          {typeof formatearMarca === "function" ? formatearMarca(t.marca) : t.marca}
                          {typeof obtenerSubclienteTarea === "function" && obtenerSubclienteTarea(t)
                            ? ` · ${obtenerSubclienteTarea(t)}`
                            : ""}
                        </span>
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`home-cor-table__ajuste ${copiado ? "is-copied" : ""}`}
                        title={ajuste ? `Copiar mensaje para COR:\n${ajuste}` : "Sin ajuste"}
                        onClick={() => copiarMensajeCor(t)}
                      >
                        {ajuste || "—"}
                      </button>
                    </td>
                    <td>
                      {link ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="home-cor-table__link"
                          title="Abrir en COR"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Abrir
                        </a>
                      ) : (
                        <span className="home-cor-table__empty">—</span>
                      )}
                    </td>
                    <td className="home-cor-table__check">
                      <button
                        type="button"
                        className="home-cor-table__check-btn"
                        aria-label={`Pasar a En progreso: ${t.info || "tarea"}`}
                        title="Marcar listo y pasar a En progreso"
                        onClick={() => setTareaAConfirmar(t)}
                      >
                        <i className="fa-solid fa-check" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
    {overlayPortaled}
    </>
  );
}
