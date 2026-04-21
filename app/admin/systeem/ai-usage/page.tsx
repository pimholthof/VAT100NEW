import { getAiUsageSummary } from "@/features/admin/ai-usage-actions";

export const dynamic = "force-dynamic";

export default async function AiUsagePage() {
  const result = await getAiUsageSummary();

  if (result.error !== null || !result.data) {
    return (
      <div style={{ padding: 32 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>AI-verbruik</h1>
        <p style={{ color: "var(--color-accent)", marginTop: 16, fontSize: 13 }}>
          {result.error ?? "Geen data"}
        </p>
      </div>
    );
  }

  const s = result.data;

  return (
    <div style={{ padding: 32, maxWidth: 960 }}>
      <p className="label" style={{ opacity: 0.5, margin: 0 }}>
        Admin · Systeem
      </p>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", margin: "8px 0 4px" }}>
        AI-verbruik
      </h1>
      <p className="label" style={{ opacity: 0.5, margin: 0 }}>
        Periode vanaf {new Date(s.periodStart).toLocaleDateString("nl-NL")}
      </p>

      <div
        style={{
          marginTop: 32,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        <Kpi label="Actieve gebruikers" value={s.uniqueUsers.toString()} />
        <Kpi label="OCR-scans" value={s.totalOcr.toLocaleString("nl-NL")} />
        <Kpi label="Chat-berichten" value={s.totalChat.toLocaleString("nl-NL")} />
        <Kpi label="MRR" value={`€ ${(s.totalMrrCents / 100).toFixed(0)}`} />
        <Kpi
          label="Geschatte AI-kosten"
          value={`€ ${s.estimatedCostEuros.toFixed(2)}`}
          accent
        />
        <Kpi
          label="Kosten % MRR"
          value={
            s.totalMrrCents > 0
              ? `${((s.estimatedCostEuros * 100) / (s.totalMrrCents / 100)).toFixed(1)}%`
              : "—"
          }
          accent
        />
      </div>

      <div style={{ marginTop: 40 }}>
        <p className="label" style={{ margin: "0 0 12px", opacity: 0.6 }}>
          Top-10 gebruikers (geschatte kosten)
        </p>
        {s.topUsers.length === 0 ? (
          <p style={{ fontSize: 13, opacity: 0.5 }}>Nog geen verbruik deze periode.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-black)", textAlign: "left" }}>
                <th style={thStyle}>Gebruiker</th>
                <th style={thStyle}>Plan</th>
                <th style={{ ...thStyle, textAlign: "right" }}>OCR</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Chat</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Kosten</th>
              </tr>
            </thead>
            <tbody>
              {s.topUsers.map((u) => (
                <tr key={u.userId} style={{ borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500 }}>{u.fullName ?? u.userId.slice(0, 8)}</div>
                    {u.email && (
                      <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{u.email}</div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        opacity: 0.7,
                      }}
                    >
                      {u.planId ?? "—"}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{u.ocrCount}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{u.chatCount}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>
                    € {u.estimatedCostEuros.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ padding: 20, border: "0.5px solid rgba(0,0,0,0.1)" }}>
      <p
        className="label"
        style={{ margin: 0, opacity: 0.5, letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 10 }}
      >
        {label}
      </p>
      <p
        style={{
          margin: "6px 0 0",
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          color: accent ? "var(--color-accent, var(--foreground))" : "var(--foreground)",
        }}
      >
        {value}
      </p>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontWeight: 500,
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  opacity: 0.6,
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
};
