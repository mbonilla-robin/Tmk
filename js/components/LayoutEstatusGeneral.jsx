function pesoUrgenciaHoyEstatus(tarea) {
  let w = 1;
  if (typeof esPrioridadAlta === "function" && esPrioridadAlta(tarea?.prioridad)) w += 3;
  else if (typeof normalizarPrioridad === "function" && normalizarPrioridad(tarea?.prioridad) === "Media") w += 1;
  const tHoy = typeof obtenerTiempoHoyLocal === "function" ? obtenerTiempoHoyLocal() : Date.now();
  if (typeof cuentaComoAtrasada === "function" && cuentaComoAtrasada(tarea, tHoy)) w += 4;
  else if (typeof obtenerTiempoFecha === "function") {
    const td = obtenerTiempoFecha(tarea?.deadline);
    if (td !== Infinity) {
      const dias = Math.floor((td - tHoy) / 86400000);
      if (dias <= 0) w += 4;
      else if (dias <= 2) w += 3;
      else if (dias <= 7) w += 1;
    }
  }
  return w;
}

function polarPieEstatus(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

const ESTATUS_VARS_GLOBAL = {
  "--estatus-accent": "#0D9488",
  "--estatus-accent-2": "#7C3AED",
  "--estatus-accent-3": "#EA580C"
};

function varsEstatusDesdeMarca(accent) {
  const base = accent || "#37352F";
  return {
    "--estatus-accent": base,
    "--estatus-accent-2": base,
    "--estatus-accent-3": base
  };
}

function pathDonutSliceEstatus(cx, cy, rOuter, rInner, startDeg, endDeg) {
  const sweepRaw = endDeg - startDeg;
  // Un arco SVG de 360° no se ve (mismo punto inicio/fin); partir en dos.
  if (sweepRaw >= 359.5) {
    const mid = startDeg + 180;
    return [
      pathDonutSliceEstatus(cx, cy, rOuter, rInner, startDeg, mid),
      pathDonutSliceEstatus(cx, cy, rOuter, rInner, mid, startDeg + 359.99)
    ].join(" ");
  }
  const sweep = Math.max(sweepRaw, 0.2);
  const large = sweep > 180 ? 1 : 0;
  const [x1, y1] = polarPieEstatus(cx, cy, rOuter, startDeg);
  const [x2, y2] = polarPieEstatus(cx, cy, rOuter, endDeg);
  const [x3, y3] = polarPieEstatus(cx, cy, rInner, endDeg);
  const [x4, y4] = polarPieEstatus(cx, cy, rInner, startDeg);
  return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4} Z`;
}

function PieCargaEstatus({ items, valueKey = "activas", onSelect }) {
  const total = items.reduce((sum, item) => sum + (Number(item?.[valueKey]) || 0), 0);
  if (!total) return null;
  const cx = 50;
  const cy = 50;
  const rOuter = 48;
  const rInner = 27;
  const gapBase = items.length > 1 ? 5 : 0;
  let acc = 0;
  const slices = items.map((item) => {
    const valor = Number(item?.[valueKey]) || 0;
    const span = (valor / total) * 360;
    const gap = span > 14 ? gapBase : (items.length > 1 ? 2 : 0);
    const start = acc + gap / 2;
    const end = acc + span - gap / 2;
    acc += span;
    return {
      ...item,
      path: end > start
        ? pathDonutSliceEstatus(cx, cy, rOuter, rInner, start, end)
        : ""
    };
  }).filter((slice) => slice.path);
  return (
    <svg viewBox="0 0 100 100" className="estatus-carga-pie-svg" aria-hidden="true">
      {slices.map((slice) => (
        <path
          key={slice.handle || slice.key || slice.nombre}
          d={slice.path}
          fill={slice.color}
          onClick={(e) => {
            e.stopPropagation();
            if (typeof onSelect === "function") onSelect(slice);
          }}
        />
      ))}
    </svg>
  );
}

function etiquetaChipSnapshotEstatus(dias) {
  const d = String(dias || "").trim();
  if (!d || /sin fecha|tbd/i.test(d)) return "TBD";
  const m = d.match(/(\d+)\s*d\s*atrasado/i);
  if (m) return `${m[1]}d`;
  return d;
}

function tipoFechaSnapshotEstatus(dias) {
  const d = String(dias || "");
  if (/atrasado/i.test(d)) return "atrasado";
  if (/sin fecha|tbd/i.test(d) || !d.trim()) return "sin-fecha";
  return "en-fecha";
}

function pesoOrdenSnapshotEstatus(dias) {
  const tipo = tipoFechaSnapshotEstatus(dias);
  const m = String(dias || "").match(/(\d+)/);
  const n = m ? Number(m[1]) : 0;
  if (tipo === "atrasado") return 100000 + n;
  if (tipo === "sin-fecha") return 50000;
  if (/hoy/i.test(String(dias || ""))) return 40000;
  return 30000 - n;
}

function metaPersonaSnapshotEstatus(tarea) {
  if (typeof handlesResponsablesEstatus !== "function") return "";
  const handles = handlesResponsablesEstatus(tarea) || [];
  if (!handles.length) return "";
  return handles.map((h) => (
    typeof nombreCortoDisenadorEstatus === "function" ? nombreCortoDisenadorEstatus(h) : h
  )).filter(Boolean).join(" · ");
}

function agruparItemsSnapshotPorCadena(items, modo, etiquetaDiasFn) {
  const map = new Map();
  (items || []).forEach((item) => {
    const dias = etiquetaDiasFn(item.tarea, modo);
    const cadena = String(item.cadena || "").trim() || "Sin cadena";
    const key = typeof claveSubcliente === "function" ? claveSubcliente(cadena) : cadena.toLowerCase();
    if (!map.has(key)) map.set(key, { key, nombre: cadena, items: [] });
    map.get(key).items.push({ item, dias, tipo: tipoFechaSnapshotEstatus(dias) });
  });
  return Array.from(map.values())
    .map((grupo) => {
      const rows = grupo.items.slice().sort((a, b) => (
        pesoOrdenSnapshotEstatus(b.dias) - pesoOrdenSnapshotEstatus(a.dias)
        || String(a.item.entregable || "").localeCompare(String(b.item.entregable || ""), "es")
      ));
      const atrasados = rows.filter((r) => r.tipo === "atrasado").length;
      const maxAtraso = rows.reduce((max, r) => Math.max(max, pesoOrdenSnapshotEstatus(r.dias)), 0);
      return { ...grupo, items: rows, atrasados, maxAtraso };
    })
    .sort((a, b) => (
      b.maxAtraso - a.maxAtraso
      || b.atrasados - a.atrasados
      || b.items.length - a.items.length
      || String(a.nombre).localeCompare(String(b.nombre), "es")
    ));
}

const TIMELINE_DIA_MS = 86400000;
const TIMELINE_PX_DIA = 136;
const TIMELINE_PAD_DIAS = 4;
const TIMELINE_MAX_STACK = 3;

function inicioDiaLocalTs(ts) {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function labelDiaTimelineCorta(ts) {
  const d = new Date(ts);
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  return `${dias[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function labelRangoSemanaTimeline(inicioTs) {
  const start = new Date(inicioTs);
  const end = new Date(inicioTs + 6 * TIMELINE_DIA_MS);
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${meses[start.getMonth()]}`;
  }
  return `${start.getDate()} ${meses[start.getMonth()]} – ${end.getDate()} ${meses[end.getMonth()]}`;
}

function TimelineAtajarEstatus({ itemsFaltaHacer, onSelectTask }) {
  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const atrasadosWrapRef = useRef(null);
  const didInitScroll = useRef(false);
  const [menuAtrasados, setMenuAtrasados] = useState(false);
  const [flashKey, setFlashKey] = useState("");
  const [dragging, setDragging] = useState(false);
  const [expandedDay, setExpandedDay] = useState(null);

  const tHoy = typeof obtenerTiempoHoyLocal === "function" ? obtenerTiempoHoyLocal() : inicioDiaLocalTs(Date.now());
  const rangoSemana = typeof rangoSemanaLocalEstatus === "function"
    ? rangoSemanaLocalEstatus()
    : { inicio: tHoy, fin: tHoy + 6 * TIMELINE_DIA_MS };

  const nodos = useMemo(() => {
    const vistos = new Set();
    const flat = [];
    (itemsFaltaHacer || []).forEach((item) => {
      const t = item?.tarea;
      if (!t) return;
      const key = typeof getTaskSelectionKey === "function" ? getTaskSelectionKey(t) : String(t.info || "");
      if (!key || vistos.has(key)) return;
      const tsRaw = typeof obtenerTiempoFecha === "function" ? obtenerTiempoFecha(t.deadline) : Infinity;
      if (tsRaw === Infinity) return;
      const ts = inicioDiaLocalTs(tsRaw);
      vistos.add(key);
      flat.push({
        key,
        tarea: t,
        item,
        ts,
        atrasado: ts < tHoy,
        titulo: String(item.entregable || t.info || "Sin título").trim(),
        marca: typeof formatearMarca === "function" ? formatearMarca(t.marca) : String(t.marca || ""),
        cadena: String(item.cadena || "").trim(),
        fechaLabel: typeof formatearFecha === "function" ? formatearFecha(t.deadline) : String(t.deadline || "")
      });
    });
    flat.sort((a, b) => a.ts - b.ts || String(a.titulo).localeCompare(String(b.titulo), "es"));
    return flat;
  }, [itemsFaltaHacer, tHoy]);

  const atrasados = useMemo(
    () => nodos.filter((n) => n.atrasado).slice().sort((a, b) => a.ts - b.ts || String(a.titulo).localeCompare(String(b.titulo), "es")),
    [nodos]
  );

  const layout = useMemo(() => {
    const baseMin = rangoSemana.inicio - TIMELINE_PAD_DIAS * TIMELINE_DIA_MS;
    const baseMax = rangoSemana.fin + TIMELINE_PAD_DIAS * TIMELINE_DIA_MS;
    const dataMin = nodos.length ? Math.min(...nodos.map((n) => n.ts)) : baseMin;
    const dataMax = nodos.length ? Math.max(...nodos.map((n) => n.ts)) : baseMax;
    const start = inicioDiaLocalTs(Math.min(baseMin, dataMin - TIMELINE_PAD_DIAS * TIMELINE_DIA_MS));
    const end = inicioDiaLocalTs(Math.max(baseMax, dataMax + TIMELINE_PAD_DIAS * TIMELINE_DIA_MS));
    const days = Math.max(1, Math.round((end - start) / TIMELINE_DIA_MS) + 1);
    const trackWidth = days * TIMELINE_PX_DIA;
    const xOf = (ts) => ((inicioDiaLocalTs(ts) - start) / TIMELINE_DIA_MS) * TIMELINE_PX_DIA + TIMELINE_PX_DIA / 2;

    const byDay = new Map();
    nodos.forEach((nodo) => {
      if (!byDay.has(nodo.ts)) byDay.set(nodo.ts, []);
      byDay.get(nodo.ts).push(nodo);
    });
    const occupied = Array.from(byDay.keys()).sort((a, b) => a - b);
    const sideByDay = new Map();
    occupied.forEach((ts, idx) => {
      sideByDay.set(ts, idx % 2 === 0 ? "above" : "below");
    });

    const clusters = occupied.map((ts) => {
      const list = byDay.get(ts) || [];
      const expanded = expandedDay === ts;
      const visible = expanded ? list : list.slice(0, TIMELINE_MAX_STACK);
      const extra = expanded ? 0 : Math.max(0, list.length - TIMELINE_MAX_STACK);
      return {
        key: `day-${ts}`,
        ts,
        x: xOf(ts),
        side: sideByDay.get(ts),
        atrasado: ts < tHoy,
        items: visible,
        extra,
        total: list.length,
        fechaLabel: labelDiaTimelineCorta(ts)
      };
    });

    const ticks = [];
    for (let i = 0; i < days; i += 1) {
      const ts = start + i * TIMELINE_DIA_MS;
      const d = new Date(ts);
      const isMonday = d.getDay() === 1;
      const isToday = ts === tHoy;
      if (isMonday || isToday || i === 0 || i === days - 1) {
        ticks.push({
          key: `tick-${ts}`,
          ts,
          x: i * TIMELINE_PX_DIA + TIMELINE_PX_DIA / 2,
          label: isToday ? "Hoy" : labelDiaTimelineCorta(ts),
          isToday,
          isMonday
        });
      }
    }

    return {
      start,
      trackWidth,
      clusters,
      ticks,
      hoyX: xOf(tHoy),
      semanaInicioX: xOf(rangoSemana.inicio) - TIMELINE_PX_DIA / 2,
      xOf
    };
  }, [nodos, rangoSemana.inicio, rangoSemana.fin, tHoy, expandedDay]);

  useEffect(() => {
    didInitScroll.current = false;
  }, [layout.start, layout.trackWidth]);

  useEffect(() => {
    if (didInitScroll.current) return;
    const el = viewportRef.current;
    if (!el || !layout.trackWidth) return;
    el.scrollLeft = Math.max(0, layout.semanaInicioX - 16);
    didInitScroll.current = true;
  }, [layout.semanaInicioX, layout.trackWidth, nodos.length]);

  useEffect(() => {
    if (!menuAtrasados) return undefined;
    const onDoc = (e) => {
      if (atrasadosWrapRef.current && !atrasadosWrapRef.current.contains(e.target)) {
        setMenuAtrasados(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [menuAtrasados]);

  const scrollByDays = (n) => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollBy({ left: n * TIMELINE_PX_DIA, behavior: "smooth" });
  };

  const irAFecha = (ts, key) => {
    const el = viewportRef.current;
    if (!el) return;
    const x = layout.xOf(ts);
    const target = x - el.clientWidth / 2;
    el.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
    setFlashKey(key || `day-${ts}`);
    setMenuAtrasados(false);
    window.setTimeout(() => setFlashKey(""), 1800);
  };

  const onPointerDown = (e) => {
    if (e.button != null && e.button !== 0) return;
    const el = viewportRef.current;
    if (!el) return;
    dragRef.current = {
      x: e.clientX,
      scroll: el.scrollLeft,
      moved: false,
      pointerId: e.pointerId
    };
    setDragging(true);
    try { el.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
  };

  const onPointerMove = (e) => {
    const drag = dragRef.current;
    const el = viewportRef.current;
    if (!drag || !el) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 4) drag.moved = true;
    el.scrollLeft = drag.scroll - dx;
  };

  const endDrag = (e) => {
    const drag = dragRef.current;
    const el = viewportRef.current;
    if (drag && el) {
      try { el.releasePointerCapture(drag.pointerId); } catch (_) { /* ignore */ }
    }
    dragRef.current = drag ? { ...drag, ended: true } : null;
    setDragging(false);
    window.setTimeout(() => { dragRef.current = null; }, 0);
  };

  const handleCardClick = (nodo) => {
    if (dragRef.current?.moved) return;
    if (typeof onSelectTask === "function") onSelectTask(nodo.tarea);
  };

  const handleAtrasadoClick = (nodo) => {
    irAFecha(nodo.ts, nodo.key);
  };

  if (nodos.length === 0) {
    return (
      <section className="estatus-semana-linea-card">
        <div className="estatus-lista-card-head">
          <h3>A atajar esta semana</h3>
          <span>0</span>
        </div>
        <p className="estatus-section-hint">Pendientes internos con fecha de entrega</p>
        <p className="estatus-lista-empty">Nada con fecha para mostrar en la línea</p>
      </section>
    );
  }

  const semanaLabel = labelRangoSemanaTimeline(rangoSemana.inicio);

  return (
    <section className="estatus-semana-linea-card">
      <div className="estatus-lista-card-head">
        <h3>A atajar esta semana</h3>
        <span>{nodos.length}</span>
      </div>
      <p className="estatus-section-hint">Atrasados te llevan a su fecha en la línea · toca una tarjeta para editarla</p>

      <div className="estatus-timeline-toolbar">
        <div className="estatus-timeline-nav">
          <button
            type="button"
            className="estatus-timeline-nav-btn"
            onClick={() => scrollByDays(-7)}
            aria-label="Semana anterior"
            title="Semana anterior"
          >
            <i className="fa-solid fa-chevron-left" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="estatus-timeline-nav-btn estatus-timeline-nav-today"
            onClick={() => {
              const el = viewportRef.current;
              if (!el) return;
              el.scrollTo({ left: Math.max(0, layout.semanaInicioX - 16), behavior: "smooth" });
            }}
            title="Ir a esta semana"
          >
            {semanaLabel}
          </button>
          <button
            type="button"
            className="estatus-timeline-nav-btn"
            onClick={() => scrollByDays(7)}
            aria-label="Semana siguiente"
            title="Semana siguiente"
          >
            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          </button>
        </div>

        {atrasados.length > 0 ? (
          <div className="estatus-timeline-atrasados" ref={atrasadosWrapRef}>
            <button
              type="button"
              className={`estatus-timeline-atrasados-btn ${menuAtrasados ? "is-open" : ""}`}
              onClick={() => setMenuAtrasados((v) => !v)}
              aria-expanded={menuAtrasados}
            >
              <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />
              Atrasados
              <strong>{atrasados.length}</strong>
              <i className={`fa-solid fa-chevron-${menuAtrasados ? "up" : "down"}`} aria-hidden="true" />
            </button>
            {menuAtrasados ? (
              <ul className="estatus-timeline-atrasados-menu" role="listbox">
                {atrasados.map((nodo) => (
                  <li key={nodo.key}>
                    <button
                      type="button"
                      className="estatus-timeline-atrasados-item"
                      onClick={() => handleAtrasadoClick(nodo)}
                    >
                      <span className="estatus-timeline-atrasados-item-body">
                        <strong>{nodo.titulo}</strong>
                        <span>{[nodo.marca, nodo.cadena].filter(Boolean).join(" · ")}</span>
                      </span>
                      <em>{nodo.fechaLabel}</em>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <div
        className={`estatus-timeline-viewport ${dragging ? "is-dragging" : ""}`}
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="estatus-timeline-track" style={{ width: layout.trackWidth }}>
          <div className="estatus-timeline-rail" aria-hidden="true" />
          <div className="estatus-timeline-hoy" style={{ left: layout.hoyX }} aria-hidden="true" title="Hoy" />

          {layout.ticks.map((tick) => (
            <div
              key={tick.key}
              className={`estatus-timeline-tick ${tick.isToday ? "is-today" : ""} ${tick.isMonday ? "is-monday" : ""}`}
              style={{ left: tick.x }}
            >
              <span>{tick.label}</span>
            </div>
          ))}

          {layout.clusters.map((cluster) => (
            <div
              key={cluster.key}
              className={`estatus-timeline-cluster is-${cluster.side} ${cluster.atrasado ? "is-late" : ""} ${flashKey === cluster.key || cluster.items.some((n) => n.key === flashKey) ? "is-flash" : ""}`}
              style={{ left: cluster.x }}
              data-day={cluster.ts}
            >
              <div className="estatus-timeline-stack">
                {cluster.items.map((nodo) => (
                  <button
                    key={nodo.key}
                    type="button"
                    className={`estatus-timeline-cardlet ${nodo.atrasado ? "is-late" : ""} ${flashKey === nodo.key ? "is-flash" : ""}`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => handleCardClick(nodo)}
                    title={`Editar ${nodo.titulo} · ${nodo.fechaLabel}`}
                  >
                    <strong>{nodo.titulo}</strong>
                    <span>{[nodo.marca, nodo.cadena].filter(Boolean).join(" · ")}</span>
                    <em>{nodo.fechaLabel}</em>
                  </button>
                ))}
                {cluster.extra > 0 ? (
                  <button
                    type="button"
                    className="estatus-timeline-cardlet estatus-timeline-cardlet--more"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      if (dragRef.current?.moved) return;
                      setExpandedDay(cluster.ts);
                      irAFecha(cluster.ts, cluster.key);
                    }}
                    title={`Ver ${cluster.extra} más del ${cluster.fechaLabel}`}
                  >
                    <strong>+{cluster.extra} más</strong>
                    <span>{cluster.fechaLabel}</span>
                  </button>
                ) : null}
              </div>
              <span className="estatus-timeline-dot" aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LayoutEstatusGeneral({
  marca,
  tareas,
  onSelectTask,
  onBack,
  nombreMarca,
  listaDisenadores = [],
  puedeEditar = false,
  onEnviarCliente,
  onGuardarComentario,
  onCambiarEnvioTipo,
  onUpdateField,
  modoGlobal = false,
  onAbrirLista
}) {
  const tareasActivas = useMemo(
    () => (tareas || []).filter((t) => (
      typeof esTareaOcultaEnEstatus === "function" ? !esTareaOcultaEnEstatus(t) : true
    )),
    [tareas]
  );
  const gruposSubcliente = useMemo(
    () => (typeof agruparTareasPorSubclienteEstatus === "function"
      ? agruparTareasPorSubclienteEstatus(tareasActivas, marca)
      : []),
    [tareasActivas, marca]
  );
  const gruposMarca = useMemo(
    () => (modoGlobal && typeof agruparTareasPorMarcaEstatus === "function"
      ? agruparTareasPorMarcaEstatus(tareasActivas)
      : []),
    [tareasActivas, modoGlobal]
  );
  const gruposPersona = useMemo(
    () => (typeof agruparTareasPorPersonaEstatus === "function"
      ? agruparTareasPorPersonaEstatus(tareasActivas, { subgrupoPorMarca: modoGlobal })
      : []),
    [tareasActivas, modoGlobal]
  );
  const [vistaDetalle, setVistaDetalle] = useState(modoGlobal ? "persona" : "subcliente");
  const etiquetaMarca = (nombreMarca || (typeof formatearMarca === "function" ? formatearMarca(marca) : marca) || "esta marca").trim();
  const marcaEstilo = !modoGlobal && typeof getMarcaStyle === "function"
    ? getMarcaStyle(marca)
    : { accent: ESTATUS_VARS_GLOBAL["--estatus-accent"] };
  const estatusVars = modoGlobal
    ? ESTATUS_VARS_GLOBAL
    : varsEstatusDesdeMarca(marcaEstilo.accent);
  const grupos = vistaDetalle === "persona"
    ? gruposPersona
    : (modoGlobal ? gruposMarca : gruposSubcliente);
  const carga = useMemo(
    () => (typeof resumenCargaDisenadoresEstatus === "function"
      ? resumenCargaDisenadoresEstatus(
        tareasActivas,
        listaDisenadores,
        modoGlobal ? null : marcaEstilo.accent
      )
      : { items: [], totalActivas: 0, lideres: [] }),
    [tareasActivas, listaDisenadores, modoGlobal, marcaEstilo.accent]
  );
  const presentacion = useMemo(
    () => (typeof resumenPresentacionEstatus === "function"
      ? resumenPresentacionEstatus(tareas)
      : {
        activos: tareasActivas.length,
        diseno: 0,
        porEnviar: 0,
        cliente: 0,
        atrasados: 0,
        vencenSemana: 0,
        esperaLarga: 0,
        listo: 0,
        listas: { porEnviar: [], esperaCliente: [], faltaHacer: [] },
        atrasadosItems: [],
        listoItems: []
      }),
    [tareas, tareasActivas.length]
  );
  const listas = presentacion.listas || { porEnviar: [], esperaCliente: [], faltaHacer: [] };
  const cargaDiseno = useMemo(
    () => (carga.items || []).filter((item) => item.rol === "diseno"),
    [carga.items]
  );
  const cargaContenido = useMemo(() => (
    (carga.items || [])
      .filter((item) => item.rol === "contenido")
      .map((item) => {
        const peso = (item.tareasActivas || []).reduce(
          (sum, row) => sum + pesoUrgenciaHoyEstatus(row.tarea),
          0
        );
        return { ...item, peso: Math.max(peso, item.activas || 0) };
      })
      .sort((a, b) => b.peso - a.peso || b.activas - a.activas || String(a.nombre).localeCompare(String(b.nombre), "es"))
  ), [carga.items]);
  const porHacerPorMarca = useMemo(() => {
    const map = new Map();
    (listas.faltaHacer || []).forEach((item) => {
      const raw = String(item?.tarea?.marca || "").trim();
      const key = raw ? raw.toLowerCase() : "__sin_marca__";
      const nombre = raw
        ? (typeof formatearMarca === "function" ? formatearMarca(raw) : raw)
        : "Sin marca";
      if (!map.has(key)) {
        const accent = typeof getMarcaStyle === "function"
          ? (getMarcaStyle(raw || nombre).accent || "#37352F")
          : "#37352F";
        map.set(key, { key, nombre, items: [], accent });
      }
      map.get(key).items.push(item);
    });
    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length || String(a.nombre).localeCompare(String(b.nombre), "es"));
  }, [listas.faltaHacer]);
  const topCadenasActivas = useMemo(() => {
    const map = new Map();
    (tareasActivas || []).forEach((t) => {
      const estado = typeof cleanEstado === "function"
        ? cleanEstado(t.estado)
        : String(t?.estado || "").toLowerCase();
      if (estado !== "pendiente" && estado !== "en progreso") return;
      const nombreRaw = typeof obtenerSubclienteTarea === "function"
        ? obtenerSubclienteTarea(t)
        : String(t.subcliente || "").trim();
      const nombre = nombreRaw || "Sin cadena";
      const key = typeof claveSubcliente === "function"
        ? (claveSubcliente(nombre) || "__sin__")
        : nombre.toLowerCase();
      if (!map.has(key)) map.set(key, { key, nombre, count: 0, tareas: [] });
      const g = map.get(key);
      g.count += 1;
      g.tareas.push(t);
    });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count || String(a.nombre).localeCompare(String(b.nombre), "es"))
      .slice(0, 3);
  }, [tareasActivas]);
  const maxCadenasCount = Math.max(1, ...topCadenasActivas.map((g) => g.count || 0));
  const [abiertos, setAbiertos] = useState({});
  const [envioPendiente, setEnvioPendiente] = useState("");
  const [disenadorAbierto, setDisenadorAbierto] = useState(null);
  const [comentarioEditando, setComentarioEditando] = useState("");
  const [comentarioDraft, setComentarioDraft] = useState("");
  const [medidasDraft, setMedidasDraft] = useState(() => (
    typeof medidasVacias === "function" ? medidasVacias() : { activo: false, ancho: "", alto: "", profundidad: "", unidad: "cm" }
  ));
  const [comentarioTip, setComentarioTip] = useState(null);
  const [esperaExpandida, setEsperaExpandida] = useState(false);
  const [faltaExpandida, setFaltaExpandida] = useState(false);
  const [panelSnapshot, setPanelSnapshot] = useState(null);
  const [filtroSnapshot, setFiltroSnapshot] = useState("todos");
  const [editFechaKey, setEditFechaKey] = useState("");
  const [draftFecha, setDraftFecha] = useState("");
  const [exportandoCliente, setExportandoCliente] = useState(false);
  useEffect(() => {
    setFiltroSnapshot("todos");
  }, [panelSnapshot]);
  const filasEstatus = useMemo(
    () => (typeof filasEstatusReferencia === "function" ? filasEstatusReferencia() : []),
    []
  );

  const etiquetaEnvio = (tarea) => (
    typeof etiquetaEnvioTipoEstatus === "function"
      ? etiquetaEnvioTipoEstatus(tarea, filasEstatus)
      : ""
  );

  const alternarEnvioTipo = (tarea) => {
    if (!onCambiarEnvioTipo) return;
    const actual = typeof obtenerEnvioTipoTarea === "function" ? obtenerEnvioTipoTarea(tarea) : "";
    onCambiarEnvioTipo(tarea, actual === "arte-final" ? "propuesta" : "arte-final");
  };
  const LISTA_VISIBLE_INICIAL = 5;

  const exportarParaCliente = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (modoGlobal || exportandoCliente) return;
    if (typeof exportarEstatusClientePDF !== "function") {
      window.alert("No está disponible el export · recarga la página");
      return;
    }
    setExportandoCliente(true);
    try {
      Promise.resolve(exportarEstatusClientePDF(tareas, {
        marca,
        nombreMarca: etiquetaMarca,
        accent: marcaEstilo.accent,
        onDone: () => setExportandoCliente(false)
      })).catch((err) => {
        setExportandoCliente(false);
        window.alert(String(err?.message || "No se pudo exportar el PDF"));
      });
    } catch (err) {
      setExportandoCliente(false);
      window.alert(String(err?.message || "No se pudo exportar el PDF"));
    }
  };

  const renderBotonExportarCliente = () => (
    <button
      type="button"
      className="estatus-export-cliente-btn"
      onClick={exportarParaCliente}
      disabled={exportandoCliente}
      title="Exportar proyección para el cliente"
    >
      <i className={`fa-solid ${exportandoCliente ? "fa-spinner fa-spin" : "fa-file-arrow-down"}`} aria-hidden="true" />
      <span>Exportar para cliente</span>
    </button>
  );

  const nombresGrupos = grupos.map((g) => g.nombre).join("|");
  useEffect(() => {
    if (vistaDetalle === "persona") return;
    const inicial = {};
    grupos.forEach((g) => { inicial[g.nombre] = true; });
    setAbiertos(inicial);
  }, [nombresGrupos, vistaDetalle]);

  const toggleGrupo = (nombre) => {
    setAbiertos((prev) => ({ ...prev, [nombre]: !prev[nombre] }));
  };

  const titulo = (valor) => String(valor || "").replace(/\s+/g, " ").trim();
  const tituloEntregable = (info, cadena) => (
    typeof textoEstatusEntregable === "function" ? textoEstatusEntregable(info, cadena) : titulo(info)
  );

  const fechaCorta = (val) => {
    if (!val || val === "—" || (typeof esDeadlineTbd === "function" && esDeadlineTbd(val))) {
      return typeof DEADLINE_TBD !== "undefined" ? DEADLINE_TBD : "TBD";
    }
    if (typeof parsearFechaLibre === "function") {
      const parsed = parsearFechaLibre(val);
      if (parsed) {
        const aa = String(parsed.anio).slice(-2);
        return `${String(parsed.dia).padStart(2, "0")}/${String(parsed.mes).padStart(2, "0")}/${aa}`;
      }
    }
    const iso = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1].slice(-2)}`;
    return String(val);
  };

  const linkDeTarea = (t) => {
    if (typeof obtenerLinkTarea === "function") return obtenerLinkTarea(t) || "";
    const parsed = typeof parseDetalles === "function" ? parseDetalles(t?.detalles || "") : {};
    const raw = t?.link || parsed.link || "";
    return typeof normalizarUrlEnlace === "function" ? normalizarUrlEnlace(raw) : String(raw || "").trim();
  };

  const botonCor = (href) => {
    if (!href) return null;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="estatus-cor-btn"
        title="Abrir en Cor"
        onClick={(e) => e.stopPropagation()}
      >
        Cor
        <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
      </a>
    );
  };

  const puedeInline = !!(puedeEditar && typeof onUpdateField === "function");
  const opcionesEstado = Array.isArray(ESTADOS_MAPA) ? ESTADOS_MAPA : [];

  const abrirEdicionFecha = (tarea) => {
    if (!puedeInline) return;
    const key = getTaskSelectionKey(tarea);
    const valor = typeof deadlineParaEdicion === "function"
      ? deadlineParaEdicion(tarea.deadline)
      : (tarea.deadline || "");
    setEditFechaKey(key);
    setDraftFecha(valor || "");
  };

  const guardarFechaInline = (tarea, valor) => {
    setEditFechaKey("");
    setDraftFecha("");
    if (!puedeInline) return;
    const actual = typeof deadlineParaEdicion === "function"
      ? deadlineParaEdicion(tarea.deadline)
      : (tarea.deadline || "");
    const siguiente = String(valor || "").trim();
    if (!siguiente) return;
    if (siguiente === String(actual || "").trim()) return;
    onUpdateField(tarea, "deadline", siguiente);
  };

  const guardarEstadoInline = (tarea, valor) => {
    if (!puedeInline) return;
    const siguiente = String(valor || "").trim();
    if (!siguiente) return;
    if (cleanEstado(siguiente) === cleanEstado(tarea.estado)) return;
    onUpdateField(tarea, "estado", siguiente);
  };

  const renderFilaTarea = (t, cadena, grupoNombre) => {
    const key = getTaskSelectionKey(t);
    const cEstado = ESTADOS_MAPA.find((e) => cleanEstado(e.id) === cleanEstado(t.estado)) || { dot: "bg-zinc-400", bg: "" };
    const parsed = parseDetalles(t.detalles || "");
    const partes = notasYComentarioEstatus(parsed.notas);
    const comentario = partes.comentario || partes.notas;
    const fecha = fechaCorta(t.deadline || t.fechaInicio || "—");
    const link = linkDeTarea(t);
    const editandoFecha = editFechaKey === key;
    const estadoActual = normalizarEstado(t.estado) || "";
    return (
      <tr key={key} onClick={() => onSelectTask(t)}>
        <td className="estatus-notion-title">{tituloEntregable(t.info || "Sin título", cadena || grupoNombre)}</td>
        <td
          className="estatus-notion-fecha"
          onClick={(e) => {
            if (!puedeInline) return;
            e.stopPropagation();
          }}
        >
          {puedeInline && editandoFecha ? (
            <div className="estatus-inline-fecha-wrap" onClick={(e) => e.stopPropagation()}>
              <InputFechaLibre
                value={draftFecha}
                onChange={setDraftFecha}
                onBlurExtra={(val) => guardarFechaInline(t, val)}
                className="estatus-inline-fecha-input"
                placeholder="TBD o dd/mm/aaaa"
                emptyAsTbd
              />
            </div>
          ) : puedeInline ? (
            <button
              type="button"
              className="estatus-inline-fecha-btn"
              title="Cambiar fecha"
              onClick={(e) => {
                e.stopPropagation();
                abrirEdicionFecha(t);
              }}
            >
              {fecha}
              <i className="fa-regular fa-pen-to-square" aria-hidden="true" />
            </button>
          ) : (
            fecha
          )}
        </td>
        <td
          className="estatus-notion-estado"
          onClick={(e) => {
            if (!puedeInline) return;
            e.stopPropagation();
          }}
        >
          {puedeInline ? (
            <label className={`estatus-inline-estado ${cEstado.bg || ""}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cEstado.dot}`} aria-hidden="true" />
              <select
                value={estadoActual}
                aria-label="Cambiar estado"
                onChange={(e) => guardarEstadoInline(t, e.target.value)}
                onClick={(e) => e.stopPropagation()}
              >
                {opcionesEstado.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.id}</option>
                ))}
                {estadoActual && !opcionesEstado.some((o) => cleanEstado(o.id) === cleanEstado(estadoActual)) ? (
                  <option value={estadoActual}>{estadoActual}</option>
                ) : null}
              </select>
            </label>
          ) : (
            <span className={`estatus-task-estado ${cEstado.bg || ""}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cEstado.dot}`} />
              {estadoActual || "Sin estado"}
            </span>
          )}
        </td>
        <td className="estatus-notion-coment">
          <span className="estatus-notion-coment-row">
            <span>{comentario || "—"}</span>
            {botonCor(link)}
          </span>
        </td>
      </tr>
    );
  };

  const renderTablaGrupo = (grupo) => {
    const abierto = abiertos[grupo.nombre] !== false;
    return (
      <section key={grupo.nombre} className="estatus-notion-group">
        <div className="estatus-notion-head">
          <button type="button" className="estatus-notion-head-toggle" onClick={() => toggleGrupo(grupo.nombre)}>
            <i className={`fa-solid ${abierto ? "fa-chevron-down" : "fa-chevron-right"}`} />
            <span className="estatus-cadena-title">{titulo(grupo.nombre)}</span>
          </button>
          <span className="estatus-cadena-count">{grupo.tareas.length}</span>
        </div>
        {abierto && (
          <div className="estatus-notion-table-wrap">
            <table className="estatus-notion-table">
              <thead>
                <tr>
                  <th>Entregable</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Comentarios</th>
                </tr>
              </thead>
              <tbody>
                {grupo.tareas.map((t) => {
                  const cadena = typeof obtenerSubclienteTarea === "function"
                    ? obtenerSubclienteTarea(t)
                    : (t.subcliente || "");
                  return renderFilaTarea(t, cadena, grupo.nombre);
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  };

  const renderGrupoPersona = (grupo) => {
    const subgrupos = grupo.subgrupos && grupo.subgrupos.length
      ? grupo.subgrupos
      : [{ nombre: "Sin cadena", tareas: grupo.tareas || [] }];
    const total = subgrupos.reduce((n, sub) => n + (sub.tareas || []).length, 0);

    return (
      <section key={grupo.nombre} className="estatus-notion-group estatus-notion-group--persona">
        <div className="estatus-persona-head">
          <span className="estatus-cadena-title">{titulo(grupo.nombre)}</span>
          <span className="estatus-cadena-count">{total}</span>
        </div>
        {subgrupos.map((sub) => (
          <div key={`${grupo.nombre}-${sub.nombre}`} className="estatus-cadena-subgroup">
            <div className="estatus-cadena-subhead">
              <span>{titulo(sub.nombre) || "Sin cadena"}</span>
              <span>{(sub.tareas || []).length}</span>
            </div>
            <div className="estatus-notion-table-wrap">
              <table className="estatus-notion-table">
                <thead>
                  <tr>
                    <th>Entregable</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>Comentarios</th>
                  </tr>
                </thead>
                <tbody>
                  {(sub.tareas || []).map((t) => renderFilaTarea(t, sub.nombre, grupo.nombre))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>
    );
  };

  const abrirSnapshotCadena = (grupo, color) => {
    const items = (grupo.tareas || []).map((t) => {
      const parsed = typeof parseDetalles === "function"
        ? parseDetalles(t.detalles || "")
        : { notas: t.detalles || "" };
      const partes = typeof notasYComentarioEstatus === "function"
        ? notasYComentarioEstatus(parsed.notas)
        : { notas: parsed.notas || "", comentario: "" };
      return typeof itemOperativoEstatus === "function"
        ? itemOperativoEstatus(t, partes)
        : {
          tarea: t,
          cadena: grupo.nombre,
          entregable: t.info || "Sin título",
          comentario: "",
          fecha: t.deadline || ""
        };
    });
    setPanelSnapshot({
      titulo: `Trabajos altos · ${grupo.nombre}`,
      items,
      modo: "diseno",
      accent: color
    });
  };

  const renderPanorama = () => (
    <>
      <div className="estatus-section-label">Panorama</div>
      <div className="estatus-panorama-grid">
        <section className="estatus-panorama-card estatus-panorama-card--diseno">
          <p className="estatus-carga-duo-title">Diseño</p>
          <p className="estatus-section-hint">Quién lleva más peso ahora</p>
          {cargaDiseno.length === 0 ? (
            <p className="estatus-lista-empty">Sin carga de diseño</p>
          ) : (
            <div className="estatus-carga-pie-wrap">
              <button
                type="button"
                className="estatus-carga-pie"
                aria-label="Distribución de carga de diseño"
                onClick={() => {
                  const top = cargaDiseno[0];
                  if (top) setDisenadorAbierto(top);
                }}
              >
                <PieCargaEstatus items={cargaDiseno} valueKey="activas" onSelect={setDisenadorAbierto} />
              </button>
              <ul className="estatus-carga-pie-legend">
                {cargaDiseno.map((item) => (
                  <li key={item.handle}>
                    <button type="button" className="estatus-carga-pie-legend-btn" onClick={() => setDisenadorAbierto(item)}>
                      <span className="estatus-carga-pie-swatch" style={{ background: item.color }} aria-hidden="true" />
                      <span className="estatus-carga-pie-name">{item.nombre}</span>
                      <strong>{item.activas}</strong>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="estatus-panorama-card estatus-panorama-card--contenido">
          <p className="estatus-carga-duo-title">Contenido</p>
          <p className="estatus-section-hint">Urgencia hoy (prioridad + fechas)</p>
          {cargaContenido.length === 0 ? (
            <p className="estatus-lista-empty">Sin carga de contenido</p>
          ) : (
            <div className="estatus-carga-pie-wrap">
              <button
                type="button"
                className="estatus-carga-pie"
                aria-label="Distribución de carga de contenido"
                onClick={() => {
                  const top = cargaContenido[0];
                  if (top) setDisenadorAbierto(top);
                }}
              >
                <PieCargaEstatus items={cargaContenido} valueKey="peso" onSelect={setDisenadorAbierto} />
              </button>
              <ul className="estatus-carga-pie-legend">
                {cargaContenido.map((item) => (
                  <li key={item.handle}>
                    <button type="button" className="estatus-carga-pie-legend-btn" onClick={() => setDisenadorAbierto(item)}>
                      <span className="estatus-carga-pie-swatch" style={{ background: item.color }} aria-hidden="true" />
                      <span className="estatus-carga-pie-name">{item.nombre}</span>
                      <strong>{item.activas}</strong>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="estatus-panorama-card estatus-panorama-card--carga">
          <p className="estatus-carga-duo-title">Trabajos altos</p>
          <p className="estatus-section-hint">Cadenas con más tareas pendientes / en progreso</p>
          {topCadenasActivas.length === 0 ? (
            <p className="estatus-lista-empty">Sin cadenas con carga activa</p>
          ) : (
            <div className="estatus-vbars" role="img" aria-label="Cadenas con más trabajos">
              {topCadenasActivas.map((grupo, idx) => {
                const pct = Math.round(((grupo.count || 0) / maxCadenasCount) * 100);
                const color = idx === 0
                  ? "var(--estatus-accent-3, #EA580C)"
                  : (idx === 1 ? "var(--estatus-accent-2, #7C3AED)" : "var(--estatus-accent, #0D9488)");
                return (
                  <button
                    key={grupo.key}
                    type="button"
                    className="estatus-vbar-col"
                    onClick={() => abrirSnapshotCadena(grupo, color)}
                  >
                    <strong className="estatus-vbar-count">{grupo.count}</strong>
                    <div className="estatus-vbar-track">
                      <div className="estatus-vbar-fill" style={{ height: `${pct}%`, background: color }} />
                    </div>
                    <span className="estatus-vbar-label">{grupo.nombre}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );

  const confirmarEnvio = (tarea, tipo) => {
    if (onEnviarCliente) onEnviarCliente(tarea, tipo);
    setEnvioPendiente("");
    if (panelSnapshot) {
      const key = getTaskSelectionKey(tarea);
      setPanelSnapshot((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: (prev.items || []).filter((it) => getTaskSelectionKey(it.tarea) !== key)
        };
      });
    }
  };

  const abrirEditorComentario = (key, comentarioActual, tarea) => {
    const texto = typeof quitarBloqueMedidasDeTexto === "function"
      ? quitarBloqueMedidasDeTexto(comentarioActual)
      : (comentarioActual || "");
    const parsed = typeof parseDetalles === "function" && tarea
      ? parseDetalles(tarea.detalles || "")
      : {};
    const medidas = typeof normalizarMedidas === "function"
      ? normalizarMedidas(parsed.medidas)
      : { activo: false, ancho: "", alto: "", profundidad: "", unidad: "cm" };
    setComentarioEditando(key);
    setComentarioDraft(texto);
    setMedidasDraft(medidas);
  };

  const cerrarEditorComentario = () => {
    setComentarioEditando("");
    setComentarioDraft("");
    setMedidasDraft(typeof medidasVacias === "function" ? medidasVacias() : { activo: false, ancho: "", alto: "", profundidad: "", unidad: "cm" });
  };

  const guardarComentario = (tarea) => {
    if (!onGuardarComentario) return;
    onGuardarComentario(tarea, comentarioDraft, medidasDraft);
    cerrarEditorComentario();
  };

  const textoTipComentario = (valor) => {
    if (typeof htmlNotasAPlainText === "function") return htmlNotasAPlainText(valor);
    return String(valor || "").trim();
  };

  const mostrarTipComentario = (event, comentario) => {
    const texto = textoTipComentario(comentario);
    if (!texto) {
      setComentarioTip(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const maxW = Math.min(320, window.innerWidth - 24);
    let left = rect.left;
    if (left + maxW > window.innerWidth - 12) left = Math.max(12, window.innerWidth - maxW - 12);
    const espacioAbajo = window.innerHeight - rect.bottom;
    const colocarArriba = espacioAbajo < 96 && rect.top > espacioAbajo;
    setComentarioTip({
      texto,
      left,
      top: colocarArriba ? rect.top : rect.bottom,
      arriba: colocarArriba,
      maxW
    });
  };

  const ocultarTipComentario = () => setComentarioTip(null);

  useEffect(() => {
    if (!comentarioTip) return undefined;
    const hide = () => setComentarioTip(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [comentarioTip]);

  const abrirPanelSnapshot = (key) => {
    const paneles = {
      diseno: { titulo: "Por hacer", items: listas.faltaHacer || [], modo: "diseno" },
      enviar: { titulo: "Por enviar", items: listas.porEnviar || [], modo: "enviar" },
      cliente: { titulo: "Con el cliente", items: listas.esperaCliente || [], modo: "cliente" },
      atrasados: { titulo: "Atrasados", items: presentacion.atrasadosItems || [], modo: "atrasados" },
      listo: { titulo: "Listo esta semana", items: presentacion.listoItems || [], modo: "listo" }
    };
    const panel = paneles[key];
    if (!panel) return;
    setPanelSnapshot(panel);
  };

  const etiquetaDiasItem = (tarea, modo) => (
    typeof etiquetaDiasSnapshotEstatus === "function"
      ? etiquetaDiasSnapshotEstatus(tarea, modo)
      : ""
  );

  const itemDisenador = disenadorAbierto
    ? ((carga.items || []).find((i) => i.handle === disenadorAbierto.handle) || disenadorAbierto)
    : null;
  const filasDisenador = itemDisenador?.tareasActivas || [];

  const overlayDisenador = itemDisenador ? (
    <div
      className="estatus-mini-overlay"
      onClick={() => setDisenadorAbierto(null)}
    >
      <div
        className="estatus-mini-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={itemDisenador.nombreCompleto || itemDisenador.nombre}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="estatus-mini-sheet-head">
          <button type="button" className="estatus-mini-sheet-back" onClick={() => setDisenadorAbierto(null)}>
            <i className="fa-solid fa-chevron-left" />
            <span>Estatus</span>
          </button>
          <div className="estatus-mini-sheet-title">
            <strong>{itemDisenador.nombreCompleto || itemDisenador.nombre}</strong>
            <span>{itemDisenador.activas} en carga</span>
          </div>
        </header>
        {filasDisenador.length === 0 ? (
          <p className="estatus-lista-empty">No tiene entregables activos en {etiquetaMarca}</p>
        ) : (
          <ul className="estatus-mini-sheet-list">
            {filasDisenador.map((row) => {
              const t = row.tarea;
              const cEstado = ESTADOS_MAPA.find((e) => cleanEstado(e.id) === cleanEstado(t.estado)) || { dot: "bg-zinc-400", bg: "" };
              return (
                <li key={getTaskSelectionKey(t)}>
                  <button type="button" className="estatus-enviar-main estatus-enviar-main--solo" onClick={() => onSelectTask(t)}>
                    <span className="estatus-item-title">{tituloEntregable(row.entregable, row.cadena)}</span>
                    <span className="estatus-item-subtitle">{titulo(row.cadena) || "Sin cadena"}</span>
                    <em className="estatus-carga-task-meta">
                      <span className={`estatus-task-estado ${cEstado.bg || ""}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cEstado.dot}`} />
                        {normalizarEstado(t.estado) || "Sin estado"}
                      </span>
                      {t.deadline || t.fechaInicio || ""}
                    </em>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  ) : null;

  const overlaySnapshot = (() => {
    if (!panelSnapshot) return null;
    const items = panelSnapshot.items || [];
    const enriquecidos = items.map((item) => {
      const dias = etiquetaDiasItem(item.tarea, panelSnapshot.modo);
      return { item, dias, tipo: tipoFechaSnapshotEstatus(dias) };
    });
    const contadores = {
      todos: enriquecidos.length,
      atrasado: enriquecidos.filter((r) => r.tipo === "atrasado").length,
      "sin-fecha": enriquecidos.filter((r) => r.tipo === "sin-fecha").length,
      "en-fecha": enriquecidos.filter((r) => r.tipo === "en-fecha").length
    };
    const filtrados = filtroSnapshot === "todos"
      ? enriquecidos
      : enriquecidos.filter((r) => r.tipo === filtroSnapshot);
    const grupos = agruparItemsSnapshotPorCadena(
      filtrados.map((r) => r.item),
      panelSnapshot.modo,
      etiquetaDiasItem
    );
    const accent = panelSnapshot.accent || "";
    const filtros = [
      { id: "todos", label: "Todos", n: contadores.todos },
      { id: "atrasado", label: "Atrasados", n: contadores.atrasado },
      { id: "sin-fecha", label: "TBD", n: contadores["sin-fecha"] },
      { id: "en-fecha", label: "En fecha", n: contadores["en-fecha"] }
    ].filter((f) => f.id === "todos" || f.n > 0);

    return (
      <div className="estatus-mini-overlay" onClick={() => setPanelSnapshot(null)}>
        <div
          className="estatus-mini-sheet estatus-mini-sheet--snapshot"
          role="dialog"
          aria-modal="true"
          aria-label={panelSnapshot.titulo}
          style={accent ? { "--estatus-accent": accent, "--sheet-accent": accent } : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          <header className="estatus-mini-sheet-head">
            <button type="button" className="estatus-mini-sheet-back" onClick={() => setPanelSnapshot(null)}>
              <i className="fa-solid fa-chevron-left" />
              <span>Estatus</span>
            </button>
            <div className="estatus-mini-sheet-title">
              <strong>{panelSnapshot.titulo}</strong>
              <span>
                {items.length} entregables
                {contadores.atrasado > 0 ? ` · ${contadores.atrasado} atrasados` : ""}
              </span>
            </div>
          </header>
          {filtros.length > 1 ? (
            <div className="estatus-sheet-filtros" role="tablist" aria-label="Filtrar por fecha">
              {filtros.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={filtroSnapshot === f.id}
                  className={`estatus-sheet-filtro ${filtroSnapshot === f.id ? "is-on" : ""}`}
                  onClick={() => setFiltroSnapshot(f.id)}
                >
                  {f.label}
                  <b>{f.n}</b>
                </button>
              ))}
            </div>
          ) : null}
          {filtrados.length === 0 ? (
            <p className="estatus-lista-empty">No hay entregables en este filtro</p>
          ) : (
            <div className="estatus-sheet-grupos">
              {grupos.map((grupo) => (
                <section key={grupo.key} className="estatus-sheet-grupo">
                  <div className="estatus-sheet-grupo-head">
                    <span>{grupo.nombre}</span>
                    <strong>{grupo.items.length}</strong>
                  </div>
                  <ul className="estatus-mini-sheet-list estatus-mini-sheet-list--compact">
                    {grupo.items.map(({ item, dias, tipo }) => {
                      const t = item.tarea;
                      const key = getTaskSelectionKey(t);
                      const persona = metaPersonaSnapshotEstatus(t);
                      const abierto = envioPendiente === key;
                      const puedeEnviar = !!(puedeEditar && onEnviarCliente);
                      const chipClass = tipo === "atrasado"
                        ? "is-late"
                        : (tipo === "sin-fecha" ? "is-none" : (panelSnapshot.modo === "cliente" ? "is-wait" : "is-week"));
                      return (
                        <li key={key} className={abierto ? "is-open" : ""}>
                          <div className="estatus-sheet-row-wrap">
                            {puedeEnviar ? (
                              <button
                                type="button"
                                className={`estatus-check-btn estatus-check-btn--sheet ${abierto ? "is-open" : ""}`}
                                aria-label="Marcar enviado al cliente"
                                onClick={() => setEnvioPendiente(abierto ? "" : key)}
                              >
                                <i className="fa-solid fa-check" />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="estatus-sheet-row"
                              onClick={() => {
                                setPanelSnapshot(null);
                                onSelectTask(t);
                              }}
                            >
                              <span className="estatus-sheet-row-main">
                                <span className="estatus-item-title">{tituloEntregable(item.entregable, item.cadena)}</span>
                                {persona ? <span className="estatus-sheet-row-meta">{persona}</span> : null}
                              </span>
                              <span className={`estatus-chip ${chipClass}`}>
                                {etiquetaChipSnapshotEstatus(dias)}
                              </span>
                            </button>
                          </div>
                          {abierto ? (
                            <div className="estatus-enviar-menu estatus-enviar-menu--sheet">
                              <p>¿Qué se envió?</p>
                              <button type="button" onClick={() => confirmarEnvio(t, "propuesta")}>
                                Propuesta
                                <em>Pasa a espera de comentarios</em>
                              </button>
                              <button type="button" onClick={() => confirmarEnvio(t, "arte-final")}>
                                Arte final
                                <em>La tarea queda completada</em>
                              </button>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  })();

  const renderListaFalta = (items) => {
    const restantes = Math.max(0, items.length - LISTA_VISIBLE_INICIAL);
    const visibles = faltaExpandida || restantes === 0
      ? items
      : items.slice(0, LISTA_VISIBLE_INICIAL);
    return (
      <section className="estatus-lista-card estatus-lista-card--falta">
        <div className="estatus-lista-card-head">
          <h3>Falta por hacer</h3>
          <span>{items.length}</span>
        </div>
        {items.length === 0 ? (
          <p className="estatus-lista-empty">Nada pendiente internamente</p>
        ) : (
          <>
            <ul>
              {visibles.map((item) => {
                const t = item.tarea;
                const cEstado = ESTADOS_MAPA.find((e) => cleanEstado(e.id) === cleanEstado(t.estado)) || { dot: "bg-zinc-400", bg: "" };
                return (
                  <li key={getTaskSelectionKey(t)}>
                    <button type="button" className="estatus-enviar-main estatus-enviar-main--solo" onClick={() => onSelectTask(t)}>
                      <span className="estatus-item-title">{tituloEntregable(item.entregable, item.cadena)}</span>
                      <span className="estatus-item-subtitle">{titulo(item.cadena) || "Sin cadena"}</span>
                      <em className="estatus-carga-task-meta">
                        <span className={`estatus-task-estado ${cEstado.bg || ""}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cEstado.dot}`} />
                          {normalizarEstado(t.estado) || "Sin estado"}
                        </span>
                      </em>
                    </button>
                  </li>
                );
              })}
            </ul>
            {restantes > 0 ? (
              <button
                type="button"
                className={`estatus-espera-more ${faltaExpandida ? "is-collapse" : ""}`}
                onClick={() => setFaltaExpandida((v) => !v)}
                aria-label={faltaExpandida ? "Ocultar pendientes" : `Ver ${restantes} más`}
              >
                {faltaExpandida ? (
                  <i className="fa-solid fa-chevron-up" aria-hidden="true" />
                ) : (
                  `${restantes}+`
                )}
              </button>
            ) : null}
          </>
        )}
      </section>
    );
  };

  const renderListaEnviar = (items) => (
    <section className="estatus-lista-card">
      <div className="estatus-lista-card-head">
        <h3>Por enviar al cliente</h3>
        <span>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="estatus-lista-empty">Nada pendiente de envío</p>
      ) : (
        <ul>
          {items.map((item) => {
            const key = getTaskSelectionKey(item.tarea);
            const abierto = envioPendiente === key;
            return (
              <li key={key} className={abierto ? "is-open" : ""}>
                <div className="estatus-enviar-row">
                  {puedeEditar && onEnviarCliente ? (
                    <button
                      type="button"
                      className={`estatus-check-btn ${abierto ? "is-open" : ""}`}
                      aria-label="Marcar enviado al cliente"
                      onClick={() => setEnvioPendiente(abierto ? "" : key)}
                    >
                      <i className="fa-solid fa-check" />
                    </button>
                  ) : null}
                  <button type="button" className="estatus-enviar-main" onClick={() => onSelectTask(item.tarea)}>
                    <span className="estatus-item-title">{tituloEntregable(item.entregable, item.cadena)}</span>
                    <span className="estatus-item-subtitle">{titulo(item.cadena) || "Sin cadena"}</span>
                  </button>
                  {etiquetaEnvio(item.tarea) ? (
                    puedeEditar && onCambiarEnvioTipo ? (
                      <button
                        type="button"
                        className="estatus-enviar-tipo"
                        onClick={() => alternarEnvioTipo(item.tarea)}
                        title="Clic para cambiar entre propuesta y arte final"
                      >
                        {etiquetaEnvio(item.tarea)}
                      </button>
                    ) : (
                      <span className="estatus-enviar-tipo estatus-enviar-tipo--static">
                        {etiquetaEnvio(item.tarea)}
                      </span>
                    )
                  ) : null}
                </div>
                {abierto ? (
                  <div className="estatus-enviar-menu">
                    <p>¿Qué se envió?</p>
                    <button type="button" onClick={() => confirmarEnvio(item.tarea, "propuesta")}>
                      Propuesta
                      <em>Pasa a espera de comentarios</em>
                    </button>
                    <button type="button" onClick={() => confirmarEnvio(item.tarea, "arte-final")}>
                      Arte final
                      <em>La tarea queda completada</em>
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  const renderListaEspera = (items) => {
    const restantes = Math.max(0, items.length - LISTA_VISIBLE_INICIAL);
    const visibles = esperaExpandida || restantes === 0
      ? items
      : items.slice(0, LISTA_VISIBLE_INICIAL);

    return (
    <section className="estatus-lista-card estatus-lista-card--espera">
      <div className="estatus-lista-card-head">
        <h3>Espera de comentarios</h3>
        <span>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="estatus-lista-empty">Nada en seguimiento con el cliente</p>
      ) : (
        <div className="estatus-espera-table-wrap">
          <div className="estatus-espera-table-head" aria-hidden="true">
            <span>Cadena</span>
            <span>Entregable</span>
            <span>Comentario</span>
            <span />
          </div>
          <ul className="estatus-espera-table">
            {visibles.map((item) => {
              const key = getTaskSelectionKey(item.tarea);
              const comentario = String(item.comentario || "").trim();
              const comentarioVista = typeof quitarBloqueMedidasDeTexto === "function"
                ? quitarBloqueMedidasDeTexto(comentario)
                : comentario;
              const medidasItem = typeof parseDetalles === "function"
                ? (parseDetalles(item.tarea?.detalles || "").medidas || null)
                : null;
              const medidasTxt = typeof textoMedidasParaCor === "function" ? textoMedidasParaCor(medidasItem) : "";
              const editando = comentarioEditando === key;
              return (
                <li key={key} className={editando ? "is-open" : ""}>
                  <div className="estatus-espera-table-row">
                    <button
                      type="button"
                      className="estatus-espera-cell estatus-espera-cell--cadena"
                      onClick={() => onSelectTask(item.tarea)}
                    >
                      {titulo(item.cadena) || "Sin cadena"}
                    </button>
                    <button
                      type="button"
                      className="estatus-espera-cell estatus-espera-cell--entregable"
                      onClick={() => onSelectTask(item.tarea)}
                    >
                      {tituloEntregable(item.entregable, item.cadena)}
                    </button>
                    <span
                      className={`estatus-espera-coment-wrap ${comentarioVista ? "has-tip" : ""}`}
                      onMouseEnter={(e) => mostrarTipComentario(e, [comentarioVista, medidasTxt].filter(Boolean).join("\n"))}
                      onMouseLeave={ocultarTipComentario}
                    >
                      <span
                        className={`estatus-espera-cell estatus-espera-cell--coment ${comentarioVista || medidasTxt ? "" : "is-empty"}`}
                      >
                        {comentarioVista || medidasTxt || "—"}
                      </span>
                    </span>
                    {puedeEditar && onGuardarComentario ? (
                      <button
                        type="button"
                        className={`estatus-comentario-btn estatus-comentario-btn--icon ${editando ? "is-open" : ""}`}
                        aria-label={comentario ? "Editar comentario" : "Añadir comentario"}
                        onClick={() => (editando ? cerrarEditorComentario() : abrirEditorComentario(key, comentario, item.tarea))}
                      >
                        <i className={`fa-${comentario ? "solid" : "regular"} fa-comment`} />
                      </button>
                    ) : (
                      <span className="estatus-espera-cell estatus-espera-cell--action" aria-hidden="true" />
                    )}
                  </div>
                  {editando ? (
                    <div className="estatus-comentario-editor estatus-comentario-editor--inline">
                      <textarea
                        value={comentarioDraft}
                        onChange={(e) => setComentarioDraft(e.target.value)}
                        placeholder="Comentario del cliente…"
                        rows={2}
                      />
                      <CuadroMedidas
                        value={medidasDraft}
                        onChange={setMedidasDraft}
                        onSave={() => guardarComentario(item.tarea)}
                        compact
                      />
                      <div className="estatus-comentario-editor-actions">
                        <button type="button" className="estatus-comentario-cancel" onClick={cerrarEditorComentario}>
                          Cancelar
                        </button>
                        <button type="button" className="estatus-comentario-save" onClick={() => guardarComentario(item.tarea)}>
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {restantes > 0 ? (
            <button
              type="button"
              className={`estatus-espera-more ${esperaExpandida ? "is-collapse" : ""}`}
              onClick={() => setEsperaExpandida((v) => !v)}
              aria-label={esperaExpandida ? "Ocultar pendientes" : `Ver ${restantes} más`}
            >
              {esperaExpandida ? (
                <i className="fa-solid fa-chevron-up" aria-hidden="true" />
              ) : (
                `${restantes}+`
              )}
            </button>
          ) : null}
        </div>
      )}
    </section>
    );
  };

  const overlays = (
    <>
      {overlayDisenador}
      {overlaySnapshot}
    </>
  );
  const portalOverlay = (overlayDisenador || overlaySnapshot) && typeof ModalPortal === "function"
    ? <ModalPortal>{overlays}</ModalPortal>
    : overlays;

  return (
    <div
      className={`estatus-general-page ${modoGlobal ? "estatus-general-page--global" : ""}`}
      style={estatusVars}
    >
      {modoGlobal ? (
        <div className="estatus-global-title-bar">
          <div className="min-w-0">
            <h2>Estatus</h2>
            <p>Panorama, semana, por hacer y detalle</p>
          </div>
        </div>
      ) : (
        <>
          <MobileSubpageBar
            title="Estatus general"
            onBack={onBack}
            backLabel={nombreMarca}
            action={renderBotonExportarCliente()}
          />
          <div className="robin-desktop-only marca-info-desktop-bar">
            <button type="button" onClick={onBack} className="marca-info-desktop-back">
              <i className="fa-solid fa-chevron-left text-[10px]" />
              <span>{nombreMarca}</span>
            </button>
            <div className="estatus-export-title-row">
              <h2 className="marca-info-desktop-title">Estatus general</h2>
              {renderBotonExportarCliente()}
            </div>
          </div>
        </>
      )}

      {modoGlobal ? (
        <>
          {renderPanorama()}

          <TimelineAtajarEstatus
            itemsFaltaHacer={listas.faltaHacer}
            onSelectTask={onSelectTask}
          />

          <section className="estatus-porhacer-block">
            <div className="estatus-lista-card-head">
              <h3>Por hacer</h3>
              <span>{(listas.faltaHacer || []).length}</span>
            </div>
            {porHacerPorMarca.length === 0 ? (
              <p className="estatus-lista-empty">Nada pendiente internamente</p>
            ) : (
              <div className="estatus-porhacer-tiles">
                {porHacerPorMarca.map((grupo) => (
                  <button
                    key={grupo.key}
                    type="button"
                    className="estatus-porhacer-tile"
                    style={{ "--marca-accent": grupo.accent }}
                    onClick={() => setPanelSnapshot({
                      titulo: `Por hacer · ${grupo.nombre}`,
                      items: grupo.items,
                      modo: "diseno",
                      accent: grupo.accent
                    })}
                  >
                    <span className="estatus-porhacer-tile-name">{grupo.nombre}</span>
                    <strong className="estatus-porhacer-tile-count">{grupo.items.length}</strong>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          {renderPanorama()}

          <section className="estatus-semana">
            <div className="estatus-section-label">Resumen de la semana</div>
            <ul className="estatus-snapshot">
              {[
                { key: "activos", label: "Activos", value: presentacion.activos },
                { key: "diseno", label: "Por hacer", value: presentacion.diseno, panel: true },
                { key: "enviar", label: "Por enviar", value: presentacion.porEnviar, panel: true },
                { key: "cliente", label: "Con el cliente", value: presentacion.cliente, panel: true },
                { key: "listo", label: "Listo", value: presentacion.listo, panel: true },
                { key: "atrasados", label: "Atrasados", value: presentacion.atrasados, late: true, panel: true }
              ].map((tile) => {
                const clase = `estatus-snapshot-tile ${tile.late && tile.value > 0 ? "is-late" : ""} ${tile.panel ? "is-btn" : ""}`;
                const inner = (
                  <>
                    <strong>{tile.value}</strong>
                    <span>{tile.label}</span>
                  </>
                );
                return (
                  <li key={tile.key}>
                    {tile.panel ? (
                      <button type="button" className={clase} onClick={() => abrirPanelSnapshot(tile.key)}>
                        {inner}
                      </button>
                    ) : (
                      <div className={clase}>{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="estatus-section-hint">
              {presentacion.vencenSemana} vencen esta semana
              {" · "}
              {presentacion.esperaLarga} llevan 7+ días con el cliente
            </p>
            <div className="estatus-flujo">
              <div className="estatus-flujo-track">
                {[
                  {
                    key: "diseno",
                    label: "Diseño",
                    value: presentacion.diseno,
                    color: estatusVars["--estatus-accent"]
                  },
                  {
                    key: "enviar",
                    label: "Por enviar",
                    value: presentacion.porEnviar,
                    color: estatusVars["--estatus-accent-2"]
                  },
                  {
                    key: "cliente",
                    label: "Cliente",
                    value: presentacion.cliente,
                    color: estatusVars["--estatus-accent-3"]
                  },
                  { key: "listo", label: "Listo", value: presentacion.listo, color: "#D4D4D8" }
                ].filter((seg) => seg.value > 0).map((seg) => (
                  <div
                    key={seg.key}
                    className="estatus-flujo-cell"
                    style={{ flexGrow: seg.value }}
                  >
                    <div className="estatus-flujo-seg" style={{ background: seg.color }} />
                    <span className="estatus-flujo-tip">({seg.value}) {seg.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="estatus-listas-separated">
            {renderListaFalta(listas.faltaHacer || [])}
            {renderListaEnviar(listas.porEnviar)}
            {renderListaEspera(listas.esperaCliente)}
          </div>
        </>
      )}

      <div className="estatus-cadenas-head">
        <div>
          <h3>Detalle de entregables</h3>
          <span>{grupos.length} {vistaDetalle === "persona" ? "personas" : (modoGlobal ? "marcas" : "cadenas")} · {tareasActivas.length} entregables</span>
        </div>
        <div className="lista-agrupacion-pills estatus-detalle-pills">
          <button
            type="button"
            onClick={() => setVistaDetalle(modoGlobal ? "marca" : "subcliente")}
            className={`lista-agrupacion-pill ${vistaDetalle !== "persona" ? "is-active" : ""}`}
          >
            {modoGlobal ? "Por marca" : "Por subcliente"}
          </button>
          <button
            type="button"
            onClick={() => setVistaDetalle("persona")}
            className={`lista-agrupacion-pill ${vistaDetalle === "persona" ? "is-active" : ""}`}
          >
            Por persona
          </button>
        </div>
      </div>

      {grupos.length === 0 ? (
        <div className="marca-subclientes-empty">
          {vistaDetalle === "persona"
            ? "Aún no hay entregables activos con persona asignada."
            : modoGlobal
              ? "Aún no hay entregables activos por marca."
              : `Aún no hay entregables con cadena en ${etiquetaMarca}.`}
        </div>
      ) : (
        <div className="estatus-notion">
          {grupos.map((grupo) => (
            vistaDetalle === "persona" ? renderGrupoPersona(grupo) : renderTablaGrupo(grupo)
          ))}
        </div>
      )}
      {portalOverlay}
      {comentarioTip && typeof ModalPortal === "function" ? (
        <ModalPortal>
          <div
            className={`estatus-espera-coment-float ${comentarioTip.arriba ? "is-above" : ""}`}
            style={{
              left: `${comentarioTip.left}px`,
              top: `${comentarioTip.top}px`,
              maxWidth: `${comentarioTip.maxW}px`
            }}
            role="tooltip"
          >
            {comentarioTip.texto}
          </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}
