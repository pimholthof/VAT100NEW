"use client";

import { useEffect } from "react";
import Image from "next/image";

interface ReceiptLightboxProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  isPdf?: boolean;
}

export function ReceiptLightbox({ open, onClose, imageUrl, isPdf }: ReceiptLightboxProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bon vergroten"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "zoom-out",
        padding: 40,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: isPdf ? 900 : 700,
          height: "90vh",
          cursor: "default",
        }}
      >
        {isPdf ? (
          <iframe
            src={imageUrl}
            title="PDF bon"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              borderRadius: 4,
              background: "white",
            }}
          />
        ) : (
          <Image
            src={imageUrl}
            alt="Bon vergroot"
            fill
            style={{
              objectFit: "contain",
            }}
            unoptimized
          />
        )}

        <button
          onClick={onClose}
          aria-label="Sluiten"
          style={{
            position: "absolute",
            top: -36,
            right: 0,
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.6)",
            fontSize: "var(--text-label)",
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            cursor: "pointer",
            padding: "4px 0",
          }}
        >
          Sluiten
        </button>
      </div>
    </div>
  );
}
