const HOME_CRONO_PREVIEW = 5;

function HomeCronogramaItem({ tarea, onSelect, getMarcaStyle }) {
  const cMarca = getMarcaStyle ? getMarcaStyle(tarea.marca) : { accent: "#71717a" };
  const cEstado = ESTADOS_MAPA.find((e) => cleanEstado(e.id) === cleanEstado(tarea.estado)) || ESTADOS_MAPA[0];

  return (
    <button
      type="button"
      onClick={() => onSelect(tarea)}
      className="home-cronograma__item"
    >
      <span className="home-cronograma__item-marca" style={{ color: cMarca.accent || "#71717a" }}>
        {formatearMarca(tarea.marca)}
      </span>
      <span className="home-cronograma__item-title">{tarea.info}</span>
      <span className="home-cronograma__item-meta">
        <span className={`home-cronograma__item-dot ${cEstado.dot}`} aria-hidden="true" />
        {normalizarEstado(tarea.estado)}
      </span>
    </button>
  );
}

function HomeCronogramaSemana({ tareas, onSelectTask, getMarcaStyle }) {
  const [vista, setVista] = useState("semana");
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const hoy = new Date();

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const weekDays = useMemo(() => {
    const lunes = obtenerLunesSemana(weekAnchor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      return d;
    });
  }, [weekAnchor]);

  const weekLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    const mes = monthNames[start.getMonth()].slice(0, 3);
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}–${end.getDate()} ${mes}`;
    }
    const mesFin = monthNames[end.getMonth()].slice(0, 3);
    return `${start.getDate()} ${mes} – ${end.getDate()} ${mesFin}`;
  }, [weekDays]);

  const monthLabel = `${monthNames[currentMonth]} ${currentYear}`;

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

  const entregasForDate = (date) => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const d = date.getDate();
    return (tareas || []).filter((t) => {
      if (!t.deadline) return false;
      const taskTime = obtenerTiempoFecha(t.deadline);
      return taskTime !== Infinity && taskTime === new Date(y, m, d).getTime();
    });
  };

  const ordenarEntregas = (lista) =>
    [...lista].sort((a, b) => {
      const pa = getPriorityWeight(a.prioridad);
      const pb = getPriorityWeight(b.prioridad);
      if (pa !== pb) return pb - pa;
      return String(a.info || "").localeCompare(String(b.info || ""), "es");
    });

  const tareasDiaSeleccionado = useMemo(
    () => ordenarEntregas(entregasForDate(selectedDate)),
    [selectedDate, tareas]
  );

  const tareasVisibles = vista === "semana"
    ? tareasDiaSeleccionado.slice(0, HOME_CRONO_PREVIEW)
    : tareasDiaSeleccionado;

  const tareasOcultas = vista === "semana"
    ? Math.max(0, tareasDiaSeleccionado.length - HOME_CRONO_PREVIEW)
    : 0;

  const selectedLabel = useMemo(() => {
    if (esMismoDiaLocal(selectedDate, hoy)) return "Hoy";
    return `${selectedDate.getDate()} ${monthNames[selectedDate.getMonth()].slice(0, 3)}`;
  }, [selectedDate]);

  const seleccionarDia = (date) => {
    setSelectedDate(date);
    if (vista === "mes") {
      setCurrentMonth(date.getMonth());
      setCurrentYear(date.getFullYear());
    }
  };

  const abrirVistaMes = () => {
    setCurrentMonth(selectedDate.getMonth());
    setCurrentYear(selectedDate.getFullYear());
    setVista("mes");
  };

  const volverASemana = () => {
    setWeekAnchor(selectedDate);
    setVista("semana");
  };

  const handlePrev = () => {
    if (vista === "semana") {
      const d = new Date(weekAnchor);
      d.setDate(d.getDate() - 7);
      setWeekAnchor(d);
      return;
    }
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNext = () => {
    if (vista === "semana") {
      const d = new Date(weekAnchor);
      d.setDate(d.getDate() + 7);
      setWeekAnchor(d);
      return;
    }
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const irAHoy = () => {
    const now = new Date();
    setWeekAnchor(now);
    setSelectedDate(now);
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
  };

  const renderDayButton = (date, { muted = false } = {}) => {
    const count = entregasForDate(date).length;
    const esHoy = esMismoDiaLocal(date, hoy);
    const seleccionado = esMismoDiaLocal(date, selectedDate);

    return (
      <button
        key={date.toISOString()}
        type="button"
        className={`home-cronograma__day ${esHoy ? "is-today" : ""} ${seleccionado ? "is-selected" : ""} ${muted ? "is-muted" : ""}`}
        onClick={() => seleccionarDia(date)}
      >
        <span className="home-cronograma__dow">{vista === "semana" ? dayNames[date.getDay()] : null}</span>
        <span className="home-cronograma__num">{date.getDate()}</span>
        {count > 0 ? (
          <span className="home-cronograma__count">{count}</span>
        ) : (
          <span className="home-cronograma__count home-cronograma__count--empty" aria-hidden="true" />
        )}
      </button>
    );
  };

  return (
    <section className="home-cronograma md:hidden" data-induccion="calendario">
      <div className="home-section__head">
        <div className="home-section__head-left">
          <span className="home-section__title">Cronograma</span>
          <span className="home-section__subtitle">
            {vista === "semana" ? weekLabel : monthLabel}
          </span>
        </div>
        <div className="home-cronograma__head-tools">
          <div className="home-cronograma__vistas" data-induccion="calendario-vistas-mobile" role="tablist" aria-label="Vista del cronograma">
            <button
              type="button"
              role="tab"
              aria-selected={vista === "semana"}
              className={`home-cronograma__vista-btn ${vista === "semana" ? "is-active" : ""}`}
              onClick={volverASemana}
            >
              Semana
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={vista === "mes"}
              className={`home-cronograma__vista-btn ${vista === "mes" ? "is-active" : ""}`}
              onClick={abrirVistaMes}
            >
              Mes
            </button>
          </div>
          <div className="home-cronograma__nav">
          <button type="button" onClick={handlePrev} className="home-cronograma__nav-btn" aria-label="Anterior">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" onClick={irAHoy} className="home-cronograma__today">Hoy</button>
          <button type="button" onClick={handleNext} className="home-cronograma__nav-btn" aria-label="Siguiente">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        </div>
      </div>

      {vista === "semana" ? (
        <div className="home-cronograma__week">
          {weekDays.map((date) => renderDayButton(date))}
        </div>
      ) : (
        <>
          <div className="home-cronograma__month-head">
            {dayNames.map((d) => (
              <span key={d} className="home-cronograma__month-dow">{d}</span>
            ))}
          </div>
          <div className="home-cronograma__month-grid">
            {gridCells.map((cell, idx) => {
              const date = new Date(cell.year, cell.month, cell.day);
              return renderDayButton(date, { muted: !cell.isCurrentMonth });
            })}
          </div>
        </>
      )}

      <div className="home-cronograma__day-panel">
        <p className="home-cronograma__day-label">
          {selectedLabel}
          {tareasDiaSeleccionado.length > 0 && (
            <span className="home-cronograma__day-total">
              {tareasDiaSeleccionado.length} entrega{tareasDiaSeleccionado.length !== 1 ? "s" : ""}
            </span>
          )}
        </p>

        {tareasDiaSeleccionado.length === 0 ? (
          <p className="home-cronograma__empty">Sin entregas este día</p>
        ) : (
          <div className={`home-cronograma__list ${vista === "mes" ? "home-cronograma__list--full" : ""}`}>
            {tareasVisibles.map((t) => (
              <HomeCronogramaItem
                key={t.idTarea}
                tarea={t}
                onSelect={onSelectTask}
                getMarcaStyle={getMarcaStyle}
              />
            ))}
          </div>
        )}

        {tareasOcultas > 0 && (
          <p className="home-cronograma__more-hint">
            +{tareasOcultas} entrega{tareasOcultas !== 1 ? "s" : ""} más este día
          </p>
        )}
      </div>

      <div className="home-cronograma__footer">
        {vista === "semana" ? (
          <button type="button" className="home-cronograma__expand" onClick={abrirVistaMes}>
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="2" y="3" width="12" height="10.5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
              <path d="M2 6h12" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            {tareasOcultas > 0
              ? `Ver calendario completo · ${tareasDiaSeleccionado.length} entregas`
              : "Ver calendario completo"}
            <SVGIcon.ChevronRight className="w-3 h-3" />
          </button>
        ) : (
          <button type="button" className="home-cronograma__expand" onClick={volverASemana}>
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Volver a vista semanal
          </button>
        )}
      </div>
    </section>
  );
}
