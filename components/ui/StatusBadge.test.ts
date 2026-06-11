// Componenttest zonder JSX: tsconfig houdt jsx op "preserve" voor Next,
// dus testbestanden gebruiken createElement rechtstreeks.
// Regressietest voor QA-bevinding PR #192: keyboard-model van de status-dropdown.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { StatusBadge } from "./StatusBadge";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const OPTIONS = [
  { value: "draft", label: "Concept" },
  { value: "sent", label: "Verzonden" },
  { value: "paid", label: "Betaald" },
];

let container: HTMLDivElement;
let root: Root;

function mount(onChange: (v: string) => void = () => {}) {
  act(() => {
    root.render(
      createElement(StatusBadge, {
        value: "sent",
        options: OPTIONS,
        onChange,
        ariaLabel: "Status",
      })
    );
  });
}

function trigger(): HTMLButtonElement {
  return container.querySelector('[aria-haspopup="listbox"]') as HTMLButtonElement;
}

function openMenu() {
  act(() => {
    trigger().click();
  });
}

function pressKey(key: string) {
  act(() => {
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true })
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

describe("StatusBadge keyboard-model", () => {
  it("focust de geselecteerde optie bij openen", () => {
    mount();
    openMenu();

    const active = document.activeElement as HTMLElement;
    expect(active.getAttribute("role")).toBe("option");
    expect(active.textContent).toBe("Verzonden");
    expect(active.getAttribute("aria-selected")).toBe("true");
  });

  it("navigeert met pijltjestoetsen door de opties (met wrap)", () => {
    mount();
    openMenu();

    pressKey("ArrowDown");
    expect((document.activeElement as HTMLElement).textContent).toBe("Betaald");

    pressKey("ArrowDown"); // wrap naar begin
    expect((document.activeElement as HTMLElement).textContent).toBe("Concept");

    pressKey("ArrowUp"); // wrap terug naar einde
    expect((document.activeElement as HTMLElement).textContent).toBe("Betaald");
  });

  it("sluit met Escape en geeft focus terug aan de trigger", () => {
    mount();
    openMenu();
    pressKey("Escape");

    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it("kiest een optie met Enter, sluit en geeft focus terug", () => {
    const onChange = vi.fn();
    mount(onChange);
    openMenu();

    pressKey("ArrowDown"); // naar "Betaald"
    act(() => {
      (document.activeElement as HTMLButtonElement).click(); // Enter op een button = click
    });

    expect(onChange).toHaveBeenCalledWith("paid");
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });
});
