const SALAS_DURACIONES = [
  { min: 30, label: "30 min" },
  { min: 60, label: "1 h" },
  { min: 90, label: "1.5 h" },
  { min: 120, label: "2 h" },
  { min: 180, label: "3 h" }
];

function salasEtiquetaHoraCorta(hora24) {
  const h12 = hora24 % 12 === 0 ? 12 : hora24 % 12;
  return `${h12}${hora24 >= 12 ? "pm" : "am"}`;
}

function salasRangoTexto(inicioMin, finMin) {
  return `${salasFormatHora(inicioMin)} – ${salasFormatHora(finMin)}`;
}

function salasTituloEvento(ev) {
  if (ev.todoElDia) return ev.titulo || "Todo el día";
  return ev.titulo || "Ocupada";
}

function PildoraEstadoSala({ tono, icono, children }) {
  const estilos = {
    libre: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ocupada: "bg-rose-50 text-rose-700 border-rose-200",
    neutro: "bg-zinc-50 text-zinc-600 border-zinc-200",
    alerta: "bg-amber-50 text-amber-700 border-amber-200"
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${estilos[tono] || estilos.neutro}`}>
      {icono && <i className={`fa-solid ${icono} text-[9px]`} aria-hidden="true" />}
      {children}
    </span>
  );
}

function LineaTiempoSala({ eventos, ventana, ventanaLibre, ahoraMin }) {
  const inicioVista = SALAS_HORA_INICIO * 60;
  const finVista = SALAS_HORA_FIN * 60;
  const total = finVista - inicioVista;
  const pct = (min) => ((Math.min(Math.max(min, inicioVista), finVista) - inicioVista) / total) * 100;

  const horas = [];
  for (let h = SALAS_HORA_INICIO; h <= SALAS_HORA_FIN; h += 1) horas.push(h);

  const ahoraVisible = ahoraMin !== null && ahoraMin >= inicioVista && ahoraMin <= finVista;

  return (
    <div className="select-none">
      <div className="relative h-11 rounded-md border border-zinc-200 bg-zinc-50/60 overflow-hidden">
        {horas.slice(1, -1).map((h) => (
          <span
            key={h}
            className="absolute top-0 bottom-0 border-l border-zinc-200/80"
            style={{ left: `${pct(h * 60)}%` }}
          />
        ))}

        {ventana && (
          <span
            className={`absolute top-0 bottom-0 border-x-2 ${
              ventanaLibre ? "bg-emerald-400/20 border-emerald-500" : "bg-amber-300/25 border-amber-500"
            }`}
            style={{
              left: `${pct(ventana.inicioMin)}%`,
              width: `${Math.max(pct(ventana.finMin) - pct(ventana.inicioMin), 0.6)}%`
            }}
          />
        )}

        {eventos
          .filter((ev) => ev.finMin > inicioVista && ev.inicioMin < finVista)
          .map((ev) => {
            const izquierda = pct(ev.inicioMin);
            const ancho = Math.max(pct(ev.finMin) - izquierda, 0.8);
            return (
              <div
                key={ev.id}
                title={`${salasTituloEvento(ev)} · ${ev.todoElDia ? "Todo el día" : salasRangoTexto(ev.inicioMin, ev.finMin)}`}
                className="absolute top-1 bottom-1 rounded bg-rose-100 border border-rose-300 text-rose-800 overflow-hidden px-1 flex items-center"
                style={{ left: `${izquierda}%`, width: `${ancho}%` }}
              >
                <span className="text-[10px] font-semibold leading-none truncate">{salasTituloEvento(ev)}</span>
              </div>
            );
          })}

        {ahoraVisible && (
          <span
            className="absolute top-0 bottom-0 w-px bg-blue-500 z-10"
            style={{ left: `${pct(ahoraMin)}%` }}
          >
            <span className="absolute -top-0.5 -left-[3px] h-1.5 w-1.5 rounded-full bg-blue-500" />
          </span>
        )}
      </div>

      <div className="relative h-4 mt-1">
        {horas.map((h, idx) => (
          <span
            key={h}
            className={`absolute text-[10px] text-zinc-400 font-medium -translate-x-1/2 ${idx % 2 === 1 ? "hidden sm:block" : ""}`}
            style={{ left: `${pct(h * 60)}%` }}
          >
            {salasEtiquetaHoraCorta(h)}
          </span>
        ))}
      </div>
    </div>
  );
}

function TarjetaSala({ sala, diaStr, ahoraMin, filtro }) {
  const eventos = useMemo(() => salasEventosDelDia(sala, diaStr), [sala, diaStr]);
  const estadoAhora = useMemo(() => salasEstadoAhora(eventos, ahoraMin), [eventos, ahoraMin]);

  const conflictos = filtro ? salasConflictos(eventos, filtro.inicioMin, filtro.finMin) : [];
  const libreEnVentana = filtro ? conflictos.length === 0 : null;

  let pildora;
  if (sala.error) {
    pildora = <PildoraEstadoSala tono="alerta" icono="fa-triangle-exclamation">Sin acceso</PildoraEstadoSala>;
  } else if (filtro) {
    pildora = libreEnVentana ? (
      <PildoraEstadoSala tono="libre" icono="fa-check">Libre {salasRangoTexto(filtro.inicioMin, filtro.finMin)}</PildoraEstadoSala>
    ) : (
      <PildoraEstadoSala tono="ocupada" icono="fa-xmark">Ocupada en esa franja</PildoraEstadoSala>
    );
  } else if (estadoAhora) {
    pildora = estadoAhora.libre ? (
      <PildoraEstadoSala tono="libre" icono="fa-circle">
        Libre ahora{estadoAhora.hastaMin !== null ? ` · hasta ${salasFormatHora(estadoAhora.hastaMin)}` : " · resto del día"}
      </PildoraEstadoSala>
    ) : (
      <PildoraEstadoSala tono="ocupada" icono="fa-circle">Ocupada hasta {salasFormatHora(estadoAhora.hastaMin)}</PildoraEstadoSala>
    );
  } else {
    pildora = eventos.length === 0 ? (
      <PildoraEstadoSala tono="libre" icono="fa-check">Libre todo el día</PildoraEstadoSala>
    ) : (
      <PildoraEstadoSala tono="neutro">{eventos.length} {eventos.length === 1 ? "reunión" : "reuniones"}</PildoraEstadoSala>
    );
  }

  const siguienteHueco = filtro && !libreEnVentana
    ? salasSiguienteHuecoDesde(eventos, filtro.inicioMin, filtro.finMin - filtro.inicioMin, SALAS_HORA_FIN * 60)
    : null;

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-500">
            <i className="fa-solid fa-door-open text-xs" aria-hidden="true" />
          </span>
          <h3 className="text-sm font-bold text-[#37352F] truncate">{sala.nombre}</h3>
        </div>
        {pildora}
      </header>

      {sala.error ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">{sala.error}</p>
      ) : (
        <>
          <LineaTiempoSala
            eventos={eventos}
            ventana={filtro}
            ventanaLibre={libreEnVentana}
            ahoraMin={ahoraMin}
          />

          {filtro && !libreEnVentana && (
            <p className="mt-2 text-[11px] text-zinc-500 leading-relaxed">
              Choca con{" "}
              {conflictos.map((ev, i) => (
                <span key={ev.id}>
                  {i > 0 && ", "}
                  <strong className="text-zinc-700">{salasTituloEvento(ev)}</strong> ({salasRangoTexto(ev.inicioMin, ev.finMin)})
                </span>
              ))}
              .{" "}
              {siguienteHueco
                ? <>Próximo hueco de {salasFormatDuracion(filtro.finMin - filtro.inicioMin)}: <strong className="text-emerald-700">{salasFormatHora(siguienteHueco.inicioMin)}</strong>.</>
                : "No hay otro hueco de esa duración hoy."}
            </p>
          )}

          {eventos.length > 0 ? (
            <ul className="mt-3 flex flex-col divide-y divide-zinc-100 border-t border-zinc-100">
              {eventos.map((ev) => (
                <li key={ev.id} className="flex items-baseline gap-3 py-1.5 text-xs">
                  <span className="w-36 shrink-0 tabular-nums text-zinc-500 font-medium">
                    {ev.todoElDia ? "Todo el día" : salasRangoTexto(ev.inicioMin, ev.finMin)}
                  </span>
                  <span className="min-w-0 truncate text-[#37352F]">{salasTituloEvento(ev)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-zinc-400">Sin reuniones agendadas este día.</p>
          )}
        </>
      )}
    </article>
  );
}

function ResumenFiltroSalas({ resultados, filtro }) {
  const libres = resultados.filter((r) => r.libre);
  const ocupadas = resultados.filter((r) => !r.libre);
  const rango = salasRangoTexto(filtro.inicioMin, filtro.finMin);

  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        libres.length > 0 ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/70"
      }`}
    >
      <p className="text-sm font-semibold text-[#37352F]">
        {libres.length > 0
          ? `${libres.length} ${libres.length === 1 ? "sala disponible" : "salas disponibles"} de ${rango}`
          : `Ninguna sala disponible de ${rango}`}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {libres.map((r) => (
          <span key={r.id} className="inline-flex items-center gap-1.5 rounded-md bg-white border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700">
            <i className="fa-solid fa-check text-[9px]" aria-hidden="true" />
            {r.nombre}
          </span>
        ))}
        {ocupadas.map((r) => (
          <span key={r.id} className="inline-flex items-center gap-1.5 rounded-md bg-white border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-400 line-through">
            {r.nombre}
          </span>
        ))}
      </div>
    </div>
  );
}

function LayoutSalas() {
  const [diaStr, setDiaStr] = useState(() => salasHoyStr());
  const [horaInput, setHoraInput] = useState("");
  const [duracion, setDuracion] = useState(60);
  const [soloLibres, setSoloLibres] = useState(false);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const peticionRef = useRef(0);

  const cargar = useCallback(async (dia, { silencioso = false } = {}) => {
    const id = ++peticionRef.current;
    if (!silencioso) setCargando(true);
    try {
      const res = await salasFetchDisponibilidad(dia);
      if (id !== peticionRef.current) return;
      setDatos({ ...res, dia });
      setError("");
    } catch (e) {
      if (id !== peticionRef.current) return;
      setError(e && e.message ? e.message : "No se pudo cargar la disponibilidad");
    } finally {
      if (id === peticionRef.current) setCargando(false);
    }
  }, []);

  useEffect(() => {
    setDatos(null);
    cargar(diaStr);
  }, [diaStr, cargar]);

  useEffect(() => {
    const refresco = window.setInterval(() => cargar(diaStr, { silencioso: true }), SALAS_REFRESCO_MS);
    const reloj = window.setInterval(() => setTick((n) => n + 1), 30000);
    return () => {
      window.clearInterval(refresco);
      window.clearInterval(reloj);
    };
  }, [diaStr, cargar]);

  const ahoraMin = useMemo(() => salasMinutosAhora(diaStr), [diaStr, tick]);
  const esHoy = diaStr === salasHoyStr();

  const filtro = useMemo(() => {
    const inicioMin = salasParseHoraInput(horaInput);
    if (inicioMin === null) return null;
    return { inicioMin, finMin: Math.min(inicioMin + duracion, SALAS_MIN_DIA) };
  }, [horaInput, duracion]);

  const salas = datos && datos.dia === diaStr ? datos.salas : [];

  const resultados = useMemo(() => {
    return salas.map((sala) => {
      const eventos = salasEventosDelDia(sala, diaStr);
      const libre = !sala.error && (!filtro || salasConflictos(eventos, filtro.inicioMin, filtro.finMin).length === 0);
      return { id: sala.id, nombre: sala.nombre, libre, sala };
    });
  }, [salas, diaStr, filtro]);

  const visibles = useMemo(() => {
    const lista = filtro && soloLibres ? resultados.filter((r) => r.libre) : resultados;
    if (!filtro) return lista;
    return [...lista].sort((a, b) => Number(b.libre) - Number(a.libre));
  }, [resultados, filtro, soloLibres]);

  const usarAhora = () => {
    setDiaStr(salasHoyStr());
    const ahora = salasMinutosAhora(salasHoyStr());
    const siguiente = Math.min(Math.ceil((ahora + 1) / 30) * 30, SALAS_MIN_DIA - 30);
    setHoraInput(salasHoraInputDesdeMin(siguiente));
  };

  const generado = datos && datos.generado ? new Date(datos.generado) : null;
  const sincronizacionAtrasada = Boolean(
    datos && !datos.demo && generado && !isNaN(generado.getTime()) &&
    Date.now() - generado.getTime() > SALAS_SYNC_ATRASADA_MIN * 60000
  );

  return (
    <div className="flex flex-col gap-5 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="robin-desktop-only">
          <h2 className="text-lg font-bold text-[#37352F] tracking-tight">Salas de reunión</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Disponibilidad desde Google Calendar, actualizada cada 5 minutos.</p>
        </div>
        <div className="flex items-center gap-2">
          {datos && datos.demo && (
            <PildoraEstadoSala tono="alerta" icono="fa-flask">Datos de ejemplo</PildoraEstadoSala>
          )}
          {sincronizacionAtrasada && (
            <PildoraEstadoSala tono="alerta" icono="fa-triangle-exclamation">Sincronización atrasada</PildoraEstadoSala>
          )}
          {generado && !isNaN(generado.getTime()) && (
            <span className="hidden sm:inline text-[11px] text-zinc-400">
              Actualizado {salasFormatHora(salasMinutosDelDia(generado, salasFechaCaracas(generado)))}
            </span>
          )}
          <button
            type="button"
            onClick={() => cargar(diaStr)}
            disabled={cargando}
            className="h-8 w-8 rounded-md border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 transition-colors disabled:opacity-60"
            title="Actualizar"
            aria-label="Actualizar disponibilidad"
          >
            <i className={`fa-solid fa-rotate text-xs ${cargando ? "fa-spin" : ""}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-md border border-zinc-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setDiaStr(salasSumarDias(diaStr, -1))}
              className="h-8 w-8 text-zinc-500 hover:bg-zinc-50"
              aria-label="Día anterior"
            >
              <i className="fa-solid fa-chevron-left text-[10px]" aria-hidden="true" />
            </button>
            <span className="px-3 text-xs font-semibold text-[#37352F] min-w-[9.5rem] text-center">
              {salasFormatDiaLargo(diaStr)}
            </span>
            <button
              type="button"
              onClick={() => setDiaStr(salasSumarDias(diaStr, 1))}
              className="h-8 w-8 text-zinc-500 hover:bg-zinc-50"
              aria-label="Día siguiente"
            >
              <i className="fa-solid fa-chevron-right text-[10px]" aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setDiaStr(salasHoyStr())}
            disabled={esHoy}
            className="h-8 px-3 rounded-md border border-zinc-200 bg-white text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
          >
            Hoy
          </button>
          <input
            type="date"
            value={diaStr}
            onChange={(e) => e.target.value && setDiaStr(e.target.value)}
            className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-600"
            aria-label="Elegir fecha"
          />
        </div>

        <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Reunión a las</span>
            <div className="flex items-center gap-1.5">
              <input
                type="time"
                step={900}
                value={horaInput}
                onChange={(e) => setHoraInput(e.target.value)}
                className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm font-semibold text-[#37352F]"
                data-testid="salas-hora"
              />
              <button
                type="button"
                onClick={usarAhora}
                className="h-8 px-2.5 rounded-md border border-zinc-200 bg-white text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                Ahora
              </button>
              {horaInput && (
                <button
                  type="button"
                  onClick={() => setHoraInput("")}
                  className="h-8 px-2 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-700"
                >
                  Limpiar
                </button>
              )}
            </div>
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Duración</span>
            <div className="inline-flex rounded-md border border-zinc-200 overflow-hidden bg-white">
              {SALAS_DURACIONES.map((d) => (
                <button
                  key={d.min}
                  type="button"
                  onClick={() => setDuracion(d.min)}
                  className={`h-8 px-2.5 text-xs font-semibold border-r border-zinc-200 last:border-r-0 transition-colors ${
                    duracion === d.min ? "bg-zinc-800 text-white" : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <label className={`flex items-center gap-2 h-8 text-xs font-medium ${filtro ? "text-zinc-600 cursor-pointer" : "text-zinc-300"}`}>
            <input
              type="checkbox"
              checked={soloLibres}
              disabled={!filtro}
              onChange={(e) => setSoloLibres(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-zinc-300"
            />
            Solo salas libres
          </label>
        </div>

        {filtro && resultados.length > 0 && <ResumenFiltroSalas resultados={resultados} filtro={filtro} />}
      </section>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-rose-700">No se pudo cargar la disponibilidad</p>
            <p className="text-xs text-rose-600 mt-0.5">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => cargar(diaStr)}
            className="shrink-0 h-8 px-3 rounded-md border border-rose-200 bg-white text-xs font-semibold text-rose-700 hover:bg-rose-50"
          >
            Reintentar
          </button>
        </div>
      )}

      {cargando && salas.length === 0 && !error && (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-36 rounded-lg border border-zinc-200 bg-zinc-50 animate-pulse" />
          ))}
        </div>
      )}

      {visibles.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {visibles.map((r) => (
            <TarjetaSala key={r.id} sala={r.sala} diaStr={diaStr} ahoraMin={ahoraMin} filtro={filtro} />
          ))}
        </div>
      )}

      {!cargando && !error && datos && salas.length === 0 && (
        <p className="text-sm text-zinc-500 text-center py-8">
          Aún no hay salas sincronizadas. Ejecuta la función <strong>instalar</strong> en el Apps Script de salas.
        </p>
      )}

      {!cargando && !error && salas.length > 0 && visibles.length === 0 && (
        <p className="text-sm text-zinc-500 text-center py-8">No hay salas libres en esa franja.</p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-400">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-100 border border-rose-300" />Ocupada</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-400/30 border border-emerald-500" />Franja elegida (libre)</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-300/40 border border-amber-500" />Franja elegida (choca)</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-px bg-blue-500" />Ahora</span>
      </div>
    </div>
  );
}
