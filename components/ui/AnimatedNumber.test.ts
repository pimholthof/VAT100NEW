// Componenttest zonder JSX: tsconfig houdt jsx op "preserve" voor Next,
// dus testbestanden gebruiken createElement rechtstreeks.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createElement, act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LazyMotion, domAnimation } from "framer-motion";
import { LocaleProvider } from "@/lib/i18n/context";
import { AnimatedNumber } from "./AnimatedNumber";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement;
let root: Root;

function mount(node: ReactNode) {
  act(() => {
    root.render(
      createElement(
        LazyMotion,
        { features: domAnimation, strict: true },
        createElement(LocaleProvider, { initialLocale: "nl" }, node)
      )
    );
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

describe("AnimatedNumber", () => {
  it("draagt de geformatteerde eindwaarde als aria-label op de buitenste span", () => {
    mount(createElement(AnimatedNumber, { value: 1250 }));

    const expected = new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(1250);

    const outer = container.querySelector("span[aria-label]");
    expect(outer).not.toBeNull();
    expect(outer!.getAttribute("aria-label")).toBe(expected);
  });

  it("verbergt de tellende binnenspan voor screenreaders", () => {
    mount(createElement(AnimatedNumber, { value: 500 }));

    const outer = container.querySelector("span[aria-label]")!;
    const inner = outer.querySelector("span");
    expect(inner).not.toBeNull();
    expect(inner!.getAttribute("aria-hidden")).toBe("true");
  });

  it("neemt prefix en suffix mee in de toegankelijke waarde", () => {
    mount(
      createElement(AnimatedNumber, {
        value: 9,
        isCurrency: false,
        prefix: "~",
        suffix: " uur",
      })
    );

    const outer = container.querySelector("span[aria-label]")!;
    expect(outer.getAttribute("aria-label")).toBe("~9 uur");
  });
});
