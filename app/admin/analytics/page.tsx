"use client";

import { useQuery } from "@tanstack/react-query";
import { getSubscriptionAnalytics } from "@/features/admin/actions/analytics";
import { PageHeader, StatCard, SkeletonCard } from "@/components/ui";
import { formatCurrency } from "@/lib/format";

const formatEur = formatCurrency;

function MiniBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
      <span style={{ minWidth: 100, fontSize: "var(--text-body-sm)", fontWeight: 500 }}>{label}</span>
      <div style={{ flex: 1, height: 8, background: "rgba(0,0,0,0.04)", borderRadius: 4 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "#000", borderRadius: 4, transition: "width 0.3s" }} />
      </div>
      <span style={{ minWidth: 40, textAlign: "right", fontSize: "var(--text-body-sm)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
    </div>
  );
}

function FunnelBar({ value, total, label }: { value: number; total: number; label: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: "var(--text-body-sm)", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: "var(--text-body-sm)", opacity: 0.6 }}>{value} ({pct}%)</span>
      </div>
      <div style={{ height: 6, background: "rgba(0,0,0,0.04)", borderRadius: 3 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "#000", borderRadius: 3, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-subscription-analytics"],
    queryFn: getSubscriptionAnalytics,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  const data = result?.data;

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Analytics" backHref="/admin" backLabel="Beheer" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <PageHeader title="Analytics" backHref="/admin" backLabel="Beheer" />
        <p className="empty-state">Kon analytics niet laden.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Analytics" backHref="/admin" backLabel="Beheer" />

      {/* Key Metrics */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <StatCard label="MRR" value={formatEur(data.mrr)} />
          <StatCard
            label="MRR Groei"
            value={`${data.mrrGrowth > 0 ? "+" : ""}${data.mrrGrowth}%`}
          />
          <StatCard label="Actieve abonnementen" value={data.totalActiveSubscriptions} />
          <StatCard label="Churn rate" value={`${data.churnRate}%`} />
          <StatCard label="ARPU" value={formatEur(data.arpu)} />
          <StatCard label="LTV (schatting)" value={formatEur(data.ltv)} />
        </div>
      </section>

      {/* MRR Trend + Conversion Funnel side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 48 }}>
        {/* MRR Trend */}
        <section>
          <h2 style={{ fontSize: "var(--text-heading-sm)", fontWeight: 600, marginBottom: 16 }}>
            MRR Trend (6 maanden)
          </h2>
          <div style={{ padding: 24, borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.85)" }}>
            {data.monthlyMrr.map((m) => (
              <MiniBar key={m.month} value={m.mrr} max={Math.max(...data.monthlyMrr.map((x) => x.mrr), 1)} label={m.month} />
            ))}
          </div>
        </section>

        {/* Conversion Funnel */}
        <section>
          <h2 style={{ fontSize: "var(--text-heading-sm)", fontWeight: 600, marginBottom: 16 }}>
            Conversie Funnel
          </h2>
          <div style={{ padding: 24, borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.85)" }}>
            <FunnelBar value={data.conversionFunnel.totalLeads} total={data.conversionFunnel.totalLeads} label="Totaal leads" />
            <FunnelBar value={data.conversionFunnel.linkSent} total={data.conversionFunnel.totalLeads} label="Link verstuurd" />
            <FunnelBar value={data.conversionFunnel.planChosen} total={data.conversionFunnel.totalLeads} label="Plan gekozen" />
            <FunnelBar value={data.conversionFunnel.customers} total={data.conversionFunnel.totalLeads} label="Klant" />
            <p style={{ marginTop: 16, fontSize: "var(--text-body-sm)", opacity: 0.6 }}>
              Conversie: <strong>{Math.round(data.conversionFunnel.conversionRate)}%</strong>
            </p>
          </div>
        </section>
      </div>

      {/* Plan Distribution + Cohort Retention */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 48 }}>
        {/* Plan Distribution */}
        <section>
          <h2 style={{ fontSize: "var(--text-heading-sm)", fontWeight: 600, marginBottom: 16 }}>
            Verdeling per Plan
          </h2>
          <div style={{ padding: 24, borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.85)" }}>
            {data.planDistribution.length === 0 ? (
              <p className="label">Geen actieve abonnementen</p>
            ) : (
              data.planDistribution.map((p) => (
                <div key={p.planId} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid rgba(0,0,0,0.05)" }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{p.planName}</span>
                    <span className="label" style={{ marginLeft: 8 }}>{p.count} abonnees</span>
                  </div>
                  <span style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{formatEur(p.revenue)}/mnd</span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Cohort Retention */}
        <section>
          <h2 style={{ fontSize: "var(--text-heading-sm)", fontWeight: 600, marginBottom: 16 }}>
            Cohort Retentie
          </h2>
          <div style={{ padding: 24, borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.85)" }}>
            {data.cohortRetention.map((c) => (
              <div key={c.cohort} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ minWidth: 80, fontSize: "var(--text-body-sm)", fontWeight: 500 }}>{c.cohort}</span>
                <div style={{ flex: 1, height: 8, background: "rgba(0,0,0,0.04)", borderRadius: 4 }}>
                  <div
                    style={{
                      width: `${c.retentionRate}%`,
                      height: "100%",
                      background: c.retentionRate >= 80 ? "#16a34a" : c.retentionRate >= 50 ? "#f59e0b" : "#dc2626",
                      borderRadius: 4,
                    }}
                  />
                </div>
                <span style={{ minWidth: 60, textAlign: "right", fontSize: "var(--text-body-sm)", fontVariantNumeric: "tabular-nums" }}>
                  {c.active}/{c.total} ({c.retentionRate}%)
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
