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
          <p className="admin-hero-description">Strategisch overzicht van je platform.</p>
          <div className="admin-inline-actions">
            <Link href="/admin/groei" className="admin-button-link">Groei bekijken</Link>
            <Link href="/admin/klanten" className="admin-button-link admin-button-link-secondary">Klanten openen</Link>
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
            <p className="admin-meta-sub">{stats.totalUsers} totale gebruikers</p>
          </div>
          <div className="admin-meta-card">
            <span className="label">Churn rate</span>
            <p className="admin-meta-value">
              {analytics ? `${analytics.churnRate}%` : "—"}
            </p>
            <p className="admin-meta-sub">Klantverloop deze maand</p>
          </div>
        </div>
      </section>

      {/* ─── Health Strip ─── */}
      <div className="admin-health-strip">
        <Link href="/admin/systeem" className="admin-health-strip-item">
          <span className="admin-health-dot" data-status="healthy" />
          <span className="label">Systeem operationeel</span>
        </Link>
        <Link href="/admin/klanten/feedback" className="admin-health-strip-item">
          <span className="label">Klant-feedback</span>
        </Link>
        <Link href="/admin/klanten/facturen" className="admin-health-strip-item">
          <span className="label">Achterstallige facturen</span>
          {stats.overdueInvoices > 0 && (
            <span className="admin-badge admin-badge-critical">{stats.overdueInvoices}</span>
          )}
        </Link>
      </div>

      {/* ─── Alerts + Quick Actions + Briefing ─── */}
      <div className="admin-col-3">
        {dashboard
          ? <AdminAlertList alerts={dashboard.alerts} />
          : <div className="admin-panel"><div className="admin-panel-header"><p className="label">Geen alertdata</p></div></div>
        }
        <AdminQuickActions
          items={[
            { label: "Klanten beoordelen", href: "/admin/klanten", count: stats.usersThisWeek },
            { label: "Pipeline opvolgen", href: "/admin/pipeline", count: stats.waitlistCount },
            { label: "Groei-analyse", href: "/admin/groei" },
            { label: "Financieel overzicht", href: "/admin/financials" },
            { label: "Systeem", href: "/admin/systeem" },
          ]}
        />
        <StrategicBriefing />
      </div>

      {/* ─── Recente activiteit ─── */}
      <AdminActivityFeed />
    </div>
  );
}
