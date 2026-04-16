"use client";

import { useEffect, useRef, useState } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<unknown>;
  threshold?: number;
  maxPull?: number;
  resistance?: number;
  disabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 72,
  maxPull = 120,
  resistance = 2.5,
  disabled = false,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const isPulling = useRef(false);

  useEffect(() => {
    if (disabled) return;

    function handleTouchStart(e: TouchEvent) {
      if (window.scrollY > 0 || isRefreshing) return;
      startY.current = e.touches[0]?.clientY ?? null;
      isPulling.current = true;
    }

    function handleTouchMove(e: TouchEvent) {
      if (!isPulling.current || startY.current === null || isRefreshing) return;
      const currentY = e.touches[0]?.clientY ?? startY.current;
      const delta = currentY - startY.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }
      const dampened = Math.min(maxPull, delta / resistance);
      setPullDistance(dampened);
    }

    async function handleTouchEnd() {
      if (!isPulling.current) return;
      isPulling.current = false;
      startY.current = null;
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    }

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [disabled, isRefreshing, maxPull, onRefresh, pullDistance, resistance, threshold]);

  const progress = Math.min(1, pullDistance / threshold);
  const triggered = pullDistance >= threshold;

  return { pullDistance, isRefreshing, progress, triggered };
}
