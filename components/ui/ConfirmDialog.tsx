"use client";

import { useEffect, useRef } from "react";
import { useClickOutside } from "@/hooks/useClickOutside";
import { ButtonPrimary, ButtonSecondary } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Bevestigen",
  cancelLabel = "Annuleer",
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  useClickOutside(panelRef, open, onCancel);

  // Focus trap + Escape + focus restore. Zonder dit kunnen toetsenbord-
  // gebruikers per ongeluk met de achtergrond interacteren terwijl de
  // dialog open is.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      const nodes = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="dialog-overlay"
    >
      <div ref={panelRef} className="dialog-panel">
        <p id="confirm-title" className="dialog-panel__title">
          {title}
        </p>
        <p className="dialog-panel__message">
          {message}
        </p>
        {children}
        <div className="dialog-panel__actions" style={{ marginTop: children ? 24 : 0 }}>
          <ButtonSecondary onClick={onCancel} autoFocus>
            {cancelLabel}
          </ButtonSecondary>
          <ButtonPrimary onClick={onConfirm}>
            {confirmLabel}
          </ButtonPrimary>
        </div>
      </div>
    </div>
  );
}
