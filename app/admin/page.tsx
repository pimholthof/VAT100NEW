import { getAdminOverview } from "@/features/admin/actions/users";
import { getSubscriptionAnalytics } from "@/features/admin/actions/analytics";
import { getAdminDashboardData } from "@/features/admin/actions/stats";
import { AdminAlertList } from "@/features/admin/AdminAlertList";
import { AdminQuickActions } from "@/features/admin/AdminQuickActions";
import StrategicBriefing from "@/features/admin/StrategicBriefing";
import Link from "next/link";
import { AdminStatePanel } from "./AdminStatePanel";
import { AdminActivityFeed } from "@/features/admin/AdminActivityFeed";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export default async function AdminDashboardPage() {
  const [overviewResult, analyticsResult, dashboardResult] = await Promise.all([
    getAdminOverview(),
    getSubscriptionAnalytics(),
    getAdminDashboardData(),
  ]);

  if (overviewResult.error || !overviewResult.data) {
    return (
      <AdminStatePanel
        eyebrow="Beheercentrum"
        title="Platformdata kon niet worden geladen"
        description={overviewResult.error ?? "Onbekende fout"}
        actions={[{ href: "/dashboard", label: "Terug naar dashboard", variant: "secondary" }]}
      />
    );
  }

  const { stats } = overviewResult.data;
  const analytics = analyticsResult.data;
  const dashboard = dashboardResult.data;

  return (
    <div className="admin-layout">
      {/* ─── Hero ─── */}
      <section className="admin-hero">
        <div className="admin-hero-copy">
          <p className="label">Beheercentrum</p>
          <h1 className="admin-hero-title">Goedemorgen</h1>
          <p className="admin-hero-description">
            Strategisch overzicht van je platform.
          </p>
          <div className="admin-inline-actions">
            <Link href="/admin/groei" className="admin-button-link">
              Groei bekijken
            </Link>
            <Link href="/admin/klanten" className="admin-button-link admin-button-link-secondary">
              Klanten openen
            </Link>
          </div>
        </div>

        <div className="admin-hero-meta">
          <div className="admin-meta-card">
            <span className="label">MRR</span>
            <p className="admin-meta-value">
              {analytics ? formatCurrency(analytics.mrr) : formatCurrency(0)}
            </p>
            <p className="admin-meta-sub">
              {analytics && analytics.mrrGrowth !== 0
                ? `${analytics.mrrGrowth > 0 ? "+" : ""}${analytics.mrrGrowth}% t.o.v. vorige maand`
                : "Maandelijks terugkerende omzet"}
            </p>
          </div>
          <div className="admin-meta-card">
            <span className="label">Actieve abonnementen</span>
            <p className="admin-meta-value">
              {analytics?.totalActiveSubscriptions ?? stats.activeUsers}
            </p>
            <p className="admin-meta-sub">
              {stats.totalUsers} totale gebruikers op het platform
            </p>
          </div>
          <div className="admin-meta-card">
            <span className="label">Churn rate</span>
            <p className="admin-meta-value">
              {analytics ? `${analytics.churnRate}%` : "\u2014"}
            </p>
            <p className="admin-meta-sub">
              Klantverloop deze maand
            </p>
          </div>
        </div>
      </section>

      {/* ─── Health Pulse ─── */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Link href="/admin/systeem" className="admin-panel" style={{ flex: 1, minWidth: 180, padding: "16px 20px", textDecoration: "none", color: "inherit" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="admin-health-dot" data-status="healthy" />
            <span className="label">Systeem operationeel</span>
          </div>
        </Link>
        <Link href="/admin/klanten/feedback" className="admin-panel" style={{ flex: 1, minWidth: 180, padding: "16px 20px", textDecoration: "none", color: "inherit" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="label">Klant-feedback</span>
          </div>
        </Link>
        <Link href="/admin/klanten/facturen" className="admin-panel" style={{ flex: 1, minWidth: 180, padding: "16px 20px", textDecoration: "none", color: "inherit" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="label">Achterstallige facturen</span>
            <span className="mono-amount" style={{ fontWeight: 600, color: stats.overdueInvoices > 0 ? "var(--color-accent)" : undefined }}>
              {stats.overdueInvoices}
            </span>
          </div>
        </Link>
      </div>

      {/* ─── Alerts + Quick Actions + Briefing ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <section>
          {dashboard && (
            <AdminAlertList alerts={dashboard.alerts} />
          )}
          {!dashboard && (
            <div className="admin-panel">
              <div className="admin-panel-header">
                <p className="label">Geen alertdata beschikbaar</p>
              </div>
            </div>
          )}
        </section>

        <section>
          <AdminQuickActions
            items={[
              { label: "Klanten beoordelen", href: "/admin/klanten", count: stats.usersThisWeek },
              { label: "Pipeline opvolgen", href: "/admin/pipeline", count: stats.waitlistCount },
              { label: "Groei-analyse", href: "/admin/groei" },
              { label: "Financieel overzicht", href: "/admin/financials" },
              { label: "Systeem", href: "/admin/systeem" },
            ]}
          />
        </section>

        <section>
          <StrategicBriefing />
        </section>
      </div>

      {/* ─── Recente activiteit ─── */}
      <AdminActivityFeed />
    </div>
  );
}
