import { useEffect, type RefObject } from "react";

/** Selector voor elementen die focus kunnen ontvangen binnen de trap. */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

interface FocusTrapOptions {
  /** Aangeroepen bij Escape (meestal de sluit-handler). */
  onEscape?: () => void;
  /** Zet de focus bij sluiten terug op het eerder actieve element. */
  restoreFocus?: boolean;
  /** Waar de focus naartoe gaat bij openen. */
  initialFocus?: "container" | "first" | "none";
}

/**
 * Houdt de focus binnen een open dialog of sheet: Tab cyclet rond, Escape
 * sluit en de focus keert terug naar de aanroeper. Zonder dit kunnen
 * toetsenbordgebruikers per ongeluk met de achtergrond interacteren.
 *
 * Bewust geen native <dialog>: de Framer Motion-exitanimaties (BottomSheet)
 * verdragen dialog.close() niet — het element verlaat de top layer voordat
 * de exit-spring is uitgespeeld.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  { onEscape, restoreFocus = true, initialFocus = "none" }: FocusTrapOptions = {},
) {
  useEffect(() => {
    if (!active) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    if (initialFocus === "container") {
      ref.current?.focus?.();
    } else if (initialFocus === "first") {
      ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE)[0]?.focus?.();
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onEscape?.();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;

      const nodes = ref.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const current = document.activeElement as HTMLElement | null;

      if (e.shiftKey && current === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      if (restoreFocus) previouslyFocused?.focus?.();
    };
  }, [ref, active, onEscape, restoreFocus, initialFocus]);
}
