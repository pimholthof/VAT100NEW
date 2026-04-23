"use client";

import { useRef, useCallback, type TouchEvent as ReactTouchEvent } from "react";

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

interface SwipeBindings {
  onTouchStart: (e: ReactTouchEvent) => void;
  onTouchMove: (e: ReactTouchEvent) => void;
  onTouchEnd: (e: ReactTouchEvent) => void;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 60,
}: SwipeHandlers): SwipeBindings {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const endX = useRef<number | null>(null);
  const endY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: ReactTouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    endX.current = touch.clientX;
    endY.current = touch.clientY;
  }, []);

  const handleTouchMove = useCallback((e: ReactTouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    endX.current = touch.clientX;
    endY.current = touch.clientY;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (startX.current === null || startY.current === null) return;
    if (endX.current === null || endY.current === null) return;

    const deltaX = endX.current - startX.current;
    const deltaY = endY.current - startY.current;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > absY && absX > threshold) {
      if (deltaX > 0) onSwipeRight?.();
      else onSwipeLeft?.();
    } else if (absY > absX && absY > threshold) {
      if (deltaY > 0) onSwipeDown?.();
      else onSwipeUp?.();
    }

    startX.current = null;
    startY.current = null;
    endX.current = null;
    endY.current = null;
  }, [onSwipeDown, onSwipeLeft, onSwipeRight, onSwipeUp, threshold]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}
