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
        backgroundColor: "rgba(250, 249, 246, 0.8)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--background)",
          border: "0.5px solid rgba(0,0,0,0.12)",
          padding: "32px",
          maxWidth: 400,
          width: "100%",
          boxShadow: "0 24px 48px rgba(0,0,0,0.06)",
        }}
      >
        <p
          id="confirm-title"
          style={{
            fontSize: "var(--text-body-lg)",
            fontWeight: 600,
            margin: "0 0 8px",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </p>
        <p
          style={{
            fontSize: "var(--text-body-md)",
            fontWeight: 400,
            margin: "0 0 32px",
            opacity: 0.5,
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
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
