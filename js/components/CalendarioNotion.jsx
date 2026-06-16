function CalendarioNotion({ tareas, onSelectTask, getMarcaStyle, username }) {
  const MAX_TASKS_MONTH_DESKTOP = 3;
  const MAX_TASKS_MONTH_MOBILE = 2;

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const maxTasksMonth = isMobile ? MAX_TASKS_MONTH_MOBILE : MAX_TASKS_MONTH_DESKTOP;

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const [vista, setVista] = useState(() => getUserPreference("calendarioVista", "mes", username));
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const dayNames = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

  const cambiarVista = (nueva) => {
    setVista(nueva);
    setUserPreference("calendarioVista", nueva, username);
  };

  const getMonday = (date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  };

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const isSameDayTask = (task, y, m, d) => {
    if (!task.deadline) return false;
    const taskTime = obtenerTiempoFecha(task.deadline);
    const cellTime = new Date(y, m, d).getTime();
    return taskTime !== Infinity && taskTime === cellTime;
  };

  const tasksForDate = (date) =>
    tareas.filter(t => isSameDayTask(t, date.getFullYear(), date.getMonth(), date.getDate()));

  const weekDays = useMemo(() => {
    const monday = getMonday(weekAnchor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [weekAnchor]);

  const weekLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} – ${end.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `${start.getDate()} ${monthNames[start.getMonth()].slice(0, 3)} – ${end.getDate()} ${monthNames[end.getMonth()].slice(0, 3)} ${end.getFullYear()}`;
  }, [weekDays]);

  const weekLabelShort = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
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

  const gridCells = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
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

  const openDayDetail = (date, dayTasks) => {
    setSelectedDayDetail({
      date,
      day: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear(),
      tasks: dayTasks
    });
  };

  const renderMonthChip = (t, idx) => {
    const calStyle = getMarcaStyle(t.marca);
    return (
      <div
        key={`${t.idTarea || "t"}-${idx}`}
        onClick={(e) => { e.stopPropagation(); onSelectTask(t); }}
        className={`text-left w-full rounded px-1.5 py-0.5 cursor-pointer hover:brightness-95 transition-all border-l-2 ${calStyle.bg} ${calStyle.text} ${calStyle.border}`}
        title={t.info}
      >
        <span className="block text-[10px] font-medium leading-tight line-clamp-1">{t.info}</span>
      </div>
    );
  };

  const renderWeekColumnCard = (t) => {
    const calStyle = getMarcaStyle(t.marca);
    const cEstado = ESTADOS_MAPA.find(e => cleanEstado(e.id) === cleanEstado(t.estado)) || { dot: "bg-zinc-400" };

    return (
      <button
        key={getTaskSelectionKey(t)}
        type="button"
        onClick={() => onSelectTask(t)}
        className={`w-full h-[52px] shrink-0 text-left rounded border border-zinc-200 border-l-[3px] bg-white hover:bg-zinc-50/80 transition-colors p-1.5 flex flex-col justify-between ${calStyle.border}`}
        title={`${formatearMarca(t.marca)} · ${normalizarEstado(t.estado) || "Sin estado"} · ${t.info}`}
      >
        <p className="text-[10px] font-medium text-zinc-800 leading-[13px] h-[26px] overflow-hidden line-clamp-2">
          {t.info}
        </p>
        <div className="flex items-center gap-1 h-[12px] min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cEstado.dot}`} />
          <span className="text-[9px] text-zinc-500 truncate leading-none">
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
        className={`cal-mobile-task-row border-l-[3px] ${calStyle.border}`}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-[#37352F] leading-snug line-clamp-2 text-left">{t.info}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cEstado.dot}`}></span>
            <span className="text-[10px] text-zinc-500 truncate">{formatearMarca(t.marca)}</span>
          </div>
        </div>
        <i className="fa-solid fa-chevron-right text-[9px] text-zinc-300 shrink-0"></i>
      </button>
    );
  };

  const renderWeekDayStack = (date, i) => {
    const dayTasks = tasksForDate(date);
    const esHoy = isSameDay(date, hoy);
    const visibleTasks = dayTasks.slice(0, 3);
    const hiddenCount = dayTasks.length - visibleTasks.length;

    return (
      <div
        key={date.toISOString()}
        className={`cal-mobile-day-block ${esHoy ? "is-today" : ""}`}
      >
        <div className="cal-mobile-day-head">
          <div className="cal-mobile-day-date">
            <span className="cal-mobile-day-name">{dayNames[i]}</span>
            <span className="cal-mobile-day-num">{date.getDate()}</span>
          </div>
          <div className="flex items-center gap-2">
            {esHoy && <span className="cal-mobile-today-pill">Hoy</span>}
            {dayTasks.length > 0 && (
              <span className="cal-mobile-day-count">{dayTasks.length}</span>
            )}
          </div>
        </div>

        <div className="cal-mobile-day-tasks">
          {dayTasks.length === 0 ? (
            <p className="cal-mobile-day-empty">Sin entregables este día</p>
          ) : (
            <>
              {visibleTasks.map(t => renderWeekMobileTaskRow(t))}
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => openDayDetail(date, dayTasks)}
                  className="cal-mobile-day-more"
                >
                  +{hiddenCount} más
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderWeekDayColumn = (date, i, compact = false) => {
    const dayTasks = tasksForDate(date);
    const esHoy = isSameDay(date, hoy);
    const tieneMuchas = dayTasks.length > 5;

    return (
      <div
        key={date.toISOString()}
        className={`flex flex-col min-h-0 h-full rounded-lg border overflow-hidden bg-white ${
          compact ? "w-[140px] shrink-0 snap-center" : ""
        } ${esHoy ? "border-zinc-500 ring-1 ring-zinc-400/40" : "border-zinc-200"}`}
      >
        {/* Cabecera de altura fija — igual en todos los días */}
        <div className={`shrink-0 h-[64px] flex flex-col items-center justify-center border-b px-1 ${
          esHoy ? "bg-[#37352F] text-white border-zinc-600" : "bg-[#FAF9F6] border-zinc-200"
        }`}>
          <div className={`text-[10px] font-semibold uppercase tracking-wide leading-none ${
            esHoy ? "text-zinc-400" : "text-zinc-400"
          }`}>
            {dayNames[i]}
          </div>
          <div className={`text-lg font-bold leading-none mt-1 ${esHoy ? "text-white" : "text-[#37352F]"}`}>
            {date.getDate()}
          </div>
          <div className="h-[16px] flex items-center justify-center mt-1">
            {esHoy ? (
              <span className="text-[8px] font-bold uppercase tracking-wider bg-white/15 text-zinc-200 px-1.5 py-0.5 rounded leading-none">
                Hoy{dayTasks.length > 0 ? ` · ${dayTasks.length}` : ""}
              </span>
            ) : dayTasks.length > 0 ? (
              <span className="text-[9px] font-medium text-zinc-400 leading-none">{dayTasks.length}</span>
            ) : (
              <span className="text-[9px] text-transparent leading-none">0</span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1 min-h-0 cal-week-scroll">
          {dayTasks.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-[10px] text-zinc-300">—</span>
            </div>
          ) : (
            dayTasks.map(t => renderWeekColumnCard(t))
          )}
        </div>

        {/* Pie de altura fija — reserva espacio en todas las columnas */}
        <div className="shrink-0 h-[26px] border-t border-zinc-100 flex items-center justify-center bg-[#FAF9F6]/30">
          {tieneMuchas ? (
            <button
              type="button"
              onClick={() => openDayDetail(date, dayTasks)}
              className="text-[9px] font-semibold text-zinc-500 hover:text-zinc-800 transition-colors w-full h-full"
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

  const renderModalChip = (t, idx) => {
    const calStyle = getMarcaStyle(t.marca);
    return (
      <div
        key={`modal-${idx}`}
        onClick={() => onSelectTask(t)}
        className={`border-l-[3px] rounded-r px-3 py-2 cursor-pointer hover:brightness-[0.98] transition-all ${calStyle.bg} ${calStyle.text} ${calStyle.border}`}
      >
        <span className="block text-ui-sm font-medium leading-snug">{t.info}</span>
        <span className="block text-ui-sm opacity-60 mt-0.5">
          {formatearMarca(t.marca)} · {normalizarEstado(t.estado) || "Sin estado"}
        </span>
      </div>
    );
  };

  const hoy = new Date();

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-sm w-full">
      {/* Header móvil — limpio */}
      <div className="md:hidden cal-mobile-toolbar">
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
        <div className="cal-mobile-toolbar-tabs">
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

      {/* Header desktop — sin cambios */}
      <div className="hidden md:flex bg-gradient-to-r from-[#FAF9F6] to-white px-4 py-3 border-b border-zinc-200 items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-section">Cronograma</span>
          <div className="flex items-center gap-0.5 bg-zinc-100 p-0.5 rounded-md border border-zinc-200">
            <button
              type="button"
              onClick={() => cambiarVista("semana")}
              className={`px-2.5 py-1 rounded text-ui-sm font-medium transition-all ${
                vista === "semana" ? "bg-white text-zinc-900 shadow-sm border border-zinc-200" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => cambiarVista("mes")}
              className={`px-2.5 py-1 rounded text-ui-sm font-medium transition-all ${
                vista === "mes" ? "bg-white text-zinc-900 shadow-sm border border-zinc-200" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              Mes
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-ui font-semibold text-zinc-700 min-w-[140px] text-right">
            {vista === "semana" ? weekLabel : `${monthNames[currentMonth]} ${currentYear}`}
          </span>
          <button
            type="button"
            onClick={irAHoy}
            className="px-2 py-1 text-ui-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded border border-zinc-200 transition-colors"
          >
            Hoy
          </button>
          <div className="flex items-center gap-0.5 border border-zinc-200 rounded-md p-0.5 bg-white">
            <button type="button" onClick={handlePrev} className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded transition-colors">
              <i className="fa-solid fa-chevron-left text-ui-sm" />
            </button>
            <button type="button" onClick={handleNext} className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded transition-colors">
              <i className="fa-solid fa-chevron-right text-ui-sm" />
            </button>
          </div>
        </div>
      </div>

      {/* Vista semana — columnas en desktop, días apilados en móvil */}
      {vista === "semana" && (
        <div className="p-3">
          <div className="hidden md:grid md:grid-cols-7 gap-2 h-[400px]">
            {weekDays.map((date, i) => renderWeekDayColumn(date, i))}
          </div>

          <div className="md:hidden flex flex-col gap-3">
            {weekDays.map((date, i) => renderWeekDayStack(date, i))}
          </div>
        </div>
      )}

      {/* Vista mes — grid con 2-3 tareas visibles */}
      {vista === "mes" && (
        <div className="p-2 md:p-3">
          <div className="grid grid-cols-7 gap-1 md:gap-1.5">
            {dayNames.map(d => (
              <div key={d} className="text-center text-ui-sm font-semibold text-zinc-400 py-1">
                {d}
              </div>
            ))}

            {gridCells.map((cell, idx) => {
              const cellDate = new Date(cell.year, cell.month, cell.day);
              const dayTasks = tasksForDate(cellDate);
              const visibleTasks = dayTasks.slice(0, maxTasksMonth);
              const hiddenCount = dayTasks.length - visibleTasks.length;
              const esHoy = isSameDay(cellDate, hoy);

              return (
                <div
                  key={idx}
                  className={`min-h-[88px] md:min-h-[108px] rounded-md border p-1 md:p-1.5 flex flex-col gap-0.5 transition-colors ${
                    cell.isCurrentMonth ? "bg-white border-zinc-200" : "bg-zinc-50/60 border-zinc-100"
                  } ${esHoy ? "ring-2 ring-[#37352F]/25 border-zinc-400" : ""} ${
                    dayTasks.length > 0 ? "hover:border-zinc-300 hover:shadow-sm" : ""
                  }`}
                >
                  <div className="flex items-center justify-between shrink-0 mb-0.5">
                    <span className={`text-ui-sm font-semibold leading-none ${
                      esHoy
                        ? "bg-[#37352F] text-white w-5 h-5 flex items-center justify-center rounded"
                        : cell.isCurrentMonth ? "text-zinc-700" : "text-zinc-350"
                    }`}>
                      {cell.day}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[10px] font-medium text-zinc-400">{dayTasks.length}</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-0.5 flex-1 min-h-0 overflow-hidden">
                    {visibleTasks.map((t, i) => renderMonthChip(t, i))}
                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={() => openDayDetail(cellDate, dayTasks)}
                        className="text-left w-full text-[10px] font-semibold text-zinc-500 hover:text-zinc-800 bg-zinc-100 hover:bg-zinc-150 rounded px-1.5 py-0.5 transition-colors"
                      >
                        +{hiddenCount} más
                      </button>
                    )}
                    {dayTasks.length > 0 && hiddenCount === 0 && dayTasks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => openDayDetail(cellDate, dayTasks)}
                        className="text-[9px] text-zinc-400 hover:text-zinc-600 text-left px-0.5"
                      >
                        Ver todo
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedDayDetail && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-zinc-200 shadow-lg w-full max-w-md max-h-[80vh] flex flex-col animate-fade-in">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 shrink-0">
              <div>
                <span className="text-section">Entregables del día</span>
                <p className="text-ui font-semibold text-[#37352F] mt-0.5">
                  {selectedDayDetail.day} {monthNames[selectedDayDetail.month]} {selectedDayDetail.year}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayDetail(null)}
                className="text-zinc-400 hover:text-zinc-800 font-bold text-lg leading-none px-2"
              >
                &times;
              </button>
            </div>
            <div className="overflow-y-auto p-3 flex flex-col gap-2">
              {selectedDayDetail.tasks.map((t, i) => renderModalChip(t, i))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
