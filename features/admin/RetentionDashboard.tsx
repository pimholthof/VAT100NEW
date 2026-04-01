import { createServiceClient } from "@/lib/supabase/service";
import { NudgeLeadButton, BillingAlertButton } from "./RetentionButtons";

export async function getRetentionData() {
  const supabase = createServiceClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);

  const { data: atRiskLeads } = await supabase
    .from("leads")
    .select("*, plans!target_plan_id(name)")
    .not("target_plan_id", "is", null)
    .is("vat100_user_id", null)
    .lt("updated_at", oneDayAgo.toISOString())
    .limit(5);

  const { data: pastDueSubs } = await supabase
    .from("subscriptions")
    .select("*, plan:plans(name), profile:profiles(full_name, studio_name)")
    .eq("status", "past_due")
    .limit(5);

  const { data: inactiveUsers } = await supabase
    .from("profiles")
    .select("*")
    .lt("updated_at", thirtyDaysAgo.toISOString())
    .limit(5);

  return { atRiskLeads, pastDueSubs, inactiveUsers };
}

export default async function RetentionDashboard() {
  const { atRiskLeads, pastDueSubs, inactiveUsers } = await getRetentionData();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
        <h2 style={{ fontSize: "var(--text-display-sm)", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
          Retentie
        </h2>
        {((atRiskLeads?.length ?? 0) + (pastDueSubs?.length ?? 0)) > 0 && (
          <span
            className="label-strong"
            style={{
              padding: "4px 12px",
              background: "rgba(165,28,48,0.08)",
              color: "var(--color-accent)",
              borderRadius: "9999px",
              fontSize: 9,
            }}
          >
            Aandacht vereist
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {/* Stagnerende leads */}
        <div className="brutalist-panel brutalist-panel-padded">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <span className="label">Stagnerende leads</span>
            <span className="label">{atRiskLeads?.length || 0}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {atRiskLeads?.map((lead) => (
              <div
                key={lead.id}
                style={{
                  border: "0.5px solid rgba(0,0,0,0.08)",
                  borderRadius: "var(--radius)",
                  padding: 16,
                }}
              >
                <span className="label" style={{ display: "block", marginBottom: 4 }}>
                  {lead.plans?.name}
                </span>
                <span style={{ fontWeight: 500, fontSize: "var(--text-body-md)", display: "block" }}>
                  {lead.email}
                </span>
                <span className="label" style={{ display: "block", marginTop: 4 }}>
                  Geen betaling na 24 uur
                </span>
                <NudgeLeadButton leadId={lead.id} />
              </div>
            ))}
            {atRiskLeads?.length === 0 && (
              <p className="label">Geen stagnatie gedetecteerd</p>
            )}
          </div>
        </div>

        {/* Mislukte betalingen */}
        <div className="brutalist-panel brutalist-panel-padded">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <span className="label">Mislukte betalingen</span>
            <span className="label" style={{ color: (pastDueSubs?.length ?? 0) > 0 ? "var(--color-accent)" : undefined }}>
              {pastDueSubs?.length || 0}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pastDueSubs?.map((sub) => (
              <div
                key={sub.id}
                style={{
                  border: "0.5px solid rgba(165,28,48,0.15)",
                  borderRadius: "var(--radius)",
                  padding: 16,
                  background: "rgba(165,28,48,0.02)",
                }}
              >
                <span className="label" style={{ display: "block", marginBottom: 4, color: "var(--color-accent)" }}>
                  {sub.plan?.name}
                </span>
                <span style={{ fontWeight: 500, fontSize: "var(--text-body-md)", display: "block" }}>
                  {sub.profile?.studio_name || sub.profile?.full_name}
                </span>
                <span className="label" style={{ display: "block", marginTop: 4, color: "var(--color-accent)" }}>
                  Achterstallig
                </span>
                <BillingAlertButton userId={sub.user_id} />
              </div>
            ))}
            {pastDueSubs?.length === 0 && (
              <p className="label" style={{ color: "var(--color-success)" }}>Alle incasso&apos;s geslaagd</p>
            )}
          </div>
        </div>

        {/* Inactieve gebruikers */}
        <div className="brutalist-panel brutalist-panel-padded">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <span className="label">Inactieve profielen</span>
            <span className="label">{inactiveUsers?.length || 0}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {inactiveUsers?.map((user) => (
              <div
                key={user.id}
                style={{
                  border: "0.5px solid rgba(0,0,0,0.08)",
                  borderRadius: "var(--radius)",
                  padding: 16,
                  opacity: 0.6,
                }}
              >
                <span className="label" style={{ display: "block", marginBottom: 4 }}>
                  Geen activiteit meer dan 30 dagen
                </span>
                <span style={{ fontWeight: 500, fontSize: "var(--text-body-md)" }}>
                  {user.studio_name || user.full_name}
                </span>
              </div>
            ))}
            {inactiveUsers?.length === 0 && (
              <p className="label">Iedereen is actief</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
