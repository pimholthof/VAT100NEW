// Componenttest zonder JSX: tsconfig houdt jsx op "preserve" voor Next,
// dus testbestanden gebruiken createElement rechtstreeks.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LazyMotion, domAnimation } from "framer-motion";
import { ToastProvider, useToast, type ToastOptions } from "./Toast";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

type FireArgs = Parameters<ReturnType<typeof useToast>["toast"]>;

let container: HTMLDivElement;
let root: Root;

function Harness({ args }: { args: FireArgs }) {
  const { toast } = useToast();
  return createElement(
    "button",
    { type: "button", onClick: () => toast(...args) },
    "vuur toast af"
  );
}

function mountAndFire(...args: FireArgs) {
  act(() => {
    root.render(
      createElement(
        LazyMotion,
        { features: domAnimation, strict: true },
        createElement(ToastProvider, null, createElement(Harness, { args }))
      )
    );
  });
  act(() => {
    container.querySelector("button")!.click();
  });
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

describe("Toast", () => {
  it("rendert een warning-toast met statuskleur-dot (string-API)", () => {
    mountAndFire("Let op", "warning");

    const toastEl = document.querySelector('[role="status"]');
    expect(toastEl).not.toBeNull();
    expect(toastEl!.textContent).toContain("Let op");

    const dot = toastEl!.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dot).not.toBeNull();
    expect(dot.style.background).toBe("var(--color-warning)");
  });

  it("geeft een error-toast role=alert en papier-dot (options-API)", () => {
    mountAndFire("Mislukt", { type: "error" } satisfies ToastOptions);

    const alertEl = document.querySelector('[role="alert"]');
    expect(alertEl).not.toBeNull();
    expect(alertEl!.textContent).toContain("Mislukt");

    const dot = alertEl!.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dot.style.background).toBe("var(--background)");
  });

  it("gebruikt success als standaardtype", () => {
    mountAndFire("Opgeslagen");

    const toastEl = document.querySelector('[role="status"]');
    expect(toastEl).not.toBeNull();
    const dot = toastEl!.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dot.style.background).toBe("var(--color-success)");
  });
});
