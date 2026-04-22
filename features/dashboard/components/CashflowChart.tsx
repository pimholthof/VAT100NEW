"use client";

import { useState, useRef, useMemo } from "react";
import { m as motion , useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/format";
import type { CashflowSummary } from "@/features/dashboard/actions";

export function CashflowChart({ cashflow }: { cashflow: CashflowSummary }) {
  const { monthlyRevenue } = cashflow; // Focus on revenue for the primary line
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

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 300, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const scrollX = (x / rect.width) * width;
    
    // Find nearest point
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
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area removed for literal wireframe brutalism */}

        {/* The Sparkline */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* Magnetic Indicator */}
        <AnimatePresence>
          {activeIndex !== null && (
            <motion.circle
              cx={springX}
              cy={springY}
              r="6"
              fill="var(--color-white)"
              stroke="var(--color-accent)"
              strokeWidth="2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            />
          )}
        </AnimatePresence>
      </svg>

      {/* Interactive Tooltip */}
      <AnimatePresence>
        {activeIndex !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              left: `${(points[activeIndex].x / width) * 100}%`,
              top: `${(points[activeIndex].y / height) * 100 - 40}%`
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass"
            style={{
              position: "absolute",
              transform: "translateX(-50%)",
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              pointerEvents: "none",
              zIndex: 10,
              textAlign: "center"
            }}
          >
            <p className="label" style={{ fontSize: 9, marginBottom: 2, opacity: 0.5 }}>{data[activeIndex].label}</p>
            <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{formatCurrency(data[activeIndex].value)}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* X-Axis Labels */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: -10, padding: "0 20px" }}>
        {data.map((d, i) => (
          <span key={i} className="label" style={{ fontSize: 10, textTransform: "lowercase", opacity: i === activeIndex ? 1 : 0.3 }}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
