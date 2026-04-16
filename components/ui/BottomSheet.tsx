"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { m as motion, AnimatePresence, useDragControls, type PanInfo } from "framer-motion";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxHeight?: string;
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  maxHeight = "85dvh",
}: BottomSheetProps) {
  const controls = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 120 || info.velocity.y > 500) {
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.35)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              zIndex: 1100,
            }}
            aria-hidden
          />
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={handleDragEnd}
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1101,
              background: "var(--background)",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderTop: "0.5px solid rgba(0, 0, 0, 0.08)",
              boxShadow: "0 -8px 40px rgba(0, 0, 0, 0.08)",
              maxHeight,
              display: "flex",
              flexDirection: "column",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div
              onPointerDown={(e) => controls.start(e)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingTop: 10,
                paddingBottom: 8,
                cursor: "grab",
                touchAction: "none",
                flexShrink: 0,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  background: "rgba(0, 0, 0, 0.15)",
                }}
              />
            </div>
            {title && (
              <div
                style={{
                  padding: "4px 24px 16px",
                  borderBottom: "0.5px solid rgba(0, 0, 0, 0.06)",
                  flexShrink: 0,
                }}
              >
                <h2
                  style={{
                    fontSize: "var(--text-body-lg)",
                    fontWeight: 600,
                    margin: 0,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {title}
                </h2>
              </div>
            )}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px 24px 32px",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
