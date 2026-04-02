"use client";

import { useState, useRef, useCallback } from "react";
import { useClickOutside } from "@/hooks/useClickOutside";

interface StatusOption {
  value: string;
  label: string;
}

interface StatusBadgeProps {
  value: string;
  options: StatusOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export function StatusBadge({ value, options, onChange, disabled, ariaLabel }: StatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentLabel = options.find((o) => o.value === value)?.label ?? value;
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        className={`status-badge-interactive status-badge-interactive--${value}`}
      >
        <span className="status-badge-interactive__dot" />
        {currentLabel}
      </button>

      {open && (
        <div role="listbox" className="dropdown-menu">
          {options.map((option) => (
            <button
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`dropdown-item status-badge-interactive--${option.value} ${option.value === value ? "dropdown-item--active" : ""}`}
            >
              <span className="status-badge-interactive__dot" />
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
