import { createServiceClient } from "@/lib/supabase/service";
import { formatCurrency, formatDateLong } from "@/lib/format";

export async function getLatestBriefing() {
  try {
    const supabase = createServiceClient();
    const { data: briefing } = await supabase
      .from("strategic_briefings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return briefing;
  } catch {
    return null;
  }
}

export default async function StrategicBriefing() {
  const briefing = await getLatestBriefing();

  if (!briefing) {
    return (
      <div className="brutalist-panel brutalist-panel-padded">
        <p className="label">Nog geen strategische scan uitgevoerd. Wacht op de wekelijkse briefing.</p>
      </div>
    );
  }

  return (
    <div className="brutalist-panel">
      <div className="brutalist-panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span className="label" style={{ display: "block", marginBottom: 4 }}>Laatste strategische scan</span>
          <span style={{ fontSize: "var(--text-body-sm)", opacity: 0.35 }}>
            {formatDateLong(briefing.created_at)}
          </span>
        </div>
      </div>

      <div className="brutalist-panel-padded">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 32, marginBottom: 32 }}>
          <div>
            <span className="label" style={{ display: "block", marginBottom: 8 }}>Maandelijkse omzet</span>
            <span className="mono-amount-lg" style={{ fontSize: "1.75rem", fontWeight: 400 }}>
              {formatCurrency(briefing.mrr_cents / 100)}
            </span>
          </div>

          <div>
            <span className="label" style={{ display: "block", marginBottom: 8 }}>Omzet risico (verloop)</span>
            <span className="mono-amount-lg" style={{ fontSize: "1.75rem", fontWeight: 400, color: "var(--color-accent)" }}>
              {formatCurrency(briefing.churn_mrr_cents / 100)}
            </span>
          </div>

          <div>
            <span className="label" style={{ display: "block", marginBottom: 8 }}>Pijplijnwaarde</span>
            <span className="mono-amount-lg" style={{ fontSize: "1.75rem", fontWeight: 400 }}>
              {formatCurrency(briefing.pipeline_value_cents / 100)}
            </span>
          </div>
        </div>

        <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.08)", paddingTop: 24 }}>
          <span className="label" style={{ display: "block", marginBottom: 12 }}>Strategisch inzicht</span>
          <p style={{ fontSize: "var(--text-body-md)", lineHeight: 1.6, maxWidth: 640, margin: 0, fontWeight: 400 }}>
            {briefing.briefing_text}
          </p>
        </div>

        <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
          <span className="score-badge">
            {briefing.active_users} actieve gebruikers
          </span>
          {briefing.at_risk_leads > 0 && (
            <span className="score-badge high">
              {briefing.at_risk_leads} risico&apos;s
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
