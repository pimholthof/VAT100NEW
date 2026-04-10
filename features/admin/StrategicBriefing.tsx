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
      <div className="admin-panel">
        <div className="admin-panel-header">
          <h3 className="label">Strategische scan</h3>
        </div>
        <p className="admin-empty-state">Nog geen scan uitgevoerd</p>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3 className="label">Strategische scan</h3>
        <span className="admin-panel-date">{formatDateLong(briefing.created_at)}</span>
      </div>

      <div className="admin-briefing-metrics">
        <div>
          <span className="label">MRR</span>
          <p className="admin-briefing-metric-value">{formatCurrency(briefing.mrr_cents / 100)}</p>
        </div>
        <div>
          <span className="label">Churn risico</span>
          <p className="admin-briefing-metric-value" style={{ color: "var(--color-accent)" }}>
            {formatCurrency(briefing.churn_mrr_cents / 100)}
          </p>
        </div>
        <div>
          <span className="label">Pipeline</span>
          <p className="admin-briefing-metric-value">{formatCurrency(briefing.pipeline_value_cents / 100)}</p>
        </div>
      </div>

      <div>
        <span className="label">Strategisch inzicht</span>
        <p className="admin-briefing-text">{briefing.briefing_text}</p>
      </div>

      <div className="admin-briefing-tags">
        <span className="score-badge">{briefing.active_users} actieve gebruikers</span>
        {briefing.at_risk_leads > 0 && (
          <span className="score-badge high">{briefing.at_risk_leads} risico&apos;s</span>
        )}
      </div>
    </div>
  );
}
