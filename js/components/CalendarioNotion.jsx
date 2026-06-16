function CalendarioNotion({ tareas, onSelectTask, getMarcaStyle }) {
  const MAX_TASKS_VISIBLE = 3;
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const dayNames = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

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
      cells.push({
        day: i,
        isCurrentMonth: true,
        month: currentMonth,
        year: currentYear
      });
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

  const isSameDayTask = (task, y, m, d) => {
    if (!task.deadline) return false;
    const taskTime = obtenerTiempoFecha(task.deadline);
    const cellTime = new Date(y, m, d).getTime();
    return taskTime !== Infinity && taskTime === cellTime;
  };

  const openDayDetail = (cell, dayTasks) => {
    setSelectedDayDetail({
      day: cell.day,
      month: cell.month,
      year: cell.year,
      isCurrentMonth: cell.isCurrentMonth,
      tasks: dayTasks
    });
  };

  const renderTaskChip = (t, idx, compact = true) => {
    const calStyle = getMarcaStyle(t.marca);
    return (
      <div
        key={`${t.idTarea || "t"}-${idx}-${t.info}`}
        onClick={() => onSelectTask(t)}
        className={`shrink-0 border-l-[3px] rounded-r px-2 py-1 cursor-pointer hover:brightness-[0.98] transition-all ${calStyle.bg} ${calStyle.text} ${calStyle.border}`}
        title={`${formatearMarca(t.marca)} · ${t.info}`}
      >
        <span className={`block text-[10px] font-semibold leading-snug ${compact ? "line-clamp-2" : ""}`}>
          {t.info}
        </span>
        {!compact && (
          <span className="block text-[9px] opacity-60 mt-0.5 font-medium">
            {formatearMarca(t.marca)}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="border border-zinc-200 rounded-md bg-white p-5 w-full">
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-zinc-150">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Cronograma Mensual</span>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-755 font-sans">
            {monthNames[currentMonth]} {currentYear}
          </span>
          <div className="flex items-center gap-1 border border-zinc-200 rounded p-0.5 bg-zinc-50">
            <button
              onClick={handlePrevMonth}
              className="p-1 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-150 rounded transition-colors text-xs"
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-150 rounded transition-colors text-xs"
            >
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-tight mb-2">
        {dayNames.map(d => <div key={d} className="py-1">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1.5 auto-rows-fr">
        {gridCells.map((cell, idx) => {
          const dayTasks = tareas.filter(t => isSameDayTask(t, cell.year, cell.month, cell.day));
          const visibleTasks = dayTasks.slice(0, MAX_TASKS_VISIBLE);
          const hiddenCount = dayTasks.length - visibleTasks.length;
          const isToday = new Date().getDate() === cell.day && new Date().getMonth() === cell.month && new Date().getFullYear() === cell.year;

          return (
            <div
              key={idx}
              className={`min-h-[120px] border border-zinc-150 rounded p-1.5 flex flex-col gap-1 transition-colors ${
                cell.isCurrentMonth ? "bg-white" : "bg-[#FAF9F6]/50 text-zinc-300"
              } ${isToday ? "border-zinc-400 ring-[0.5px] ring-zinc-400/30 bg-zinc-50/30" : ""}`}
            >
              <div className="flex items-center justify-between shrink-0">
                <button
                  type="button"
                  disabled={dayTasks.length === 0}
                  onClick={() => dayTasks.length > 0 && openDayDetail(cell, dayTasks)}
                  className={`text-[10px] font-bold ${dayTasks.length > 0 ? "hover:opacity-70 cursor-pointer" : "cursor-default"} ${
                    isToday ? "bg-[#37352F] text-white px-1.5 py-0.5 rounded-sm" : cell.isCurrentMonth ? "text-zinc-700" : "text-zinc-350"
                  }`}
                >
                  {cell.day}
                </button>
                {dayTasks.length > 0 && (
                  <span className="text-[9px] font-semibold text-zinc-400">{dayTasks.length}</span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-h-0 flex-1">
                {visibleTasks.map((t, i) => renderTaskChip(t, i))}

                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => openDayDetail(cell, dayTasks)}
                    className="shrink-0 w-full text-[9px] font-bold text-zinc-500 hover:text-zinc-800 bg-zinc-100 hover:bg-zinc-150 rounded px-1.5 py-1 transition-colors text-left"
                  >
                    +{hiddenCount} más
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDayDetail && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-zinc-200 shadow-md w-full max-w-md max-h-[80vh] flex flex-col animate-fade-in">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 shrink-0">
              <div>
                <span className="text-xs font-bold uppercase text-zinc-500 tracking-wider">
                  Entregables del día
                </span>
                <p className="text-sm font-bold text-[#37352F] mt-0.5">
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
              {selectedDayDetail.tasks.length === 0 ? (
                <p className="text-xs text-zinc-400 italic text-center py-4">Sin entregables este día.</p>
              ) : (
                selectedDayDetail.tasks.map((t, i) => renderTaskChip(t, i, false))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
