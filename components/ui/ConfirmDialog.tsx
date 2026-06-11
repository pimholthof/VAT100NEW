"use client";

import { useRef } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useFocusTrap } from "@/hooks/useFocusTrap";
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
  // Initiële focus komt van de autoFocus op de annuleerknop.
  useFocusTrap(panelRef, open, { onEscape: onCancel });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          className="dialog-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            ref={panelRef}
            className="dialog-panel"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
