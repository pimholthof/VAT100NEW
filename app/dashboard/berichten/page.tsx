import { BerichtenPage } from "@/features/chat/BerichtenPage";

export default function BerichtenRoute() {
  return (
    <div style={{ maxWidth: 720 }}>
      <h1
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "var(--text-display-md)",
          fontWeight: 700,
          letterSpacing: "var(--tracking-display)",
          lineHeight: 1,
          margin: "0 0 24px",
        }}
      >
        Berichten
      </h1>
      <BerichtenPage />
    </div>
  );
}
