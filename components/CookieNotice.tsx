"use client";

import { useState, useSyncExternalStore, useCallback } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

const STORAGE_KEY = "cookie-notice-dismissed";

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) !== "true";
}

function getServerSnapshot() {
  return false;
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export default function CookieNotice() {
  const shouldShow = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [dismissed, setDismissed] = useState(false);

  const visible = shouldShow && !dismissed;

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            position: "fixed",
            bottom: 24,
            left: 24,
            right: 24,
            maxWidth: 480,
            margin: "0 auto",
            zIndex: 9998,
            background: "rgba(255, 255, 255, 0.82)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            border: "0.5px solid rgba(0, 0, 0, 0.05)",
            borderRadius: 12,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.04)",
          }}
        >
          <p
            style={{
              fontSize: 12,
              lineHeight: 1.6,
              color: "var(--color-black)",
              opacity: 0.5,
              flex: 1,
              margin: 0,
            }}
          >
            Deze website gebruikt alleen functionele cookies die noodzakelijk
            zijn voor de dienst.{" "}
            <Link
              href="/privacy"
              style={{
                color: "var(--color-black)",
                textDecoration: "underline",
              }}
            >
              Privacybeleid
            </Link>
          </p>
          <button
            onClick={dismiss}
            style={{
              fontSize: 12,
              fontWeight: 500,
              padding: "8px 16px",
              background: "var(--color-black)",
              color: "var(--color-white, #fff)",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Begrepen
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
