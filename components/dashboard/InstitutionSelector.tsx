"use client";

import { useState } from "react";

const DUTCH_BANKS = [
  { id: "SANDBOXFINANCE_SDA1", name: "GoCardless Sandbox", country: "NL" },
  { id: "ABN_AMRO_ABNA", name: "ABN AMRO", country: "NL" },
  { id: "ING_INGB", name: "ING", country: "NL" },
  { id: "RABOBANK_RABO", name: "Rabobank", country: "NL" },
  { id: "SNS_BANK_SNSB", name: "SNS Bank", country: "NL" },
  { id: "ASN_BANK_ASNB", name: "ASN Bank", country: "NL" },
  { id: "REVOLUT_REVO", name: "Revolut", country: "NL" },
  { id: "BUNQ_BUNQ", name: "bunq", country: "NL" },
  { id: "KNAB_KNAB", name: "Knab", country: "NL" },
  { id: "TRIADOS_TRIA", name: "Triodos Bank", country: "NL" },
];

export function InstitutionSelector({
  isOpen,
  onClose,
  onSelect,
  isPending,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  isPending: boolean;
}) {
  const [search, setSearch] = useState("");

  const filteredBanks = DUTCH_BANKS.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(10, 10, 10, 0.3)",
          zIndex: 100,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%",
          maxWidth: "480px",
          background: "var(--color-surface)",
          border: "var(--border)",
          zIndex: 101,
          padding: "32px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <div>
          <h3 className="section-header" style={{ margin: "0 0 8px" }}>
            Kies je bank
          </h3>
          <p style={{ fontSize: "var(--text-body-md)", fontWeight: 300, opacity: 0.5, margin: 0 }}>
            Selecteer een instantie om je rekeningen veilig te koppelen.
          </p>
        </div>

        <input
          type="text"
          placeholder="Zoek je bank..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          style={{
            width: "100%",
            padding: "12px 0",
            background: "transparent",
            border: "none",
            borderBottom: "var(--border-light)",
            fontSize: "var(--text-body-lg)",
            outline: "none",
            color: "var(--foreground)",
          }}
        />

        <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px" }}>
          {filteredBanks.map((bank) => (
            <button
              key={bank.id}
              onClick={() => onSelect(bank.id)}
              disabled={isPending}
              style={{
                textAlign: "left",
                padding: "12px",
                background: "transparent",
                border: "none",
                cursor: isPending ? "default" : "pointer",
                fontSize: "var(--text-body-md)",
                color: "var(--foreground)",
                opacity: isPending ? 0.5 : 1,
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(10, 10, 10, 0.04)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {bank.name}
            </button>
          ))}
          {filteredBanks.length === 0 && (
            <p style={{ padding: "12px", opacity: 0.4 }}>Geen banken gevonden.</p>
          )}
        </div>

        <div style={{ alignSelf: "flex-end" }}>
          <button
            onClick={onClose}
            className="label-strong"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              opacity: 0.4,
            }}
          >
            Annuleren
          </button>
        </div>
      </div>
    </>
  );
}
