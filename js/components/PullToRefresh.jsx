const PULL_SEARCH_THRESHOLD_PX = 110;
const PULL_REFRESH_THRESHOLD_PX = 200;
const PULL_MAX_PX = 260;
const PULL_RESISTANCE = 0.55;
const PULL_VISUAL_RATIO = 0.45;
const PULL_VISUAL_CAP_PX = 84;

function pullRefreshHabilitado() {
  return typeof esPlataformaPullRefresh === "function" && esPlataformaPullRefresh();
}

function PullToRefresh({
  onRefresh,
  onSearch,
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
  const awaitingActionRef = useRef(null);
  const onRefreshRef = useRef(onRefresh);
  const onSearchRef = useRef(onSearch);
  const [pullY, setPullY] = useState(0);
  const [fingerDelta, setFingerDelta] = useState(0);
  const [contentInset, setContentInset] = useState(0);
  const [holdOffset, setHoldOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [awaitingAction, setAwaitingAction] = useState(null);
  const [pullRefreshActivo, setPullRefreshActivo] = useState(pullRefreshHabilitado);

  disabledRef.current = disabled;
  loadingRef.current = loading;
  awaitingActionRef.current = awaitingAction;
  onRefreshRef.current = onRefresh;
  onSearchRef.current = onSearch;

  const esBusqueda = mode === "search";
  const tieneRefreshExtra = esBusqueda && typeof onRefresh === "function";
  const searchThreshold = esBusqueda ? PULL_SEARCH_THRESHOLD_PX : PULL_REFRESH_THRESHOLD_PX;
  const refreshThreshold = tieneRefreshExtra ? PULL_REFRESH_THRESHOLD_PX : searchThreshold;

  const awaitingRefresh = awaitingAction === "refresh";
  const awaitingSearch = awaitingAction === "search";
  const awaitingAny = Boolean(awaitingAction);

  const progress = awaitingAny
    ? 1
    : Math.min(1, pullY / (tieneRefreshExtra ? refreshThreshold : searchThreshold));
  const showHint = pullRefreshActivo && (pullY > 0 || awaitingAny);
  const visualOffset = awaitingAny
    ? holdOffset
    : Math.min(fingerDelta * PULL_VISUAL_RATIO, PULL_VISUAL_CAP_PX);
  const listoBuscar = !awaitingAny && pullY >= searchThreshold && (!tieneRefreshExtra || pullY < refreshThreshold);
  const listoRefresh = awaitingRefresh || (!awaitingAny && pullY >= refreshThreshold && (tieneRefreshExtra || !esBusqueda));
  const thresholdMet = listoBuscar || listoRefresh || awaitingAny;
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
    setAwaitingAction(null);
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
    if (!awaitingAction) return undefined;
    if (awaitingAction === "search") {
      const t = window.setTimeout(() => resetPull(), 140);
      return () => window.clearTimeout(t);
    }
    if (awaitingAction === "refresh" && !loading) {
      const t = window.setTimeout(() => resetPull(), 0);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [loading, awaitingAction]);

  useEffect(() => {
    if (!pullRefreshActivo) return undefined;
    const el = scrollRef.current;
    if (!el) return undefined;

    const handleTouchStart = (event) => {
      if (disabledRef.current || loadingRef.current || awaitingActionRef.current) return;
      if (el.scrollTop > 1) return;

      measureContentInset();
      touchStartYRef.current = event.touches[0].clientY;
      activePullRef.current = true;
      setIsDragging(true);
    };

    const handleTouchMove = (event) => {
      if (!activePullRef.current || disabledRef.current || loadingRef.current || awaitingActionRef.current) return;

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

      if (disabledRef.current || loadingRef.current || awaitingActionRef.current) {
        resetPull();
        return;
      }

      const y = pullYRef.current;
      const offset = Math.min(fingerDeltaRef.current * PULL_VISUAL_RATIO, PULL_VISUAL_CAP_PX);

      if (tieneRefreshExtra && y >= refreshThreshold) {
        setHoldOffset(offset);
        setAwaitingAction("refresh");
        if (typeof onRefreshRef.current === "function") onRefreshRef.current();
        return;
      }

      if (esBusqueda && y >= searchThreshold) {
        setHoldOffset(offset);
        setAwaitingAction("search");
        if (typeof onSearchRef.current === "function") onSearchRef.current();
        else if (typeof onRefreshRef.current === "function") onRefreshRef.current();
        return;
      }

      if (!esBusqueda && y >= searchThreshold) {
        setHoldOffset(offset);
        setAwaitingAction("refresh");
        if (typeof onRefreshRef.current === "function") onRefreshRef.current();
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
  }, [pullRefreshActivo, esBusqueda, tieneRefreshExtra, searchThreshold, refreshThreshold]);

  const bodyStyle = visualOffset > 0 || awaitingAny
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
  const barStyle = showHint
    ? {
        top: `${Math.max(0, barTop)}px`,
        transition: isDragging ? "none" : "opacity 0.1s ease"
      }
    : undefined;

  let hintIcon = "fa-magnifying-glass";
  let hintText = "Desliza para buscar";
  if (listoRefresh || awaitingRefresh) {
    hintIcon = loading && awaitingRefresh ? "fa-arrows-rotate fa-spin" : "fa-arrows-rotate";
    hintText = awaitingRefresh ? "Actualizando…" : "Actualizar";
  } else if (listoBuscar || awaitingSearch) {
    hintIcon = "fa-magnifying-glass";
    hintText = "Buscar";
  } else if (tieneRefreshExtra) {
    hintText = "Buscar · sigue para actualizar";
  } else if (!esBusqueda) {
    hintIcon = "fa-arrows-rotate";
    hintText = "Desliza para actualizar";
  }

  if (!pullRefreshActivo) {
    return (
      <div ref={scrollRef} className={className} {...rest}>
        {children}
      </div>
    );
  }

  const usarHint = esBusqueda || tieneRefreshExtra;

  return (
    <div className={`pull-to-refresh-host ${esBusqueda ? "is-search" : ""}`}>
      {usarHint ? (
        <div
          className={`pull-to-search-hint ${showHint ? "is-visible" : ""} ${thresholdMet ? "is-ready" : ""} ${listoRefresh || awaitingRefresh ? "is-refresh" : ""}`}
          style={{
            top: `${Math.max(8, barTop + 8)}px`,
            opacity: showHint ? Math.min(1, 0.35 + progress * 0.65) : 0,
            transform: `translate(-50%, ${Math.min(visualOffset * 0.35, 18)}px) scale(${0.92 + progress * 0.08})`
          }}
          aria-hidden={!showHint}
        >
          <i className={`fa-solid ${hintIcon}`} aria-hidden="true" />
          <span>{hintText}</span>
        </div>
      ) : (
        <div
          className={`pull-to-refresh-bar ${showHint ? "is-visible" : ""} ${thresholdMet ? "is-ready" : ""} ${loading && awaitingRefresh ? "is-loading" : ""}`}
          style={barStyle}
          aria-live="polite"
          aria-hidden={!showHint}
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
