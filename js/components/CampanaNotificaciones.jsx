function NotificacionFila({ notif, getMarcaStyle, onClick, tareas }) {
  const marcaEstilo = getMarcaStyle ? getMarcaStyle(notif.marca) : MARCAS_COLORES_DEFAULT;
  const noLeida = !notif.read_at;
  const tituloTarea = resolverTituloNotificacion(notif, tareas);

  return (
    <button
      type="button"
      className={`robin-notif-item ${noLeida ? "is-unread" : ""}`}
      onClick={() => onClick(notif)}
    >
      <div className="robin-notif-item__top">
        <span
          className="robin-notif-item__dot"
          style={{ backgroundColor: marcaEstilo.accent }}
          aria-hidden="true"
        />
        <span className="robin-notif-item__marca">{formatearMarca(notif.marca)}</span>
        <span className="robin-notif-item__time">{formatearTiempoRelativo(notif.created_at)}</span>
      </div>
      <p className="robin-notif-item__title">{tituloTarea}</p>
      <p className="robin-notif-item__detail">{resumirTextoNotificacion(notif)}</p>
    </button>
  );
}

function CampanaNotificaciones({
  usuario,
  notificaciones,
  unreadCount,
  cargando,
  onRefresh,
  onAbrirTarea,
  onMarkRead,
  onMarkAllRead,
  getMarcaStyle,
  tareas = []
}) {
  const [abierto, setAbierto] = useState(false);
  const panelRef = useRef(null);

  const grupos = useMemo(
    () => agruparNotificacionesPorTipo(notificaciones),
    [notificaciones]
  );

  useEffect(() => {
    if (!abierto) return undefined;

    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setAbierto(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [abierto]);

  const togglePanel = () => {
    const next = !abierto;
    setAbierto(next);
    if (next && typeof onRefresh === "function") {
      onRefresh();
    }
  };

  const handleClickNotif = async (notif) => {
    if (!notif.read_at && typeof onMarkRead === "function") {
      await onMarkRead(notif.id);
    }
    setAbierto(false);
    if (typeof onAbrirTarea === "function") {
      onAbrirTarea(notif.task_key);
    }
  };

  const handleMarkAll = async () => {
    if (typeof onMarkAllRead === "function") {
      await onMarkAllRead();
    }
    if (typeof onRefresh === "function") {
      onRefresh();
    }
  };

  const badge = unreadCount > 99 ? "99+" : unreadCount;

  return (
    <div className="robin-notif-bell" ref={panelRef}>
      <button
        type="button"
        className={`robin-notif-bell__btn ${abierto ? "is-open" : ""}`}
        onClick={togglePanel}
        data-induccion="notificaciones"
        title="Notificaciones"
        aria-label={unreadCount ? `${unreadCount} notificaciones pendientes` : "Notificaciones"}
      >
        <i className="fa-regular fa-bell" />
        {unreadCount > 0 && (
          <span className="robin-notif-bell__badge">{badge}</span>
        )}
      </button>

      {abierto && (
        <div className="robin-notif-panel">
          <div className="robin-notif-panel__header">
            <span className="robin-notif-panel__title">Notificaciones</span>
            <div className="robin-notif-panel__actions">
              {unreadCount > 0 && (
                <button type="button" onClick={handleMarkAll} className="robin-notif-panel__mark-all">
                  Marcar leídas
                </button>
              )}
              <button
                type="button"
                onClick={() => onRefresh && onRefresh()}
                className="robin-notif-panel__refresh"
                title="Actualizar"
              >
                <i className={`fa-solid fa-arrows-rotate ${cargando ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          <div className="robin-notif-panel__body">
            {cargando && !notificaciones.length ? (
              <p className="robin-notif-panel__empty">Cargando…</p>
            ) : !notificaciones.length ? (
              <p className="robin-notif-panel__empty">No tienes notificaciones</p>
            ) : (
              grupos.map((grupo) => (
                <section key={grupo.tipo} className="robin-notif-group">
                  <h4 className="robin-notif-group__title">{grupo.etiqueta}</h4>
                  <div className="robin-notif-group__list">
                    {grupo.items.map((notif) => (
                      <NotificacionFila
                        key={notif.id}
                        notif={notif}
                        tareas={tareas}
                        getMarcaStyle={getMarcaStyle}
                        onClick={handleClickNotif}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
