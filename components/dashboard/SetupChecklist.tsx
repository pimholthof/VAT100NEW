"use client";

import { useQuery } from "@tanstack/react-query";
import { getSetupProgress } from "@/lib/actions/dashboard";

/**
 * SetupChecklist — Shows new users what steps remain to get fully
 * set up. Disappears when all steps are complete.
 */
export function SetupChecklist() {
  const { data: result } = useQuery({
    queryKey: ["setup-progress"],
    queryFn: () => getSetupProgress(),
  });

  const steps = result?.data;
  if (!steps) return null;

  const completed = Object.values(steps).filter(Boolean).length;
  const total = Object.keys(steps).length;

  // All done? Don't show anything
  if (completed >= total) return null;

  const checklist: { key: keyof typeof steps; label: string; href: string }[] = [
    { key: "hasProfile", label: "Bedrijfsgegevens completeren", href: "/dashboard/settings" },
    { key: "hasClient", label: "Klantdossier aanmaken", href: "/dashboard/clients/new" },
    { key: "hasInvoice", label: "Factuur genereren", href: "/dashboard/invoices/new" },
    { key: "hasReceipt", label: "Document aanleveren", href: "/dashboard/receipts/new" },
    { key: "hasBankConnection", label: "Bankverbinding instellen", href: "/dashboard/bank" },
  ];

  return (
    <div
      style={{
        marginBottom: "var(--space-section)",
        border: "1px solid rgba(13,13,11,0.12)",
        padding: 24,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 className="section-header" style={{ margin: 0 }}>
          Configuratie
        </h2>
        <span
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "var(--text-mono-md)",
          }}
        >
          {completed}/{total}
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: "100%",
          height: 3,
          background: "rgba(13,13,11,0.06)",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: `${(completed / total) * 100}%`,
            height: "100%",
            background: "var(--foreground)",
            transition: "width 0.5s ease",
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {checklist.map((item) => (
          <a
            key={item.key}
            href={item.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              textDecoration: "none",
              color: "var(--foreground)",
              opacity: steps[item.key] ? 0.35 : 1,
              transition: "opacity 0.15s ease",
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                border: steps[item.key]
                  ? "none"
                  : "1.5px solid rgba(13,13,11,0.3)",
                background: steps[item.key] ? "var(--foreground)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: "10px",
                color: "var(--background)",
              }}
            >
              {steps[item.key] ? "✓" : ""}
            </span>
            <span
              style={{
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "var(--text-body-md)",
                fontWeight: steps[item.key] ? 400 : 500,
                textDecoration: steps[item.key] ? "line-through" : "none",
              }}
            >
              {item.label}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
