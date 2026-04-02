"use client";

import { useRef } from "react";
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
  useClickOutside(panelRef, open, onCancel);

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
