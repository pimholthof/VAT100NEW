"use client";

import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/context";
import { NAV_ITEMS, QUICK_ACTIONS } from "@/lib/navigation";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const router = useRouter();
  const { t } = useLocale();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  if (!open) return null;

  const nav = t.nav as Record<string, string>;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command menu"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(255, 255, 255, 0.4)",
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "15vh",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
      }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 640,
          background: "var(--background)",
          border: "1px solid var(--color-black)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
          boxShadow: "none",
        }}
      >
        <Command
          style={{ width: "100%" }}
          label="Global commands"
        >
          <div style={{ borderBottom: "var(--border-rule)" }}>
            <Command.Input
              placeholder={t.commandMenu.placeholder}
              autoFocus
              value={query}
              onValueChange={setQuery}
              style={{
                width: "100%",
                padding: "20px 24px",
                border: "none",
                fontSize: "var(--text-mono-md)",
                outline: "none",
                background: "transparent",
                color: "var(--foreground)",
              }}
            />
          </div>

          <Command.List
            style={{
              maxHeight: 320,
              overflowY: "auto",
              padding: "12px 0",
              fontFamily: "var(--font-body), sans-serif",
            }}
          >
            <Command.Empty
              style={{ padding: "24px", textAlign: "center", opacity: 0.5 }}
            >
              {t.commandMenu.noResults} &quot;{query}&quot;.
            </Command.Empty>

            <Command.Group heading={t.commandMenu.actionsGroup} className="cmdk-group">
              {QUICK_ACTIONS.map((action) => (
                <Command.Item
                  key={action.href}
                  onSelect={() => runCommand(() => router.push(action.href))}
                  className="cmdk-item"
                >
                  {nav[action.labelKey] ?? action.labelKey}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading={t.commandMenu.navGroup} className="cmdk-group">
              {NAV_ITEMS.map((item) => (
                <Command.Item
                  key={item.href}
                  onSelect={() => runCommand(() => router.push(item.href))}
                  className="cmdk-item"
                >
                  {nav[item.labelKey] ?? item.labelKey}
                </Command.Item>
              ))}
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/settings"))}
                className="cmdk-item"
              >
                {t.nav.settings}
              </Command.Item>
            </Command.Group>

          </Command.List>
        </Command>
      </div>
    </div>
  );
}
