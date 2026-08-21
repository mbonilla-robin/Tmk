const PULL_THRESHOLD_PX = 120;
const PULL_MAX_PX = 200;
const PULL_RESISTANCE = 0.58;
const PULL_VISUAL_RATIO = 0.48;
const PULL_VISUAL_CAP_PX = 72;

function pullRefreshHabilitado() {
  return typeof esPlataformaPullRefresh === "function" && esPlataformaPullRefresh();
}

function PullToRefresh({
  onRefresh,
  loading = false,
  disabled = false,
  mode = "refresh",
  className = "",
  children,
  ...rest
}) {
  const scrollRef = useRef(null);
  const touchStartYRef = useRef(0);
  const activePullRef = useRef(false);
  const pullYRef = useRef(0);
  const fingerDeltaRef = useRef(0);
  const contentInsetRef = useRef(0);
  const disabledRef = useRef(disabled);
  const loadingRef = useRef(loading);
  const awaitingRefreshRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  const [pullY, setPullY] = useState(0);
  const [fingerDelta, setFingerDelta] = useState(0);
  const [contentInset, setContentInset] = useState(0);
  const [holdOffset, setHoldOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [awaitingRefresh, setAwaitingRefresh] = useState(false);
  const [pullRefreshActivo, setPullRefreshActivo] = useState(pullRefreshHabilitado);

  disabledRef.current = disabled;
  loadingRef.current = loading;
  awaitingRefreshRef.current = awaitingRefresh;
  onRefreshRef.current = onRefresh;

  const esBusqueda = mode === "search";
  const progress = awaitingRefresh ? 1 : Math.min(1, pullY / PULL_THRESHOLD_PX);
  const showBar = pullRefreshActivo && (pullY > 0 || awaitingRefresh);
  const visualOffset = awaitingRefresh
    ? holdOffset
    : Math.min(fingerDelta * PULL_VISUAL_RATIO, PULL_VISUAL_CAP_PX);
  const thresholdMet = progress >= 1 || awaitingRefresh;
  const motionTransition = isDragging ? "none" : "transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)";

  const setPull = (value) => {
    pullYRef.current = value;
    setPullY(value);
  };

  const setFinger = (value) => {
    fingerDeltaRef.current = value;
    setFingerDelta(value);
  };

  const measureContentInset = () => {
    const el = scrollRef.current;
    if (!el) return;
    const next = Math.max(0, parseFloat(window.getComputedStyle(el).paddingTop) || 0);
    contentInsetRef.current = next;
    setContentInset(next);
  };

  const resetPull = () => {
    activePullRef.current = false;
    setIsDragging(false);
    setAwaitingRefresh(false);
    setHoldOffset(0);
    setPull(0);
    setFinger(0);
  };

  useEffect(() => {
    const sync = () => setPullRefreshActivo(pullRefreshHabilitado());
    sync();
    const mq = window.matchMedia("(max-width: 1023px)");
    mq.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  useEffect(() => {
    if (!pullRefreshActivo) return undefined;
    measureContentInset();
    window.addEventListener("resize", measureContentInset);
    return () => window.removeEventListener("resize", measureContentInset);
  }, [pullRefreshActivo, className]);

  useEffect(() => {
    if (!awaitingRefresh) return undefined;
    // Búsqueda / acciones instantáneas: no dependen de `loading`.
    if (esBusqueda || !loading) {
      const t = window.setTimeout(() => resetPull(), esBusqueda ? 140 : 0);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [loading, awaitingRefresh, esBusqueda]);

  useEffect(() => {
    if (!pullRefreshActivo) return undefined;
    const el = scrollRef.current;
    if (!el) return undefined;

    const handleTouchStart = (event) => {
      if (disabledRef.current || loadingRef.current || awaitingRefreshRef.current) return;
      if (el.scrollTop > 1) return;

      measureContentInset();
      touchStartYRef.current = event.touches[0].clientY;
      activePullRef.current = true;
      setIsDragging(true);
    };

    const handleTouchMove = (event) => {
      if (!activePullRef.current || disabledRef.current || loadingRef.current || awaitingRefreshRef.current) return;

      if (el.scrollTop > 1) {
        activePullRef.current = false;
        setIsDragging(false);
        setPull(0);
        setFinger(0);
        return;
      }

      const delta = event.touches[0].clientY - touchStartYRef.current;
      if (delta <= 0) {
        setPull(0);
        setFinger(0);
        return;
      }

      event.preventDefault();
      setFinger(delta);
      setPull(Math.min(PULL_MAX_PX, delta * PULL_RESISTANCE));
    };

    const finishPull = () => {
      if (!activePullRef.current) return;
      activePullRef.current = false;
      setIsDragging(false);

      if (
        pullYRef.current >= PULL_THRESHOLD_PX &&
        !disabledRef.current &&
        !loadingRef.current &&
        !awaitingRefreshRef.current
      ) {
        const offset = Math.min(fingerDeltaRef.current * PULL_VISUAL_RATIO, PULL_VISUAL_CAP_PX);
        setHoldOffset(offset);
        setAwaitingRefresh(true);
        if (typeof onRefreshRef.current === "function") {
          onRefreshRef.current();
        }
        return;
      }

      resetPull();
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", finishPull);
    el.addEventListener("touchcancel", finishPull);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", finishPull);
      el.removeEventListener("touchcancel", finishPull);
    };
  }, [pullRefreshActivo]);

  const bodyStyle = visualOffset > 0 || awaitingRefresh
    ? {
        transform: `translate3d(0, ${visualOffset}px, 0)`,
        transition: motionTransition
      }
    : undefined;

  const fillStyle = {
    width: `${progress * 100}%`,
    transition: isDragging ? "none" : "width 0.12s ease-out"
  };

  const barTop = contentInset;
  const barStyle = showBar
    ? {
        top: `${Math.max(0, barTop)}px`,
        transition: isDragging ? "none" : "opacity 0.1s ease"
      }
    : undefined;

  if (!pullRefreshActivo) {
    return (
      <div ref={scrollRef} className={className} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <div className={`pull-to-refresh-host ${esBusqueda ? "is-search" : ""}`}>
      {esBusqueda ? (
        <div
          className={`pull-to-search-hint ${showBar ? "is-visible" : ""} ${thresholdMet ? "is-ready" : ""}`}
          style={{
            top: `${Math.max(8, barTop + 8)}px`,
            opacity: showBar ? Math.min(1, 0.35 + progress * 0.65) : 0,
            transform: `translate(-50%, ${Math.min(visualOffset * 0.35, 18)}px) scale(${0.92 + progress * 0.08})`
          }}
          aria-hidden={!showBar}
        >
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <span>{thresholdMet ? "Buscar" : "Desliza para buscar"}</span>
        </div>
      ) : (
        <div
          className={`pull-to-refresh-bar ${showBar ? "is-visible" : ""} ${thresholdMet ? "is-ready" : ""} ${loading && awaitingRefresh ? "is-loading" : ""}`}
          style={barStyle}
          aria-live="polite"
          aria-hidden={!showBar}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <span className="pull-to-refresh-bar__track" />
          <span className="pull-to-refresh-bar__fill" style={fillStyle} />
        </div>
      )}
      <div
        ref={scrollRef}
        className={`pull-to-refresh-scroll ${className}`}
        {...rest}
      >
        <div className="pull-to-refresh-body" style={bodyStyle}>
          {children}
        </div>
      </div>
    </div>
  );
}
