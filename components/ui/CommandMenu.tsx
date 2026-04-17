"use client";

import { useEffect, useState, useCallback, useDeferredValue } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@/lib/i18n/context";
import { useRecentNav } from "@/lib/hooks/useRecentNav";
import { COMMAND_MENU_OPEN_EVENT } from "@/lib/events/command-menu";
import { getInvoices } from "@/features/invoices/actions";
import { getClients } from "@/features/clients/actions";
import { formatCurrency } from "@/lib/format";

const SEARCH_MIN_CHARS = 2;
const MAX_RESULTS_PER_GROUP = 5;

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const trimmed = deferredQuery.trim();
  const searchEnabled = trimmed.length >= SEARCH_MIN_CHARS;

  const router = useRouter();
  const { t } = useLocale();
  const recent = useRecentNav();

  const closeMenu = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => {
          if (prev) {
            setQuery("");
            return false;
          }
          return true;
        });
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("keydown", down);
    const openHandler = () => setOpen(true);
    document.addEventListener(COMMAND_MENU_OPEN_EVENT, openHandler);
    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener(COMMAND_MENU_OPEN_EVENT, openHandler);
    };
  }, []);

  const { data: invoiceResults } = useQuery({
    queryKey: ["cmdk-invoices", trimmed],
    queryFn: () => getInvoices({ search: trimmed }),
    enabled: open && searchEnabled,
    staleTime: 30_000,
  });
  const { data: clientResults } = useQuery({
    queryKey: ["cmdk-clients", trimmed],
    queryFn: () => getClients(trimmed),
    enabled: open && searchEnabled,
    staleTime: 30_000,
  });

  const invoiceMatches = (invoiceResults?.data ?? []).slice(0, MAX_RESULTS_PER_GROUP);
  const clientMatches = (clientResults?.data ?? []).slice(0, MAX_RESULTS_PER_GROUP);

  const runCommand = useCallback(
    (command: () => unknown) => {
      closeMenu();
      command();
    },
    [closeMenu]
  );

  if (!open) return null;

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
      onClick={closeMenu}
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
          shouldFilter={!searchEnabled}
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
              maxHeight: 420,
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

            {searchEnabled && invoiceMatches.length > 0 && (
              <Command.Group heading="Facturen" className="cmdk-group">
                {invoiceMatches.map((inv) => (
                  <Command.Item
                    key={inv.id}
                    value={`invoice-${inv.id}-${inv.invoice_number}-${inv.client?.name ?? ""}`}
                    onSelect={() =>
                      runCommand(() => router.push(`/dashboard/invoices/${inv.id}`))
                    }
                    className="cmdk-item"
                  >
                    <span style={{ flex: 1, display: "flex", gap: 12, minWidth: 0 }}>
                      <span
                        className="mono-amount"
                        style={{ opacity: 0.5, flexShrink: 0 }}
                      >
                        {inv.invoice_number}
                      </span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {inv.client?.name ?? "—"}
                      </span>
                    </span>
                    <span
                      className="mono-amount"
                      style={{ opacity: 0.55, fontSize: 12, flexShrink: 0 }}
                    >
                      {formatCurrency(Number(inv.total_inc_vat) || 0)}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {searchEnabled && clientMatches.length > 0 && (
              <Command.Group heading="Klanten" className="cmdk-group">
                {clientMatches.map((client) => (
                  <Command.Item
                    key={client.id}
                    value={`client-${client.id}-${client.name}`}
                    onSelect={() =>
                      runCommand(() => router.push(`/dashboard/clients/${client.id}`))
                    }
                    className="cmdk-item"
                  >
                    <span style={{ flex: 1, display: "flex", gap: 12, minWidth: 0 }}>
                      <span>{client.name}</span>
                      {client.city && (
                        <span style={{ opacity: 0.4, fontSize: 12 }}>
                          {client.city}
                        </span>
                      )}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {!searchEnabled && recent.length > 0 && (
              <Command.Group heading="Recent" className="cmdk-group">
                {recent.map((item) => (
                  <Command.Item
                    key={`recent-${item.path}`}
                    value={`recent-${item.path}-${item.label}`}
                    onSelect={() => runCommand(() => router.push(item.path))}
                    className="cmdk-item"
                  >
                    {item.label}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group heading={t.commandMenu.actionsGroup} className="cmdk-group">
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/invoices/new"))}
                className="cmdk-item"
              >
                {t.commandMenu.newInvoice}
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/clients/new"))}
                className="cmdk-item"
              >
                {t.commandMenu.newClient}
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/receipts/new"))}
                className="cmdk-item"
              >
                Nieuwe bon
              </Command.Item>
            </Command.Group>

            <Command.Group heading={t.commandMenu.navGroup} className="cmdk-group">
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard"))}
                className="cmdk-item"
              >
                {t.commandMenu.dashboard}
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/invoices"))}
                className="cmdk-item"
              >
                {t.commandMenu.invoicesOverview}
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/clients"))}
                className="cmdk-item"
              >
                {t.commandMenu.clientsOverview}
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/tax"))}
                className="cmdk-item"
              >
                BTW & belasting
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/expenses"))}
                className="cmdk-item"
              >
                {t.commandMenu.receiptsExpenses}
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/berichten"))}
                className="cmdk-item"
              >
                Berichten
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/settings"))}
                className="cmdk-item"
              >
                {t.commandMenu.settings}
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .cmdk-group [cmdk-group-heading] {
          padding: 8px 24px;
          font-family: var(--font-body), sans-serif;
          font-size: var(--text-label);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: var(--tracking-label);
          color: rgba(0,0,0,0.3);
        }
        .cmdk-item {
          padding: 12px 24px;
          cursor: pointer;
          font-size: var(--text-body-md);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .cmdk-item[data-selected="true"],
        .cmdk-item:hover {
          background: rgba(0,0,0,0.03);
          color: var(--foreground);
        }
      `}} />
    </div>
  );
}
