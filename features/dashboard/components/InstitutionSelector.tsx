"use client";

import { m as motion , AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useLocale } from "@/lib/i18n/context";

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
  const { t } = useLocale();
  const [search, setSearch] = useState("");

  const filteredBanks = DUTCH_BANKS.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(13, 13, 11, 0.4)",
              backdropFilter: "blur(8px)",
              zIndex: 100,
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "100%",
              maxWidth: "480px",
              background: "var(--background)",
              border: "0.5px solid rgba(13, 13, 11, 0.15)",
              borderRadius: "var(--radius)",
              boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
              zIndex: 101,
              padding: "32px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: "var(--text-display-sm)",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  margin: "0 0 8px",
                }}
              >
                {t.bank.chooseBank}
              </h3>
              <p
                style={{
                  fontSize: "var(--text-body-md)",
                  fontWeight: 300,
                  opacity: 0.5,
                  margin: 0,
                }}
              >
                {t.bank.selectInstitution}
              </p>
            </div>

            <input
              type="text"
              placeholder={t.bank.searchBank}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                padding: "12px 0",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid rgba(13, 13, 11, 0.15)",
                fontSize: "var(--text-body-lg)",
                outline: "none",
                color: "var(--foreground)",
              }}
            />

            <div
              style={{
                maxHeight: "300px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
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
                    transition: "background 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(13, 13, 11, 0.04)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {bank.name}
                </button>
              ))}
              {filteredBanks.length === 0 && (
                <p style={{ padding: "12px", opacity: 0.4 }}>{t.bank.noBanksFound}</p>
              )}
            </div>

            <div style={{ alignSelf: "flex-end" }}>
              <button
                onClick={onClose}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "var(--text-body-sm)",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                  opacity: 0.4,
                }}
              >
                {t.common.cancel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
