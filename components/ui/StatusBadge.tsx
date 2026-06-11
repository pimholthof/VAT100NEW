"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const currentLabel = options.find((o) => o.value === value)?.label ?? value;
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close);

  // Bij openen springt focus naar de geselecteerde optie (roving focus)
  useEffect(() => {
    if (!open) return;
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>("button");
    if (!buttons?.length) return;
    const selectedIndex = options.findIndex((o) => o.value === value);
    (buttons[Math.max(selectedIndex, 0)] ?? buttons[0]).focus();
  }, [open, options, value]);

  const closeAndRefocus = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  function handleListKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" || e.key === "Tab") {
      // Het menu is transient: Tab verlaat het niet, maar sluit het
      e.preventDefault();
      closeAndRefocus();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const buttons = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []
    );
    if (!buttons.length) return;
    e.preventDefault();
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    let next = 0;
    if (e.key === "ArrowDown") next = (current + 1) % buttons.length;
    else if (e.key === "ArrowUp") next = (current - 1 + buttons.length) % buttons.length;
    else if (e.key === "End") next = buttons.length - 1;
    buttons[next].focus();
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (!disabled && (e.key === "ArrowDown" || e.key === "ArrowUp") && !open) {
      e.preventDefault();
      setOpen(true);
    }
  }

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        ref={triggerRef}
        onClick={() => !disabled && setOpen(!open)}
        onKeyDown={handleTriggerKeyDown}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`status-badge-interactive status-badge-interactive--${value}`}
      >
        <span className="status-badge-interactive__dot" />
        {currentLabel}
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          className="dropdown-menu"
          onKeyDown={handleListKeyDown}
        >
          {options.map((option) => (
            <button
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              tabIndex={-1}
              onClick={() => {
                onChange(option.value);
                closeAndRefocus();
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
