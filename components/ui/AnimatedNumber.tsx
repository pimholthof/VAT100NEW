"use client";

import React, { useEffect, useRef } from "react";
import { animate, useMotionValue, useTransform, m as motion } from "framer-motion";
import { useLocale } from "@/lib/i18n/context";

export function AnimatedNumber({
  value,
  duration = 0.5,
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
  const { locale } = useLocale();
  const numLocale = locale === "en" ? "en-GB" : "nl-NL";
  const count = useMotionValue(value);
  const rounded = useTransform(count, (latest) => {
    const formatter = new Intl.NumberFormat(numLocale, {
      style: isCurrency ? "currency" : "decimal",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: isCurrency ? 0 : 2,
    });
    return `${prefix}${formatter.format(Math.round(latest))}${suffix}`;
  });

  const prevValue = useRef(value);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      prevValue.current = value;
      count.set(value);
      return;
    }
    if (Math.abs(prevValue.current - value) < 1) {
      prevValue.current = value;
      count.set(value);
      return;
    }
    const controls = animate(count, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
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
