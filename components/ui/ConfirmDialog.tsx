"use client";

import { useEffect } from "react";
import { ButtonPrimary, ButtonSecondary } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Bevestigen",
  cancelLabel = "Annuleer",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(255, 255, 255, 0.6)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--background)",
          border: "1px solid var(--color-black)",
          padding: 32,
          maxWidth: 400,
          width: "100%",
        }}
      >
        <p
          id="confirm-title"
          style={{
            fontSize: "var(--text-body-lg)",
            fontWeight: 600,
            margin: "0 0 12px",
          }}
        >
          {title}
        </p>
        <p
          style={{
            fontSize: "var(--text-body-md)",
            fontWeight: 300,
            margin: "0 0 32px",
            opacity: 0.6,
          }}
        >
          {message}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
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
