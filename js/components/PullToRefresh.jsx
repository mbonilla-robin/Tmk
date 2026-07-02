const PULL_THRESHOLD_PX = 160;
const PULL_MAX_PX = 220;
const PULL_RESISTANCE = 0.52;

function pullRefreshHabilitado() {
  return typeof esPlataformaPullRefresh === "function" && esPlataformaPullRefresh();
}

function PullToRefresh({
  onRefresh,
  loading = false,
  disabled = false,
  className = "",
  children,
  ...rest
}) {
  const scrollRef = useRef(null);
  const touchStartYRef = useRef(0);
  const activePullRef = useRef(false);
  const pullYRef = useRef(0);
  const thresholdVibratedRef = useRef(false);
  const disabledRef = useRef(disabled);
  const loadingRef = useRef(loading);
  const awaitingRefreshRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  const [pullY, setPullY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [awaitingRefresh, setAwaitingRefresh] = useState(false);
  const [pullRefreshActivo, setPullRefreshActivo] = useState(pullRefreshHabilitado);

  disabledRef.current = disabled;
  loadingRef.current = loading;
  awaitingRefreshRef.current = awaitingRefresh;
  onRefreshRef.current = onRefresh;

  const thresholdMet = pullY >= PULL_THRESHOLD_PX || awaitingRefresh;
  const progress = awaitingRefresh ? 1 : Math.min(1, pullY / PULL_THRESHOLD_PX);
  const showBar = pullRefreshActivo && (pullY > 0 || awaitingRefresh);
  const indicatorHeight = showBar
    ? (awaitingRefresh ? 28 : Math.max(6, Math.min(40, pullY * 0.24)))
    : 0;

  const setPull = (value) => {
    pullYRef.current = value;
    setPullY(value);
  };

  const resetPull = () => {
    activePullRef.current = false;
    setIsDragging(false);
    setPull(0);
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
    if (!loading && awaitingRefresh) {
      if (typeof robinHaptic === "function") robinHaptic("success");
      setAwaitingRefresh(false);
      resetPull();
    }
  }, [loading, awaitingRefresh]);

  useEffect(() => {
    if (!pullRefreshActivo) return undefined;
    const el = scrollRef.current;
    if (!el) return undefined;

    const handleTouchStart = (event) => {
      if (disabledRef.current || loadingRef.current || awaitingRefreshRef.current) return;
      if (el.scrollTop > 1) return;

      touchStartYRef.current = event.touches[0].clientY;
      activePullRef.current = true;
      thresholdVibratedRef.current = false;
      setIsDragging(true);
    };

    const handleTouchMove = (event) => {
      if (!activePullRef.current || disabledRef.current || loadingRef.current || awaitingRefreshRef.current) return;

      if (el.scrollTop > 1) {
        activePullRef.current = false;
        thresholdVibratedRef.current = false;
        setIsDragging(false);
        setPull(0);
        return;
      }

      const delta = event.touches[0].clientY - touchStartYRef.current;
      if (delta <= 0) {
        thresholdVibratedRef.current = false;
        setPull(0);
        return;
      }

      event.preventDefault();
      const resisted = Math.min(PULL_MAX_PX, delta * PULL_RESISTANCE);
      setPull(resisted);

      if (resisted >= PULL_THRESHOLD_PX) {
        if (!thresholdVibratedRef.current && typeof robinHaptic === "function") {
          const touch = event.touches[0];
          robinHaptic("threshold", { x: touch.clientX, y: touch.clientY });
          thresholdVibratedRef.current = true;
        }
      } else {
        thresholdVibratedRef.current = false;
      }
    };

    const finishPull = (event) => {
      if (!activePullRef.current) return;
      activePullRef.current = false;
      setIsDragging(false);

      const touch = event?.changedTouches?.[0];

      if (
        pullYRef.current >= PULL_THRESHOLD_PX &&
        !disabledRef.current &&
        !loadingRef.current &&
        !awaitingRefreshRef.current
      ) {
        setAwaitingRefresh(true);
        setPull(PULL_THRESHOLD_PX);
        if (typeof robinHaptic === "function") {
          robinHaptic("refresh", touch ? { x: touch.clientX, y: touch.clientY } : undefined);
        }
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

  const indicatorStyle = {
    height: `${indicatorHeight}px`,
    transition: isDragging ? "none" : "height 0.22s ease"
  };

  if (!pullRefreshActivo) {
    return (
      <div ref={scrollRef} className={className} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <div className="pull-to-refresh-host">
      <div
        ref={scrollRef}
        className={`pull-to-refresh-scroll ${className}`}
        {...rest}
      >
        <div
          className={`pull-to-refresh-indicator ${showBar ? "is-visible" : ""} ${thresholdMet ? "is-ready" : ""} ${loading && awaitingRefresh ? "is-loading" : ""}`}
          style={indicatorStyle}
          aria-live="polite"
          aria-hidden={!showBar}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <div className="pull-to-refresh-bar">
            <span className="pull-to-refresh-bar__track" />
            <span className="pull-to-refresh-bar__fill" style={{ transform: `scaleX(${progress})` }} />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
