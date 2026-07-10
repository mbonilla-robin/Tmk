function CalIconoVistaSemana({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="1.5" y="3" width="1.75" height="10" rx="0.5" fill="currentColor" />
      <rect x="4.75" y="3" width="1.75" height="10" rx="0.5" fill="currentColor" />
      <rect x="8" y="3" width="1.75" height="10" rx="0.5" fill="currentColor" />
      <rect x="11.25" y="3" width="1.75" height="10" rx="0.5" fill="currentColor" />
    </svg>
  );
}

function CalIconoVistaMes({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10.5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 6h12" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="5.5" cy="8.75" r="0.75" fill="currentColor" />
      <circle cx="8" cy="8.75" r="0.75" fill="currentColor" />
      <circle cx="10.5" cy="8.75" r="0.75" fill="currentColor" />
      <circle cx="5.5" cy="11" r="0.75" fill="currentColor" />
      <circle cx="8" cy="11" r="0.75" fill="currentColor" />
    </svg>
  );
}

function CalendarioNotion({ tareas, onSelectTask, getMarcaStyle, username, modoHomeCompacto = false }) {
  const normalizarVistaCalendario = (valor) => (valor === "semana" ? "semana" : "mes");

  const [vista, setVista] = useState(() =>
    normalizarVistaCalendario(getUserPreference("calendarioVista", "semana", username))
  );
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);
  const [homeExpandido, setHomeExpandido] = useState(false);
  const hoy = new Date();

  useEffect(() => {
    if (!username) return;
    const guardada = normalizarVistaCalendario(getUserPreference("calendarioVista", "semana", username));
    setVista((actual) => (actual === guardada ? actual : guardada));
  }, [username]);

  useEffect(() => {
    if (!selectedDayDetail) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e) => {
      if (e.key === "Escape") setSelectedDayDetail(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedDayDetail]);

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const dayNames = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

  const cambiarVista = (nueva) => {
    const vistaValida = normalizarVistaCalendario(nueva);
    const hoy = new Date();

    if (vistaValida === "mes") {
      setCurrentMonth(weekAnchor.getMonth());
      setCurrentYear(weekAnchor.getFullYear());
    } else if (currentMonth === hoy.getMonth() && currentYear === hoy.getFullYear()) {
      setWeekAnchor(hoy);
    } else {
      setWeekAnchor(new Date(currentYear, currentMonth, 1));
    }

    setVista(vistaValida);
    if (username) {
      setUserPreference("calendarioVista", vistaValida, username);
    }
  };

  const isSameDay = esMismoDiaLocal;

  const isSameDayTask = (task, y, m, d) => {
    if (!task.deadline) return false;
    const taskTime = obtenerTiempoFecha(task.deadline);
    const cellTime = new Date(y, m, d).getTime();
    return taskTime !== Infinity && taskTime === cellTime;
  };

  const tasksForDate = (date) =>
    tareas.filter(t => isSameDayTask(t, date.getFullYear(), date.getMonth(), date.getDate()));

  const actividadesPorDia = useMemo(
    () => construirIndiceActividadesPorDia(tareas),
    [tareas]
  );

  const actividadesForDate = (date) => actividadesParaFecha(actividadesPorDia, date);

  const weekDays = useMemo(() => {
    const lunes = obtenerLunesSemana(weekAnchor);
    const dias = [];

    for (let i = 0; i < 5; i++) {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      dias.push(d);
    }

    for (let i = 5; i < 7; i++) {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      const y = d.getFullYear();
      const m = d.getMonth();
      const day = d.getDate();
      const hayEntregables = (tareas || []).some((t) => isSameDayTask(t, y, m, day));
      const hayActividad = actividadesParaFecha(actividadesPorDia, d).length > 0;
      if (hayEntregables || hayActividad) dias.push(d);
    }

    return dias;
  }, [weekAnchor, tareas, actividadesPorDia]);

  const compactWeekDays = useMemo(() => {
    const lunes = obtenerLunesSemana(weekAnchor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      return d;
    });
  }, [weekAnchor]);

  const compactWeekLabelShort = useMemo(() => {
    const start = compactWeekDays[0];
    const end = compactWeekDays[6];
    const mes = monthNames[start.getMonth()].slice(0, 3);
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}–${end.getDate()} ${mes}`;
    }
    const mesFin = monthNames[end.getMonth()].slice(0, 3);
    return `${start.getDate()} ${mes} – ${end.getDate()} ${mesFin}`;
  }, [compactWeekDays]);

  const weekLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[weekDays.length - 1];
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} – ${end.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `${start.getDate()} ${monthNames[start.getMonth()].slice(0, 3)} – ${end.getDate()} ${monthNames[end.getMonth()].slice(0, 3)} ${end.getFullYear()}`;
  }, [weekDays]);

  const weekLabelShort = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[weekDays.length - 1];
    const mes = monthNames[start.getMonth()].slice(0, 3);
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}–${end.getDate()} ${mes}`;
    }
    const mesFin = monthNames[end.getMonth()].slice(0, 3);
    return `${start.getDate()} ${mes} – ${end.getDate()} ${mesFin}`;
  }, [weekDays]);

  const mesLabelShort = useMemo(() => {
    return `${monthNames[currentMonth].slice(0, 3)} ${currentYear}`;
  }, [currentMonth, currentYear]);

  const periodoLabel = vista === "semana"
    ? weekLabelShort
    : `${monthNames[currentMonth].slice(0, 3)} ${currentYear}`;

  const gridCells = useMemo(() => {
    const offset = new Date(currentYear, currentMonth, 1).getDay();
    const daysCount = new Date(currentYear, currentMonth + 1, 0).getDate();

    const cells = [];
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    for (let i = offset - 1; i >= 0; i--) {
      cells.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        month: currentMonth === 0 ? 11 : currentMonth - 1,
        year: currentMonth === 0 ? currentYear - 1 : currentYear
      });
    }

    for (let i = 1; i <= daysCount; i++) {
      cells.push({ day: i, isCurrentMonth: true, month: currentMonth, year: currentYear });
    }

    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        day: i,
        isCurrentMonth: false,
        month: currentMonth === 11 ? 0 : currentMonth + 1,
        year: currentMonth === 11 ? currentYear + 1 : currentYear
      });
    }

    return cells;
  }, [currentMonth, currentYear]);

  const irAHoy = () => {
    const hoy = new Date();
    setWeekAnchor(hoy);
    setCurrentMonth(hoy.getMonth());
    setCurrentYear(hoy.getFullYear());
  };

  const handlePrev = () => {
    if (vista === "semana") {
      const d = new Date(weekAnchor);
      d.setDate(d.getDate() - 7);
      setWeekAnchor(d);
    } else {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(y => y - 1);
      } else {
        setCurrentMonth(m => m - 1);
      }
    }
  };

  const handleNext = () => {
    if (vista === "semana") {
      const d = new Date(weekAnchor);
      d.setDate(d.getDate() + 7);
      setWeekAnchor(d);
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(y => y + 1);
      } else {
        setCurrentMonth(m => m + 1);
      }
    }
  };

  const openDayDetail = (date, dayTasks, dayActivities) => {
    setSelectedDayDetail({
      date,
      day: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear(),
      tasks: dayTasks || [],
      activities: dayActivities || []
    });
  };

  const obtenerMarcasUnicasDia = (dayTasks) => {
    const marcas = [];
    const vistos = new Set();

    (dayTasks || []).forEach((t) => {
      const key = normalizarMarcaKey(t.marca);
      if (!key || vistos.has(key)) return;
      vistos.add(key);
      marcas.push(t.marca);
    });

    return marcas;
  };

  const renderActivityRow = (act) => (
    <button
      key={act.id}
      type="button"
      onClick={() => onSelectTask(act.tarea)}
      className="cal-activity-row"
      title={`${act.tarea.info} · ${act.etiqueta}`}
    >
      <span className="cal-activity-row-time">{act.hora}</span>
      <span className="cal-activity-row-body">
        <span className="cal-activity-row-title">{act.tarea.info}</span>
        <span className="cal-activity-row-desc">{act.etiqueta}</span>
      </span>
    </button>
  );

  const renderActivityPanel = (activities, { limit = null, onMore = null } = {}) => {
    if (!activities.length) return null;

    const visible = limit ? activities.slice(0, limit) : activities;
    const hidden = activities.length - visible.length;

    return (
      <div className="cal-activity-panel">
        <div className="cal-activity-panel-head">
          <i className="fa-regular fa-clock" aria-hidden="true" />
          <span>Actividad del día</span>
        </div>
        <div className="cal-activity-panel-list">
          {visible.map((act) => renderActivityRow(act))}
        </div>
        {hidden > 0 && onMore && (
          <button type="button" onClick={onMore} className="cal-activity-panel-more">
            +{hidden} más
          </button>
        )}
      </div>
    );
  };

  const renderDayHeaderMeta = (dayTasks, dayActivities, esHoy) => {
    if (esHoy) {
      return (
        <span className="cal-week-day-col-today-pill text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded leading-none">
          Hoy{dayTasks.length > 0 ? ` · ${dayTasks.length}` : ""}
        </span>
      );
    }

    if (dayTasks.length > 0) {
      return (
        <span className="cal-week-day-col-count text-[9px] font-medium leading-none">
          {dayTasks.length}
        </span>
      );
    }

    if (dayActivities.length > 0) {
      return (
        <span className="cal-week-day-col-activity-icon text-[9px] font-medium leading-none" title="Actividad registrada">
          <i className="fa-regular fa-clock" aria-hidden="true" />
          {dayActivities.length}
        </span>
      );
    }

    return <span className="text-[9px] text-transparent leading-none">0</span>;
  };

  const renderWeekColumnCard = (t) => {
    const calStyle = getMarcaStyle(t.marca);
    const cEstado = ESTADOS_MAPA.find(e => cleanEstado(e.id) === cleanEstado(t.estado)) || { dot: "bg-zinc-400" };

    return (
      <button
        key={getTaskSelectionKey(t)}
        type="button"
        onClick={() => onSelectTask(t)}
        className="cal-week-task-card w-full h-[52px] shrink-0 text-left rounded border border-l-[3px] p-1.5 flex flex-col justify-between"
        style={{ borderLeftColor: calStyle.accent }}
        title={`${formatearMarca(t.marca)} · ${normalizarEstado(t.estado) || "Sin estado"} · ${t.info}`}
      >
        <p className="cal-week-task-card-title text-[10px] font-medium leading-[13px] h-[26px] overflow-hidden line-clamp-2">
          {t.info}
        </p>
        <div className="flex items-center gap-1 h-[12px] min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cEstado.dot}`} />
          <span className="text-[9px] truncate leading-none" style={{ color: calStyle.accent }}>
            {formatearMarca(t.marca)}
          </span>
        </div>
      </button>
    );
  };

  const renderWeekMobileTaskRow = (t) => {
    const calStyle = getMarcaStyle(t.marca);
    const cEstado = ESTADOS_MAPA.find(e => cleanEstado(e.id) === cleanEstado(t.estado)) || { dot: "bg-zinc-400" };

    return (
      <button
        key={getTaskSelectionKey(t)}
        type="button"
        onClick={() => onSelectTask(t)}
        className="cal-mobile-task-row border-l-[3px]"
        style={{ borderLeftColor: calStyle.accent }}
      >
        <div className="min-w-0 flex-1">
          <p className="cal-mobile-task-row-title text-[12px] font-semibold leading-snug line-clamp-2 text-left">{t.info}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cEstado.dot}`}></span>
            <span className="text-[10px] truncate" style={{ color: calStyle.accent }}>{formatearMarca(t.marca)}</span>
          </div>
        </div>
        <i className="fa-solid fa-chevron-right text-[9px] text-zinc-300 shrink-0"></i>
      </button>
    );
  };

  const renderDayContent = (date, { compact = false, mobile = false } = {}) => {
    const dayTasks = tasksForDate(date);
    const dayActivities = actividadesForDate(date);
    const esHoy = isSameDay(date, hoy);
    const totalItems = dayTasks.length + dayActivities.length;
    const openDetail = () => openDayDetail(date, dayTasks, dayActivities);

    if (mobile) {
      const visibleTasks = dayTasks.slice(0, 3);
      const hiddenTasks = dayTasks.length - visibleTasks.length;
      const activityLimit = Math.max(0, 3 - visibleTasks.length);
      const visibleActivities = dayActivities.slice(0, activityLimit);
      const hiddenActivities = dayActivities.length - visibleActivities.length;
      const hiddenTotal = hiddenTasks + hiddenActivities;

      return (
        <div
          key={date.toISOString()}
          className={`cal-mobile-day-block ${esHoy ? "is-today" : ""}`}
        >
          <div className="cal-mobile-day-head">
            <div className="cal-mobile-day-date">
              <span className="cal-mobile-day-name">{dayNames[indiceNombreDia(date)]}</span>
              <span className="cal-mobile-day-num">{date.getDate()}</span>
            </div>
            <div className="flex items-center gap-2">
              {esHoy && <span className="cal-mobile-today-pill">Hoy</span>}
              {dayTasks.length > 0 && (
                <span className="cal-mobile-day-count">{dayTasks.length}</span>
              )}
              {dayTasks.length === 0 && dayActivities.length > 0 && (
                <span className="cal-week-day-col-activity-icon" title="Actividad registrada">
                  <i className="fa-regular fa-clock" aria-hidden="true" />
                  {dayActivities.length}
                </span>
              )}
            </div>
          </div>

          <div className="cal-mobile-day-tasks">
            {totalItems === 0 ? (
              <p className="cal-mobile-day-empty">Sin entregables ni actividad</p>
            ) : (
              <>
                {visibleTasks.map((t) => renderWeekMobileTaskRow(t))}
                {visibleActivities.length > 0 && renderActivityPanel(visibleActivities)}
                {hiddenTotal > 0 && (
                  <button type="button" onClick={openDetail} className="cal-mobile-day-more">
                    +{hiddenTotal} más
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      );
    }

    const tieneMuchas = dayTasks.length > 5;

    return (
      <div
        key={date.toISOString()}
        className={`cal-week-day-col flex flex-col min-h-0 h-full rounded-lg border overflow-hidden ${
          compact ? "w-[140px] shrink-0 snap-center" : ""
        } ${esHoy ? "is-today" : ""}`}
      >
        <div className={`cal-week-day-col-head shrink-0 h-[64px] flex flex-col items-center justify-center border-b px-1 ${esHoy ? "is-today" : ""}`}>
          <div className="cal-week-day-col-dow text-[10px] font-semibold uppercase tracking-wide leading-none">
            {dayNames[indiceNombreDia(date)]}
          </div>
          <div className={`cal-week-day-col-num text-lg font-bold leading-none mt-1 ${esHoy ? "is-today" : ""}`}>
            {date.getDate()}
          </div>
          <div className="h-[16px] flex items-center justify-center mt-1">
            {renderDayHeaderMeta(dayTasks, dayActivities, esHoy)}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1.5 min-h-0 cal-week-scroll">
          {totalItems === 0 ? (
            <div className="flex-1 flex items-center justify-center px-2">
              <span className="cal-week-day-col-empty text-[10px] text-center">Sin entregables ni actividad</span>
            </div>
          ) : (
            <>
              {dayTasks.map((t) => renderWeekColumnCard(t))}
              {renderActivityPanel(dayActivities, {
                limit: 3,
                onMore: dayActivities.length > 3 ? openDetail : null
              })}
            </>
          )}
        </div>

        <div className="cal-week-day-col-foot shrink-0 h-[26px] border-t flex items-center justify-center">
          {tieneMuchas ? (
            <button
              type="button"
              onClick={openDetail}
              className="cal-week-day-col-more text-[9px] font-semibold transition-colors w-full h-full"
            >
              Ver los {dayTasks.length}
            </button>
          ) : (
            <span className="text-[9px] text-transparent select-none">—</span>
          )}
        </div>
      </div>
    );
  };

  const indiceNombreDia = (date) => date.getDay();

  const renderModalActivityRow = (act, idx) => (
    <button
      key={`act-${act.id || idx}`}
      type="button"
      onClick={() => onSelectTask(act.tarea)}
      className="cal-activity-row cal-activity-row--modal"
    >
      <span className="cal-activity-row-time">{act.hora}</span>
      <span className="cal-activity-row-body">
        <span className="cal-activity-row-title">{act.tarea.info}</span>
        <span className="cal-activity-row-desc">{act.etiqueta}</span>
      </span>
    </button>
  );

  const renderWeekDayStack = (date) => renderDayContent(date, { mobile: true });

  const renderWeekDayColumn = (date, compact = false) => renderDayContent(date, { compact });

  const renderModalTaskRow = (t, idx) => {
    const calStyle = getMarcaStyle(t.marca);
    const cEstado = ESTADOS_MAPA.find(e => cleanEstado(e.id) === cleanEstado(t.estado)) || { dot: "bg-zinc-400" };

    return (
      <button
        key={`modal-${t.idTarea || idx}`}
        type="button"
        onClick={() => onSelectTask(t)}
        className="cal-day-modal-task w-full text-left"
        style={{ borderLeftColor: calStyle.accent }}
      >
        <span className="cal-day-modal-task-body">
          <span className="cal-day-modal-task-title">{t.info}</span>
          <span className="cal-day-modal-task-meta">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${cEstado.dot}`} />
            <span style={{ color: calStyle.accent }}>{formatearMarca(t.marca)}</span>
            <span> · {normalizarEstado(t.estado) || "Sin estado"}</span>
          </span>
        </span>
      </button>
    );
  };

  const renderCompactHome = () => (
    <section className="home-cal-compact" data-induccion="calendario">
      <div className="home-section__head">
        <div className="home-section__head-left">
          <span className="home-section__title">Cronograma</span>
          <span className="home-section__subtitle">{compactWeekLabelShort}</span>
        </div>
        <div className="home-cal-compact__nav">
          <button type="button" onClick={handlePrev} className="home-cal-compact__nav-btn" aria-label="Semana anterior">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" onClick={irAHoy} className="home-cal-compact__today">Hoy</button>
          <button type="button" onClick={handleNext} className="home-cal-compact__nav-btn" aria-label="Semana siguiente">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="home-cal-compact__week">
        {compactWeekDays.map((date) => {
          const entregas = tasksForDate(date);
          const actividades = actividadesForDate(date);
          const total = entregas.length + actividades.length;
          const esHoy = isSameDay(date, hoy);

          return (
            <button
              key={date.toISOString()}
              type="button"
              className={`home-cal-compact__day ${esHoy ? "is-today" : ""}`}
              onClick={() => openDayDetail(date, tasksForDate(date), actividadesForDate(date))}
            >
              <span className="home-cal-compact__dow">{dayNames[date.getDay()]}</span>
              <span className="home-cal-compact__num">{date.getDate()}</span>
              <span className="home-cal-compact__dots" aria-hidden="true">
                {total > 0 && Array.from({ length: Math.min(total, 3) }).map((_, i) => (
                  <span key={i} className="home-cal-compact__dot" />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="home-cal-compact__expand"
        onClick={() => {
          setHomeExpandido(true);
          setVista("mes");
        }}
      >
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="home-cal-compact__expand-icon">
          <rect x="2" y="3" width="12" height="10.5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
          <path d="M2 6h12" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        Ver calendario completo
        <SVGIcon.ChevronRight className="w-3 h-3" />
      </button>
    </section>
  );

  const renderDayDetailModal = () => {
    if (!selectedDayDetail) return null;

    const { day, month, year, tasks, activities } = selectedDayDetail;
    const acts = activities || [];
    const fechaLabel = `${day} ${monthNames[month]} ${year}`;
    const totalEntregas = tasks.length;

    return (
      <ModalPortal>
        <div className="cal-day-modal-overlay animate-fade-in" role="presentation">
          <button
            type="button"
            className="cal-day-modal-backdrop"
            onClick={() => setSelectedDayDetail(null)}
            aria-label="Cerrar resumen del día"
          />
          <div
            className="cal-day-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cal-day-sheet-title"
          >
            <header className="cal-day-modal-panel__header">
              <div className="cal-day-modal-panel__head-center">
                <h2 id="cal-day-sheet-title" className="cal-day-modal-panel__title">Resumen del día</h2>
                <p className="cal-day-modal-panel__date">{fechaLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayDetail(null)}
                className="cal-day-modal-panel__close"
                aria-label="Cerrar"
              >
                &times;
              </button>
            </header>

            <div className="cal-day-modal-panel__body">
              {tasks.length === 0 && acts.length === 0 ? (
                <p className="cal-day-modal-empty">Sin entregables ni actividad</p>
              ) : (
                <>
                  {tasks.length > 0 && (
                    <section className="cal-day-modal-panel__section">
                      <div className="cal-day-modal-panel__section-head">
                        <p className="cal-day-modal-section-title">Entregas</p>
                        <span className="cal-day-modal-panel__section-count">
                          {totalEntregas} entrega{totalEntregas !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="cal-day-modal-panel__task-list">
                        {tasks.map((t, i) => renderModalTaskRow(t, i))}
                      </div>
                    </section>
                  )}
                  {acts.length > 0 && (
                    <section className="cal-day-modal-panel__section">
                      <div className="cal-activity-panel cal-activity-panel--modal">
                        <div className="cal-activity-panel-head">
                          <i className="fa-regular fa-clock" aria-hidden="true" />
                          <span>Actividad del día</span>
                        </div>
                        <p className="cal-activity-panel-note">
                          Lo que se trabajó o cambió. No es fecha de entrega.
                        </p>
                        <div className="cal-activity-panel-list">
                          {acts.map((act, i) => renderModalActivityRow(act, i))}
                        </div>
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </ModalPortal>
    );
  };

  const shellClass = modoHomeCompacto && homeExpandido
    ? "cal-shell cal-shell--home-expanded rounded-lg border overflow-hidden shadow-sm w-full"
    : "cal-shell rounded-lg border overflow-hidden shadow-sm w-full";

  if (modoHomeCompacto && !homeExpandido) {
    return (
      <>
        {renderCompactHome()}
        {renderDayDetailModal()}
      </>
    );
  }

  return (
    <>
    <div className={shellClass}>
      {modoHomeCompacto && homeExpandido && (
        <button
          type="button"
          className="home-cal-compact__collapse"
          onClick={() => {
            setHomeExpandido(false);
            setVista("semana");
          }}
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Semana compacta
        </button>
      )}

      {/* Header móvil — limpio */}
      <div className="md:hidden cal-mobile-toolbar" data-induccion="calendario">
        <div className="cal-mobile-toolbar-nav">
          <button type="button" onClick={handlePrev} className="cal-mobile-nav-btn" aria-label="Anterior">
            <i className="fa-solid fa-chevron-left text-[11px]"></i>
          </button>
          <button type="button" onClick={irAHoy} className="cal-mobile-toolbar-title" title="Ir a hoy">
            {vista === "semana" ? weekLabelShort : mesLabelShort}
          </button>
          <button type="button" onClick={handleNext} className="cal-mobile-nav-btn" aria-label="Siguiente">
            <i className="fa-solid fa-chevron-right text-[11px]"></i>
          </button>
        </div>
        <div className="cal-mobile-toolbar-tabs" data-induccion="calendario-vistas">
          <button
            type="button"
            onClick={() => cambiarVista("semana")}
            className={`cal-mobile-tab ${vista === "semana" ? "is-active" : ""}`}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => cambiarVista("mes")}
            className={`cal-mobile-tab ${vista === "mes" ? "is-active" : ""}`}
          >
            Mes
          </button>
        </div>
      </div>

      {/* Header desktop — una sola fila */}
      <div className="cal-header-desktop hidden md:flex" data-induccion="calendario">
        <span className="cal-header-desktop-title">Cronograma</span>

        <div className="cal-header-view-toggle" role="tablist" aria-label="Vista del cronograma" data-induccion="calendario-vistas">
          <button
            type="button"
            role="tab"
            aria-selected={vista === "semana"}
            title="Semana"
            onClick={() => cambiarVista("semana")}
            className={`cal-header-view-btn ${vista === "semana" ? "is-active" : ""}`}
          >
            <CalIconoVistaSemana />
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={vista === "mes"}
            title="Mes"
            onClick={() => cambiarVista("mes")}
            className={`cal-header-view-btn ${vista === "mes" ? "is-active" : ""}`}
          >
            <CalIconoVistaMes />
          </button>
        </div>

        <span className="cal-header-spacer" aria-hidden="true" />

        <span className="cal-header-period" title={vista === "semana" ? weekLabel : `${monthNames[currentMonth]} ${currentYear}`}>
          {periodoLabel}
        </span>

        <button type="button" onClick={irAHoy} className="cal-header-today-btn">
          Hoy
        </button>

        <div className="cal-header-nav">
          <button type="button" onClick={handlePrev} className="cal-header-nav-btn" aria-label="Anterior">
            <i className="fa-solid fa-chevron-left text-[11px]" />
          </button>
          <button type="button" onClick={handleNext} className="cal-header-nav-btn" aria-label="Siguiente">
            <i className="fa-solid fa-chevron-right text-[11px]" />
          </button>
        </div>
      </div>

      {/* Vista semana — columnas en desktop, días apilados en móvil */}
      {vista === "semana" && (
        <div
          className="p-3 cal-week-viewport"
          style={{ "--cal-week-cols": weekDays.length }}
        >
          <div className="cal-week-columns">
            {weekDays.map((date) => renderWeekDayColumn(date))}
          </div>

          <div className="cal-week-stacked">
            {weekDays.map((date) => renderWeekDayStack(date))}
          </div>
        </div>
      )}

      {/* Vista mes — calendario con marcas por día */}
      {vista === "mes" && (
        <div className="p-2 md:p-3">
          <div className="cal-month-grid">
            {dayNames.map((d, idx) => (
              <div
                key={d}
                className={`cal-month-weekday ${idx === 0 || idx === 6 ? "is-weekend" : ""}`}
              >
                {d}
              </div>
            ))}

            {gridCells.map((cell, idx) => {
              const cellDate = new Date(cell.year, cell.month, cell.day);
              const dayTasks = tasksForDate(cellDate);
              const dayActivities = actividadesForDate(cellDate);
              const marcasDia = obtenerMarcasUnicasDia(dayTasks);
              const marcasVisibles = marcasDia.slice(0, 3);
              const marcasOcultas = marcasDia.length - marcasVisibles.length;
              const esHoy = isSameDay(cellDate, hoy);
              const diaSemana = cellDate.getDay();
              const esFinDeSemana = diaSemana === 0 || diaSemana === 6;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => openDayDetail(cellDate, dayTasks, dayActivities)}
                  className={`cal-month-day ${cell.isCurrentMonth ? "is-current-month" : "is-other-month"} ${esFinDeSemana ? "is-weekend" : ""} ${esHoy ? "is-today" : ""} ${dayTasks.length > 0 ? "has-tasks" : ""} ${dayActivities.length > 0 ? "has-activity" : ""}`}
                  aria-label={`${cell.day} ${monthNames[cell.month]} ${cell.year}${dayTasks.length ? `, ${dayTasks.length} entregable${dayTasks.length !== 1 ? "s" : ""}` : ""}${dayActivities.length ? `, ${dayActivities.length} actividad${dayActivities.length !== 1 ? "es" : ""}` : ", sin entregables ni actividad"}`}
                >
                  <span className={`cal-month-day-num ${esHoy ? "is-today-num" : ""}`}>
                    {cell.day}
                  </span>

                  {dayActivities.length > 0 && marcasVisibles.length === 0 && (
                    <span className="cal-month-activity-icon" title={`${dayActivities.length} actividad${dayActivities.length !== 1 ? "es" : ""}`}>
                      <i className="fa-regular fa-clock" aria-hidden="true" />
                    </span>
                  )}

                  {marcasVisibles.length > 0 && (
                    <span className="cal-month-day-marcas">
                      {marcasVisibles.map((marca) => {
                        const calStyle = getMarcaStyle(marca);
                        return (
                          <span
                            key={normalizarMarcaKey(marca)}
                            className={`cal-month-marca-pill ${calStyle.surface}`}
                          >
                            {formatearMarca(marca)}
                          </span>
                        );
                      })}
                      {marcasOcultas > 0 && (
                        <span className="cal-month-marca-more">+{marcasOcultas}</span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
    {renderDayDetailModal()}
    </>
  );
}
