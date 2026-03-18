"use client";

import { useState, useRef, useMemo } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/format";
import type { CashflowSummary } from "@/lib/actions/dashboard";

export function CashflowChart({ cashflow }: { cashflow: CashflowSummary }) {
  const { monthlyRevenue } = cashflow;
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = useMemo(() => {
    return monthlyRevenue.map((rev) => {
      const [year, month] = rev.month.split("-");
      const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
        "nl-NL",
        { month: "short" }
      );
      return { label, value: rev.amount };
    });
  }, [monthlyRevenue]);

  const maxAmount = Math.max(...data.map((d) => d.value), 1);
  const width = 800;
  const height = 200;
  const padding = 20;

  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * (width - padding * 2) + padding,
    y: height - (d.value / maxAmount) * (height - padding * 2) - padding,
  }));

  const linePath = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 300, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const scrollX = (x / rect.width) * width;

    const closest = points.reduce((prev, curr) => {
      return Math.abs(curr.x - scrollX) < Math.abs(prev.x - scrollX) ? curr : prev;
    }, points[0]);

    const idx = points.indexOf(closest);
    setActiveIndex(idx);
    mouseX.set(closest.x);
    mouseY.set(closest.y);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setActiveIndex(null)}
      style={{ position: "relative", width: "100%", height: height + 40, cursor: "crosshair" }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "100%", overflow: "visible" }}
      >
        {/* Area under the line — subtle fill using foreground opacity */}
        <motion.path
          d={areaPath}
          fill="rgba(13, 13, 11, 0.04)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />

        {/* The Sparkline */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="rgba(13, 13, 11, 0.6)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />

        {/* Indicator dot */}
        <AnimatePresence>
          {activeIndex !== null && (
            <motion.circle
              cx={springX}
              cy={springY}
              r="4"
              fill="var(--foreground)"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            />
          )}
        </AnimatePresence>
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {activeIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              left: `${(points[activeIndex].x / width) * 100}%`,
              top: `${(points[activeIndex].y / height) * 100 - 40}%`,
            }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              transform: "translateX(-50%)",
              padding: "8px 12px",
              background: "var(--background)",
              border: "var(--border-light)",
              pointerEvents: "none",
              zIndex: 10,
              textAlign: "center",
            }}
          >
            <p className="label" style={{ fontSize: 9, marginBottom: 2, opacity: 0.4 }}>
              {data[activeIndex].label}
            </p>
            <p style={{ fontSize: 12, fontWeight: 500, margin: 0 }}>
              {formatCurrency(data[activeIndex].value)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* X-Axis Labels */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: -10, padding: "0 20px" }}>
        {data.map((d, i) => (
          <span key={i} className="label" style={{ fontSize: 9, textTransform: "lowercase", opacity: i === activeIndex ? 0.6 : 0.3 }}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
