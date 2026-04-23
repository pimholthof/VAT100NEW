"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { m as motion, AnimatePresence } from "framer-motion";

type ToastType = "success" | "error" | "info";

interface ToastAction {
  label: string;
  onClick: () => void | Promise<void>;
}

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
  action?: ToastAction;
}

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

interface ToastContextValue {
  toast: (message: string, typeOrOptions?: ToastType | ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const DEFAULT_DURATION = 3500;
const DURATION_WITH_ACTION = 8000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((timer) => clearTimeout(timer));
      map.clear();
    };
  }, []);

  const toast = useCallback(
    (message: string, typeOrOptions?: ToastType | ToastOptions): string => {
      const opts: ToastOptions =
        typeof typeOrOptions === "string"
          ? { type: typeOrOptions }
          : typeOrOptions ?? {};
      const type: ToastType = opts.type ?? "success";
      const duration =
        opts.duration ??
        (opts.action ? DURATION_WITH_ACTION : DEFAULT_DURATION);

      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, type, action: opts.action }]);
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timers.current.delete(id);
      }, duration);
      timers.current.set(id, timer);
      return id;
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 10000,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none",
          maxWidth: "calc(100vw - 48px)",
        }}
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const background =
              t.type === "error"
                ? "rgba(165, 28, 48, 0.95)"
                : "var(--foreground)";
            return (
              <motion.div
                key={t.id}
                role={t.type === "error" ? "alert" : "status"}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  pointerEvents: "auto",
                  padding: t.action ? "10px 10px 10px 20px" : "12px 20px",
                  background,
                  color: "var(--background)",
                  fontSize: "var(--text-body-sm)",
                  fontWeight: 500,
                  letterSpacing: "0.01em",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                  maxWidth: 380,
                  lineHeight: 1.4,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{ flex: 1, cursor: t.action ? "default" : "pointer" }}
                  onClick={() => {
                    if (!t.action) dismiss(t.id);
                  }}
                >
                  {t.message}
                </span>
                {t.action && (
                  <button
                    type="button"
                    onClick={async () => {
                      const action = t.action;
                      dismiss(t.id);
                      if (action) await action.onClick();
                    }}
                    style={{
                      background: "rgba(255,255,255,0.12)",
                      border: "0.5px solid rgba(255,255,255,0.25)",
                      color: "var(--background)",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      padding: "8px 14px",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.action.label}
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
