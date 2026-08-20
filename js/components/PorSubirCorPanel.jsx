function PorSubirCorPanel({
  tareas,
  onSelectTask,
  onMarcarSubidoCor,
  currentTheme,
  mostrarVacio = false,
  className = ""
}) {
  const pendientesCor = useMemo(() => {
    if (!onMarcarSubidoCor) return [];
    if (typeof listarTareasPendientesSubirCor === "function") {
      return listarTareasPendientesSubirCor(tareas);
    }
    return (tareas || []).filter((t) => typeof tareaPendienteSubirCor === "function" && tareaPendienteSubirCor(t));
  }, [tareas, onMarcarSubidoCor]);

  if (!onMarcarSubidoCor) return null;
  if (!mostrarVacio && pendientesCor.length === 0) return null;

  const textoAjusteCor = (tarea) => {
    if (typeof obtenerAjusteComentarioEstatus === "function") {
      return obtenerAjusteComentarioEstatus(tarea);
    }
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

  const themeBorder = currentTheme?.border || "border-zinc-200";
  const themeCard = currentTheme?.cardBg || "bg-white";

  return (
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
                <th>Ajuste</th>
                <th>Link</th>
                <th className="home-cor-table__check">Listo</th>
              </tr>
            </thead>
            <tbody>
              {pendientesCor.map((t) => {
                const ajuste = textoAjusteCor(t);
                const link = linkTareaCor(t);
                return (
                  <tr key={typeof getTaskSelectionKey === "function" ? getTaskSelectionKey(t) : t.idTarea}>
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
                      <span className="home-cor-table__ajuste" title={ajuste}>
                        {ajuste || "—"}
                      </span>
                    </td>
                    <td>
                      {link ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="home-cor-table__link"
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
                        aria-label={`Marcar subido a COR: ${t.info || "tarea"}`}
                        title="Marcar como subido a COR"
                        onClick={() => onMarcarSubidoCor(t)}
                      >
                        <i className="fa-regular fa-square" aria-hidden="true" />
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
  );
}
