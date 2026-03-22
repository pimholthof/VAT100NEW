"use client";

import React, { useEffect, useRef } from "react";
import { animate, useMotionValue, useTransform, m as motion } from "framer-motion";

/**
 * AnimatedNumber — Smoothly counts up/down to a target value.
 * Used for financial displays to give a premium, real-time feel.
 */
export function AnimatedNumber({
  value,
  duration = 1.2,
  prefix = "",
  suffix = "",
  style,
  className,
  isCurrency = true,
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  style?: React.CSSProperties;
  className?: string;
  isCurrency?: boolean;
}) {
  const count = useMotionValue(value);
  const rounded = useTransform(count, (latest) => {
    const formatter = new Intl.NumberFormat("nl-NL", {
      style: isCurrency ? "currency" : "decimal",
      currency: "EUR",
      minimumFractionDigits: isCurrency ? 0 : 0,
      maximumFractionDigits: isCurrency ? 0 : 2,
    });
    
    // For currency, it already adds the symbol, so we might not need prefix/suffix 
    // but we keep them for flexibility.
    const formatted = formatter.format(Math.round(latest));
    return `${prefix}${formatted}${suffix}`;
  });

  const prevValue = useRef(value);

  useEffect(() => {
    const controls = animate(count, value, {
      duration: duration,
      ease: [0.16, 1, 0.3, 1], // Custom "liquid" ease: fast start, soft settle
    });
    
    prevValue.current = value;
    return controls.stop;
  }, [value, count, duration]);

  return (
    <motion.span style={style} className={className}>
      {rounded}
    </motion.span>
  );
}
