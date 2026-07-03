function vibrarToqueCorto() {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(12);
    }
  } catch {
    /* ignore */
  }
}

function useLongPress(onLongPress, opciones) {
  const delay = opciones?.delay ?? 420;
  const timerRef = useRef(null);
  const firedRef = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const bind = useMemo(() => ({
    onTouchStart: (e) => {
      firedRef.current = false;
      const touch = e.touches[0];
      startPos.current = { x: touch.clientX, y: touch.clientY };
      cancel();
      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        vibrarToqueCorto();
        onLongPress(e);
      }, delay);
    },
    onTouchMove: (e) => {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - startPos.current.x);
      const dy = Math.abs(touch.clientY - startPos.current.y);
      if (dx > 10 || dy > 10) cancel();
    },
    onTouchEnd: () => cancel(),
    onTouchCancel: () => cancel(),
    onContextMenu: (e) => {
      e.preventDefault();
      if (!firedRef.current) {
        firedRef.current = true;
        vibrarToqueCorto();
        onLongPress(e);
      }
    }
  }), [onLongPress, delay, cancel]);

  return bind;
}
