"use client";

import { useEffect, useRef, useState } from "react";

/**
 * AnimatedNumber — Smoothly counts up/down to a target value.
 * Used for the Safe-to-Spend display to give a premium, real-time feel.
 */
export function AnimatedNumber({
  value,
  duration = 800,
  prefix = "",
  suffix = "",
  style,
  className,
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  style?: React.CSSProperties;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const start = previousValue.current;
    const end = value;
    const diff = end - start;

    if (Math.abs(diff) < 0.01) {
      setDisplayValue(end);
      previousValue.current = end;
      return;
    }

    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + diff * eased;

      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
        previousValue.current = end;
      }
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [value, duration]);

  const formatted = new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(displayValue));

  return (
    <span style={style} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
