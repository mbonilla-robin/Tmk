const PULL_THRESHOLD_PX = 160;
const PULL_MAX_PX = 220;
const PULL_RESISTANCE = 0.52;
const PULL_VISUAL_MAX_PX = 48;

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
  const [isReleasing, setIsReleasing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [awaitingRefresh, setAwaitingRefresh] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof esPlataformaMobile === "function" && esPlataformaMobile()
  );

  disabledRef.current = disabled;
  loadingRef.current = loading;
  awaitingRefreshRef.current = awaitingRefresh;
  onRefreshRef.current = onRefresh;

  const thresholdMet = pullY >= PULL_THRESHOLD_PX || awaitingRefresh;
  const progress = awaitingRefresh ? 1 : Math.min(1, pullY / PULL_THRESHOLD_PX);
  const showBar = isMobile && (pullY > 0 || awaitingRefresh);
  const visualOffset = awaitingRefresh
    ? PULL_VISUAL_MAX_PX * 0.7
    : Math.min(pullY, PULL_VISUAL_MAX_PX);

  const setPull = (value) => {
    pullYRef.current = value;
    setPullY(value);
  };

  const resetPull = () => {
    activePullRef.current = false;
    setIsDragging(false);
    setIsReleasing(true);
    setPull(0);
    window.setTimeout(() => setIsReleasing(false), 260);
  };

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!loading && awaitingRefresh) {
      setAwaitingRefresh(false);
      resetPull();
    }
  }, [loading, awaitingRefresh]);

  useEffect(() => {
    if (!isMobile) return undefined;
    const el = scrollRef.current;
    if (!el) return undefined;

    const handleTouchStart = (event) => {
      if (disabledRef.current || loadingRef.current || awaitingRefreshRef.current) return;
      if (el.scrollTop > 1) return;

      touchStartYRef.current = event.touches[0].clientY;
      activePullRef.current = true;
      setIsDragging(true);
      setIsReleasing(false);
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
      const resisted = Math.min(PULL_MAX_PX, delta * PULL_RESISTANCE);
      setPull(resisted);
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
        setIsReleasing(true);
        setPull(PULL_THRESHOLD_PX);
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
  }, [isMobile]);

  const contentStyle = isMobile && (visualOffset > 0 || isReleasing)
    ? {
        transform: `translateY(${visualOffset}px)`,
        transition: isDragging ? "none" : "transform 0.24s ease"
      }
    : undefined;

  if (!isMobile) {
    return (
      <div ref={scrollRef} className={className} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <div className="pull-to-refresh-host">
      <div
        className={`pull-to-refresh-bar ${showBar ? "is-visible" : ""} ${thresholdMet ? "is-ready" : ""} ${loading && awaitingRefresh ? "is-loading" : ""}`}
        aria-live="polite"
        aria-hidden={!showBar}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <span className="pull-to-refresh-bar__track" />
        <span className="pull-to-refresh-bar__fill" style={{ transform: `scaleX(${progress})` }} />
      </div>

      <div
        ref={scrollRef}
        className={`pull-to-refresh-scroll ${className}`}
        style={contentStyle}
        {...rest}
      >
        {children}
      </div>
    </div>
  );
}
