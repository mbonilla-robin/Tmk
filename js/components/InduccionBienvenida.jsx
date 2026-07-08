function obtenerPrimerNombreBienvenida(nombreCompleto, username) {
  const display = typeof formatearNombrePresencia === "function"
    ? formatearNombrePresencia({ nombre: nombreCompleto, username })
    : (nombreCompleto || username || "");
  const primero = String(display).trim().split(/\s+/)[0];
  if (primero && !/^@/.test(primero)) return primero;
  return username ? `@${String(username).replace(/^@/, "")}` : "equipo";
}

function filtrarClientesActivosInduccion(marcas) {
  const lista = Array.isArray(marcas) ? marcas : [];
  return lista
    .filter((m) => {
      const key = typeof normalizarMarcaKey === "function" ? normalizarMarcaKey(m) : String(m).toUpperCase();
      return key && key !== "TMK" && key !== "ROBIN";
    })
    .map((m) => (typeof formatearMarca === "function" ? formatearMarca(m) : m))
    .filter(Boolean);
}

const ESCENA_TRANSICION_MS = 420;
const TOUCH_AVANCE_MIN_MS = 280;

function construirEscenasBienvenida(clientes) {
  const escenas = [
    { id: "logo", duracion: 2000 },
    { id: "saludo", duracion: 3000 },
    { id: "aprende", duracion: 2800 },
    { id: "texto1", duracion: 4500 },
    { id: "texto2", duracion: 4500 }
  ];
  if (clientes.length > 0) escenas.push({ id: "clientes", duracion: 3200 });
  escenas.push(
    { id: "cierre", duracion: 3000 },
    { id: "cta", duracion: null }
  );
  return escenas;
}

function InduccionBienvenida({
  visible,
  nombreCompleto,
  username,
  esDisenador,
  marcas,
  onComenzar,
  onOmitir
}) {
  const [escena, setEscena] = useState(0);
  const [fase, setFase] = useState("entrada");
  const transicionTimerRef = useRef(null);
  const autoTimerRef = useRef(null);
  const ultimoTapRef = useRef(0);
  const touchStartRef = useRef(null);

  const primerNombre = obtenerPrimerNombreBienvenida(nombreCompleto, username);
  const rolLabel = esDisenador ? "diseñador" : "ejecutivo";
  const clientes = useMemo(() => filtrarClientesActivosInduccion(marcas), [marcas]);
  const escenas = useMemo(() => construirEscenasBienvenida(clientes), [clientes]);
  const escenaActual = escenas[escena] || escenas[0];
  const esUltimaEscena = escena >= escenas.length - 1;
  const esEscenaCta = escenaActual?.id === "cta";

  const limpiarTimers = useCallback(() => {
    if (transicionTimerRef.current) {
      clearTimeout(transicionTimerRef.current);
      transicionTimerRef.current = null;
    }
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  }, []);

  const irAEscena = useCallback((index) => {
    const destino = Math.min(Math.max(index, 0), escenas.length - 1);
    if (destino === escena) return;
    setFase("salida");
    transicionTimerRef.current = setTimeout(() => {
      setEscena(destino);
      setFase("entrada");
      transicionTimerRef.current = null;
    }, ESCENA_TRANSICION_MS);
  }, [escena, escenas.length]);

  const pasarSiguienteEscena = useCallback(() => {
    if (fase !== "entrada" || esUltimaEscena) return;
    irAEscena(escena + 1);
  }, [fase, esUltimaEscena, irAEscena, escena]);

  const pasarAnteriorEscena = useCallback(() => {
    if (fase !== "entrada" || escena <= 0) return;
    irAEscena(escena - 1);
  }, [fase, escena, irAEscena]);

  const manejarTapZona = useCallback((clientX) => {
    if (!visible || fase !== "entrada" || esEscenaCta) return;
    const ahora = Date.now();
    if (ahora - ultimoTapRef.current < TOUCH_AVANCE_MIN_MS) return;
    ultimoTapRef.current = ahora;

    const w = window.innerWidth;
    if (clientX < w * 0.28 && escena > 0) {
      pasarAnteriorEscena();
      return;
    }
    pasarSiguienteEscena();
  }, [visible, fase, esEscenaCta, escena, pasarAnteriorEscena, pasarSiguienteEscena]);

  const onPointerDown = useCallback((e) => {
    if (e.target.closest("button, a, input, textarea, select, label")) return;
    touchStartRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  }, []);

  const onPointerUp = useCallback((e) => {
    if (!touchStartRef.current) return;
    if (e.target.closest("button, a, input, textarea, select, label")) {
      touchStartRef.current = null;
      return;
    }

    const dx = Math.abs(e.clientX - touchStartRef.current.x);
    const dy = Math.abs(e.clientY - touchStartRef.current.y);
    const dt = Date.now() - touchStartRef.current.t;
    touchStartRef.current = null;

    if (dx > 18 || dy > 18 || dt > 600) return;
    manejarTapZona(e.clientX);
  }, [manejarTapZona]);

  const onClickPanel = useCallback((e) => {
    if (e.target.closest("button, a")) return;
    manejarTapZona(e.clientX);
  }, [manejarTapZona]);

  useEffect(() => {
    if (!visible) {
      limpiarTimers();
      setEscena(0);
      setFase("entrada");
      return undefined;
    }
    return () => limpiarTimers();
  }, [visible, limpiarTimers]);

  useEffect(() => {
    if (!visible || esUltimaEscena) return undefined;
    const duracion = escenaActual?.duracion;
    if (!duracion) return undefined;

    autoTimerRef.current = setTimeout(() => {
      pasarSiguienteEscena();
    }, duracion);

    return () => {
      if (autoTimerRef.current) {
        clearTimeout(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
  }, [visible, escena, esUltimaEscena, escenaActual, pasarSiguienteEscena]);

  if (!visible) return null;

  const claseEscena = (index) => {
    if (escena !== index) return "induccion-bienvenida__escena";
    return `induccion-bienvenida__escena is-activa${fase === "salida" ? " is-saliendo" : ""}`;
  };

  const renderContenidoEscena = (id) => {
    switch (id) {
      case "logo":
        return (
          <img
            src="logo robin blanco.png"
            srcSet="logo robin blanco.png 1x, logo robin blanco@2x.png 2x"
            alt="ROBIN"
            className="induccion-bienvenida__logo induccion-bienvenida__logo--hero"
            width="280"
            height="92"
            decoding="async"
          />
        );
      case "saludo":
        return (
          <h1 id="induccion-bienvenida-title" className="induccion-bienvenida__title induccion-bienvenida__title--center">
            <span className="induccion-bienvenida__saludo">Bienvenido,</span>
            <span className="induccion-bienvenida__nombre">{primerNombre}</span>
          </h1>
        );
      case "aprende":
        return <p className="induccion-bienvenida__headline-aprende">Aprende a usar la aplicación</p>;
      case "texto1":
        return (
          <p className="induccion-bienvenida__linea-video">
            Te invitamos a utilizar esta plataforma para que <strong>todo el equipo</strong> estemos{" "}
            <strong>comunicados y alineados</strong> en los entregables de cada cliente.
          </p>
        );
      case "texto2":
        return (
          <p className="induccion-bienvenida__linea-video">
            <strong>ROBIN</strong> fue desarrollada por el <strong>equipo interno</strong> con el plan de cumplir las{" "}
            <strong>metas y necesidades del área</strong> en este momento.
          </p>
        );
      case "clientes":
        return (
          <div className="induccion-bienvenida__clientes-video">
            <span className="induccion-bienvenida__clientes-label">Clientes activos</span>
            <div className="induccion-bienvenida__clientes-list">
              {clientes.map((nombre) => (
                <span key={nombre} className="induccion-bienvenida__cliente-chip induccion-bienvenida__cliente-chip--video">
                  {nombre}
                </span>
              ))}
            </div>
          </div>
        );
      case "cierre":
        return (
          <div className="induccion-bienvenida__cierre-video">
            <p className="induccion-bienvenida__linea-video induccion-bienvenida__linea-video--cierre">
              <strong>Gracias por ser parte del equipo.</strong> Cualquier duda,{" "}
              <strong>estamos a la orden.</strong>
            </p>
            <p className="induccion-bienvenida__rol-video">
              Trade &amp; Shopper Marketing · <strong>{rolLabel}</strong>
            </p>
          </div>
        );
      case "cta":
        return (
          <div className="induccion-bienvenida__cta-video">
            <p className="induccion-bienvenida__cta-lead">¿Listo?</p>
            <button type="button" className="induccion-bienvenida__btn-primary" onClick={onComenzar}>
              Empezar recorrido
            </button>
            <button type="button" className="induccion-bienvenida__btn-ghost" onClick={onOmitir}>
              Omitir por ahora
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <ModalPortal>
      <div
        className="induccion-bienvenida"
        role="dialog"
        aria-modal="true"
        aria-labelledby="induccion-bienvenida-title"
      >
        <div className="induccion-bienvenida__bg" aria-hidden="true">
          <div className="induccion-bienvenida__gradient" />
          <div className="induccion-bienvenida__blob induccion-bienvenida__blob--1" />
          <div className="induccion-bienvenida__blob induccion-bienvenida__blob--2" />
          <div className="induccion-bienvenida__blob induccion-bienvenida__blob--3" />
          <div className="induccion-bienvenida__blob induccion-bienvenida__blob--4" />
          <div className="induccion-bienvenida__grain" />
        </div>

        <div
          className="induccion-bienvenida__panel"
          onClick={onClickPanel}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          {!esEscenaCta && (
            <div className="induccion-bienvenida__touch-zones" aria-hidden="true">
              <span className="induccion-bienvenida__touch-zone induccion-bienvenida__touch-zone--back" />
              <span className="induccion-bienvenida__touch-zone induccion-bienvenida__touch-zone--next" />
            </div>
          )}

          <div className="induccion-bienvenida__story" aria-hidden="true">
            {escenas.map((item, index) => (
              <div key={item.id} className="induccion-bienvenida__story-seg">
                <div
                  key={index === escena ? `fill-${escena}` : `fill-${index}-done`}
                  className={`induccion-bienvenida__story-fill${index < escena ? " is-hecha" : ""}${index === escena && !esUltimaEscena ? " is-activa" : ""}${index === escena && esUltimaEscena ? " is-hecha" : ""}`}
                  style={index === escena && item.duracion && fase === "entrada"
                    ? { animationDuration: `${item.duracion}ms` }
                    : undefined}
                />
              </div>
            ))}
          </div>

          <div className="induccion-bienvenida__escenas">
            {escenas.map((item, index) => (
              <div
                key={item.id}
                className={`${claseEscena(index)} induccion-bienvenida__escena--${item.id}`}
                aria-hidden={escena !== index}
              >
                {renderContenidoEscena(item.id)}
              </div>
            ))}
          </div>

        </div>
      </div>
    </ModalPortal>
  );
}
