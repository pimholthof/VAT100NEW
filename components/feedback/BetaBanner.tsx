"use client";

import { useSyncExternalStore } from "react";
import { isBetaMode } from "@/lib/config/features";
import styles from "./BetaBanner.module.css";

const STORAGE_KEY = "vat100-beta-banner";

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "dismissed";
}

// Server kent geen localStorage: behandel als 'verborgen' zodat er geen
// hydration-mismatch ontstaat. useSyncExternalStore leest na hydratie de
// echte clientwaarde.
function getServerSnapshot(): boolean {
  return true;
}

function dismiss() {
  localStorage.setItem(STORAGE_KEY, "dismissed");
  listeners.forEach((l) => l());
}

/**
 * Slanke, wegklikbare banner die aangeeft dat dit de bèta is en feedback
 * uitnodigt. Rendert niets buiten bèta-modus of na dismissal.
 */
export function BetaBanner() {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!isBetaMode() || dismissed) return null;

  return (
    <div className={styles.banner} role="status">
      <span>
        <strong>Bèta.</strong> Gratis tijdens de testperiode — jouw feedback maakt
        VAT100 beter. Klik op <strong>Feedback</strong> rechtsonder.
      </span>
      <button
        className={styles.close}
        onClick={dismiss}
        aria-label="Banner sluiten"
        type="button"
      >
        ×
      </button>
    </div>
  );
}
