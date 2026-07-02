const PULL_THRESHOLD_PX = 160;
const PULL_MAX_PX = 220;
const PULL_RESISTANCE = 0.52;
const PULL_GAP_MAX_PX = 88;
const PULL_HOLD_PX = 36;

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
  const gapHeight = showBar
    ? (awaitingRefresh ? PULL_HOLD_PX : Math.max(8, Math.min(PULL_GAP_MAX_PX, pullY * 0.55)))
    : 0;

  const setPull = (value) => {
    pullYRef.current = value;
    setPullY(value);
  };

  const resetPull = () => {
    activePullRef.current = false;
    setIsDragging(false);
    setAwaitingRefresh(false);
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
      setIsDragging(true);
    };

    const handleTouchMove = (event) => {
      if (!activePullRef.current || disabledRef.current || loadingRef.current || awaitingRefreshRef.current) return;

      if (el.scrollTop > 1) {
        activePullRef.current = false;
        setIsDragging(false);
        setPull(0);
        return;
      }

      const delta = event.touches[0].clientY - touchStartYRef.current;
      if (delta <= 0) {
        setPull(0);
        return;
      }

      event.preventDefault();
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
        setAwaitingRefresh(true);
        setPull(0);
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

  const gapStyle = {
    height: `${gapHeight}px`,
    transition: isDragging ? "none" : "height 0.28s ease"
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
          className={`pull-to-refresh-gap ${showBar ? "is-active" : ""}`}
          style={gapStyle}
          aria-hidden={!showBar}
        >
          <div
            className={`pull-to-refresh-bar ${showBar ? "is-visible" : ""} ${thresholdMet ? "is-ready" : ""} ${loading && awaitingRefresh ? "is-loading" : ""}`}
            aria-live="polite"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <span className="pull-to-refresh-bar__track" />
            <span
              className="pull-to-refresh-bar__fill"
              style={{
                width: `${progress * 100}%`,
                transition: isDragging ? "none" : "width 0.05s linear"
              }}
            />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
