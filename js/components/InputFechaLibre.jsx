function InputFechaLibre({ value, onChange, className, required, placeholder, onBlurExtra, showHoyButton = false }) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const containerRef = useRef(null);
  const popupRef = useRef(null);

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const dayNames = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

  const parsed = useMemo(() => parsearFechaLibre(value), [value]);
  const hoy = useMemo(() => new Date(), []);

  const gridCells = useMemo(() => {
    const offset = new Date(viewYear, viewMonth, 1).getDay();
    const daysCount = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    for (let i = offset - 1; i >= 0; i--) {
      cells.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        month: viewMonth === 0 ? 11 : viewMonth - 1,
        year: viewMonth === 0 ? viewYear - 1 : viewYear
      });
    }

    for (let i = 1; i <= daysCount; i++) {
      cells.push({ day: i, isCurrentMonth: true, month: viewMonth, year: viewYear });
    }

    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        day: i,
        isCurrentMonth: false,
        month: viewMonth === 11 ? 0 : viewMonth + 1,
        year: viewMonth === 11 ? viewYear + 1 : viewYear
      });
    }

    return cells;
  }, [viewMonth, viewYear]);

  const syncViewToValue = () => {
    if (parsed) {
      setViewMonth(parsed.mes - 1);
      setViewYear(parsed.anio);
      return;
    }
    const now = new Date();
    setViewMonth(now.getMonth());
    setViewYear(now.getFullYear());
  };

  const openCalendar = () => {
    syncViewToValue();
    setCalendarOpen(true);
  };

  const handleBlur = (e) => {
    const raw = e.target.value.trim();
    if (!raw) {
      onChange("");
      if (onBlurExtra) onBlurExtra("");
      return;
    }
    if (esFechaValida(raw)) {
      const display = formatearFechaDisplay(raw);
      onChange(display);
      if (onBlurExtra) onBlurExtra(display);
    } else if (onBlurExtra) {
      onBlurExtra(raw);
    }
  };

  const selectDate = (day, month, year) => {
    const display = formatearFechaDisplay(`${day}/${month + 1}/${year}`);
    onChange(display);
    if (onBlurExtra) onBlurExtra(display);
    setCalendarOpen(false);
  };

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    const now = new Date();
    setViewMonth(now.getMonth());
    setViewYear(now.getFullYear());
    selectDate(now.getDate(), now.getMonth(), now.getFullYear());
  };

  const aplicarHoy = () => {
    const now = new Date();
    const display = formatearFechaDisplay(`${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`);
    onChange(display);
    if (onBlurExtra) onBlurExtra(display);
  };

  const isSameDay = (day, month, year, ref) =>
    ref.getFullYear() === year &&
    ref.getMonth() === month &&
    ref.getDate() === day;

  const isSelected = (day, month, year) =>
    parsed &&
    parsed.dia === day &&
    parsed.mes === month + 1 &&
    parsed.anio === year;

  useEffect(() => {
    if (!calendarOpen) return;

    const repositionPopup = () => {
      const anchor = containerRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const popup = popupRef.current;
      const popupWidth = (popup && popup.offsetWidth) || 280;
      const popupHeight = (popup && popup.offsetHeight) || 320;
      const gap = 6;
      const margin = 8;
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      let top = rect.bottom + gap;
      if (top + popupHeight > viewportH - margin) {
        top = rect.top - popupHeight - gap;
      }
      if (top < margin) top = margin;

      let left = rect.left;
      if (left + popupWidth > viewportW - margin) {
        left = viewportW - popupWidth - margin;
      }
      if (left < margin) left = margin;

      setPopupPos({ top, left });
    };

    repositionPopup();
    const raf = requestAnimationFrame(repositionPopup);

    const handleClickOutside = (event) => {
      const anchor = containerRef.current;
      const popup = popupRef.current;
      const inContainer = anchor && anchor.contains(event.target);
      const inPopup = popup && popup.contains(event.target);
      if (!inContainer && !inPopup) setCalendarOpen(false);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setCalendarOpen(false);
    };

    window.addEventListener("resize", repositionPopup);
    window.addEventListener("scroll", repositionPopup, true);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", repositionPopup);
      window.removeEventListener("scroll", repositionPopup, true);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [calendarOpen, viewMonth, viewYear]);

  const calendarPopup = calendarOpen ? (
    <div
      ref={popupRef}
      className="fecha-picker-popup fecha-picker-popup--portal"
      style={{ top: popupPos.top, left: popupPos.left }}
      role="dialog"
      aria-label="Seleccionar fecha"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          type="button"
          onClick={goPrevMonth}
          className="fecha-picker-nav-btn"
          aria-label="Mes anterior"
        >
          <i className="fa-solid fa-chevron-left text-[10px]" />
        </button>
        <span className="text-ui-sm font-semibold text-[#37352F] flex-1 text-center">
          {monthNames[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={goNextMonth}
          className="fecha-picker-nav-btn"
          aria-label="Mes siguiente"
        >
          <i className="fa-solid fa-chevron-right text-[10px]" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {dayNames.map((d, idx) => (
          <div
            key={d}
            className={`text-center text-[10px] font-semibold py-1 ${
              idx === 0 || idx === 6 ? "fecha-picker-weekday is-weekend" : "fecha-picker-weekday"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {gridCells.map((cell, idx) => {
          const esHoy = isSameDay(cell.day, cell.month, cell.year, hoy);
          const esSeleccionado = isSelected(cell.day, cell.month, cell.year);
          const diaSemana = new Date(cell.year, cell.month, cell.day).getDay();
          const esFinDeSemana = diaSemana === 0 || diaSemana === 6;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => selectDate(cell.day, cell.month, cell.year)}
              className={`fecha-picker-day ${
                !cell.isCurrentMonth ? "is-other-month" : ""
              } ${esFinDeSemana ? "is-weekend" : ""} ${esHoy ? "is-today" : ""} ${esSeleccionado ? "is-selected" : ""}`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      <div className="mt-2 pt-2 border-t border-zinc-100 flex justify-center">
        <button
          type="button"
          onClick={goToday}
          className="text-ui-sm font-medium text-zinc-600 hover:text-zinc-900 px-3 py-1 rounded hover:bg-zinc-50 transition-colors"
        >
          Hoy
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center gap-1 w-full min-w-0">
        {showHoyButton ? (
          <button
            type="button"
            onClick={aplicarHoy}
            className={`flex-1 min-w-0 bulk-action-date-hoy-btn ${className || ""}`}
            title="Asignar fecha de hoy"
          >
            Hoy
          </button>
        ) : (
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder || "dd/mm/aaaa"}
            required={required}
            className={`flex-1 min-w-0 ${className || ""}`}
            title="Ej: 16/06/2026, 16 06 2026 o 16-06-2026"
          />
        )}
        <button
          type="button"
          onClick={openCalendar}
          className={`shrink-0 w-7 h-7 flex items-center justify-center rounded transition-colors ${
            calendarOpen
              ? "bg-zinc-200 text-zinc-700"
              : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
          }`}
          title="Abrir calendario"
          aria-label="Abrir calendario"
          aria-expanded={calendarOpen}
        >
          <i className="fa-regular fa-calendar text-[13px]" />
        </button>
      </div>

      {calendarPopup ? ReactDOM.createPortal(calendarPopup, document.body) : null}
    </div>
  );
}
