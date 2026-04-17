"use client";

import { useState } from "react";
import { m as motion, AnimatePresence } from "framer-motion";

interface Rubriek {
  code: string;
  title: string;
  explanation: string;
  applies: string;
}

const RUBRIEKEN: Rubriek[] = [
  {
    code: "1a",
    title: "Leveringen 21%",
    explanation: "Je binnenlandse omzet waarover je 21% BTW rekent.",
    applies: "De meeste Nederlandse zzp'ers rapporteren hier.",
  },
  {
    code: "1b",
    title: "Leveringen 9%",
    explanation: "Binnenlandse omzet met het lage BTW-tarief (o.a. boeken, eten, sommige diensten).",
    applies: "Alleen relevant als je 9%-tarief hebt gefactureerd.",
  },
  {
    code: "1c",
    title: "Leveringen overige tarieven",
    explanation: "Omzet met 0% BTW of andere bijzondere tarieven.",
    applies: "Zelden relevant voor creatieve zzp'ers.",
  },
  {
    code: "2a",
    title: "ICP — leveringen naar EU",
    explanation: "Leveringen aan bedrijven binnen de EU met een geldig BTW-nummer.",
    applies: "Bijvoorbeeld een design-opdracht voor een Duits bureau.",
  },
  {
    code: "3b",
    title: "Diensten EU (verlegd)",
    explanation: "Diensten aan EU-bedrijven waar de BTW wordt verlegd naar de afnemer.",
    applies: "Je rekent 0% en vermeldt 'BTW verlegd'.",
  },
  {
    code: "4b",
    title: "Export buiten EU",
    explanation: "Omzet aan afnemers buiten de EU — 0% BTW.",
    applies: "Bijvoorbeeld een klant in de VS of het VK.",
  },
  {
    code: "5b",
    title: "Voorbelasting",
    explanation: "BTW die je zelf hebt betaald op zakelijke uitgaven en mag aftrekken.",
    applies: "Komt uit je bonnen en zakelijke inkopen.",
  },
];

export function AangifteExplainer() {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        marginBottom: 24,
        border: "0.5px solid rgba(0, 0, 0, 0.08)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="aangifte-explainer-body"
        style={{
          width: "100%",
          padding: "16px 20px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--foreground)",
        }}
      >
        <span style={{ opacity: 0.7 }}>Hoe lees ik deze aangifte?</span>
        <span style={{ opacity: 0.4, fontSize: 14 }}>{open ? "−" : "+"}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="aangifte-explainer-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                padding: "8px 20px 24px",
                borderTop: "0.5px solid rgba(0, 0, 0, 0.06)",
              }}
            >
              <p
                style={{
                  margin: "16px 0 20px",
                  fontSize: 13,
                  opacity: 0.7,
                  lineHeight: 1.55,
                  maxWidth: 560,
                }}
              >
                Elk kwartaal stuurt de Belastingdienst deze rubrieken door. VAT100
                berekent ze uit jouw facturen en bonnen. Je vult ze handmatig in
                op <strong>Mijn Belastingdienst Zakelijk</strong>.
              </p>
              <div style={{ display: "grid", gap: 16 }}>
                {RUBRIEKEN.map((r) => (
                  <div
                    key={r.code}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "44px 1fr",
                      gap: 12,
                      alignItems: "start",
                    }}
                  >
                    <span
                      className="mono-amount"
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        opacity: 0.5,
                        letterSpacing: "0.08em",
                        paddingTop: 2,
                      }}
                    >
                      {r.code}
                    </span>
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          fontWeight: 500,
                          lineHeight: 1.4,
                        }}
                      >
                        {r.title}
                      </p>
                      <p
                        style={{
                          margin: "2px 0 0",
                          fontSize: 12,
                          opacity: 0.6,
                          lineHeight: 1.45,
                        }}
                      >
                        {r.explanation}
                      </p>
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: 11,
                          opacity: 0.4,
                          lineHeight: 1.45,
                          fontStyle: "italic",
                        }}
                      >
                        {r.applies}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
