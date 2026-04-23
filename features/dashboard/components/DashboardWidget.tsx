"use client";

import { Reorder, useDragControls, useMotionValue } from "framer-motion";
import {
  GripVertical,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useDashboardStore } from "@/lib/store/dashboard";
import type { WidgetId } from "@/features/dashboard/widget-registry";

interface DashboardWidgetProps {
  widgetId: WidgetId;
  label: string;
  children: React.ReactNode;
  isFirst: boolean;
  isLast: boolean;
}

export function DashboardWidget({
  widgetId,
  label,
  children,
  isFirst,
  isLast,
}: DashboardWidgetProps) {
  const controls = useDragControls();
  const y = useMotionValue(0);
  const { hidden, toggleVisibility, moveWidget } = useDashboardStore();
  const isHidden = hidden.includes(widgetId);

  return (
    <Reorder.Item
      value={widgetId}
      dragListener={false}
      dragControls={controls}
      layout
      style={{
        listStyle: "none",
        y,
        position: "relative",
        zIndex: 0,
      }}
      whileDrag={{
        scale: 1.02,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
        zIndex: 50,
        cursor: "grabbing",
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Edit mode toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          marginBottom: isHidden ? 0 : 8,
          border: "0.5px solid rgba(0, 0, 0, 0.08)",
          borderRadius: "var(--radius)",
          background: isHidden
            ? "rgba(0, 0, 0, 0.02)"
            : "var(--dashboard-surface, var(--background))",
          userSelect: "none",
        }}
      >
        {/* Drag handle (desktop) — div, not button, to avoid pointer capture issues */}
        <div
          onPointerDown={(e) => {
            e.preventDefault();
            controls.start(e);
          }}
          className="widget-drag-handle"
          role="button"
          tabIndex={0}
          aria-roledescription="sorteerbaar"
          aria-label={`${label} verslepen`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            border: "none",
            background: "transparent",
            cursor: "grab",
            opacity: 0.25,
            transition: "opacity var(--duration-quick)",
            touchAction: "none",
            flexShrink: 0,
          }}
        >
          <GripVertical size={16} />
        </div>

        {/* Mobile up/down buttons */}
        <div
          className="widget-mobile-arrows"
          style={{ display: "none", gap: 2, flexShrink: 0 }}
        >
          <button
            onClick={() => moveWidget(widgetId, "up")}
            disabled={isFirst}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              border: "none",
              background: "transparent",
              cursor: isFirst ? "default" : "pointer",
              opacity: isFirst ? 0.1 : 0.35,
            }}
            aria-label="Verplaats omhoog"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={() => moveWidget(widgetId, "down")}
            disabled={isLast}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              border: "none",
              background: "transparent",
              cursor: isLast ? "default" : "pointer",
              opacity: isLast ? 0.1 : 0.35,
            }}
            aria-label="Verplaats omlaag"
          >
            <ChevronDown size={14} />
          </button>
        </div>

        {/* Label */}
        <span
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 500,
            opacity: isHidden ? 0.3 : 0.55,
            textDecoration: isHidden ? "line-through" : "none",
            letterSpacing: "-0.01em",
          }}
        >
          {label}
        </span>

        {/* Visibility toggle */}
        <button
          onClick={() => toggleVisibility(widgetId)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            opacity: isHidden ? 0.2 : 0.35,
            transition: "opacity var(--duration-quick)",
            flexShrink: 0,
          }}
          aria-label={isHidden ? "Widget tonen" : "Widget verbergen"}
        >
          {isHidden ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>

      {/* Widget content (only when visible) */}
      {!isHidden && <div>{children}</div>}
    </Reorder.Item>
  );
}
