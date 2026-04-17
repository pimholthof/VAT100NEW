import TaxAgentChat from "@/components/ai/TaxAgentChat";

export default function AIAssistantPage() {
  return (
    <div style={{ maxWidth: 820 }}>
      <h1
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "var(--text-display-md)",
          fontWeight: 700,
          letterSpacing: "var(--tracking-display)",
          lineHeight: 1,
          margin: "0 0 8px",
        }}
      >
        Fiscale assistent
      </h1>
      <p
        style={{
          fontSize: 13,
          opacity: 0.55,
          margin: "0 0 24px",
          lineHeight: 1.5,
          maxWidth: 560,
        }}
      >
        Rekent live met jouw facturen, bonnen en fiscale instellingen. Antwoorden
        zijn indicatief — bevestig grote besluiten met een adviseur.
      </p>
      <div style={{ height: "calc(100vh - 260px)", minHeight: 480 }}>
        <TaxAgentChat />
      </div>
    </div>
  );
}
