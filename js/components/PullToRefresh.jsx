const PULL_THRESHOLD_PX = 96;
const PULL_MAX_PX = 132;
const PULL_RESISTANCE = 0.52;
const PULL_VISUAL_MAX_PX = 40;

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
  const [pullY, setPullY] = useState(0);
  const [isReleasing, setIsReleasing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [awaitingRefresh, setAwaitingRefresh] = useState(false);

  const isMobile = typeof esPlataformaMobile === "function" && esPlataformaMobile();
  const thresholdMet = pullY >= PULL_THRESHOLD_PX || awaitingRefresh;
  const progress = awaitingRefresh ? 1 : Math.min(1, pullY / PULL_THRESHOLD_PX);
  const showBar = isMobile && (pullY > 0 || awaitingRefresh);
  const visualOffset = awaitingRefresh
    ? PULL_VISUAL_MAX_PX * 0.65
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
    if (!loading && awaitingRefresh) {
      setAwaitingRefresh(false);
      resetPull();
    }
  }, [loading, awaitingRefresh]);

  const handleTouchStart = (event) => {
    if (!isMobile || disabled || loading || awaitingRefresh) return;
    const el = scrollRef.current;
    if (!el || el.scrollTop > 1) return;

    touchStartYRef.current = event.touches[0].clientY;
    activePullRef.current = true;
    setIsDragging(true);
    setIsReleasing(false);
  };

  const handleTouchMove = (event) => {
    if (!activePullRef.current || !isMobile || disabled || loading || awaitingRefresh) return;

    const el = scrollRef.current;
    if (!el || el.scrollTop > 1) {
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
    if (!activePullRef.current || !isMobile) return;
    activePullRef.current = false;
    setIsDragging(false);

    if (pullYRef.current >= PULL_THRESHOLD_PX && !disabled && !loading && !awaitingRefresh) {
      setAwaitingRefresh(true);
      setIsReleasing(true);
      setPull(PULL_THRESHOLD_PX);
      if (typeof onRefresh === "function") {
        onRefresh();
      }
      return;
    }

    resetPull();
  };

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
        <span className="pull-to-refresh-bar__fill" style={{ width: `${progress * 100}%` }} />
      </div>

      <div
        ref={scrollRef}
        className={`pull-to-refresh-scroll ${className}`}
        style={contentStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={finishPull}
        onTouchCancel={finishPull}
        {...rest}
      >
        {children}
      </div>
    </div>
  );
}
