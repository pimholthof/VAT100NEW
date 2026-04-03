import { getAdminOverview } from "@/features/admin/actions/users";
import { getSubscriptionAnalytics } from "@/features/admin/actions/analytics";
import { getAdminDashboardData } from "@/features/admin/actions/stats";
import { StatCard } from "@/components/ui/StatCard";
import { AdminAlertList } from "@/features/admin/AdminAlertList";
import { AdminQuickActions } from "@/features/admin/AdminQuickActions";
import StrategicBriefing from "@/features/admin/StrategicBriefing";
import RetentionDashboard from "@/features/admin/RetentionDashboard";
import Link from "next/link";
import { AdminStatePanel } from "./AdminStatePanel";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

function getBadgeClass(tone: "neutral" | "success" | "warning" | "critical") {
  return `admin-badge admin-badge-${tone}`;
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
        eyebrow="Command Center"
        title="Platformdata kon niet worden geladen"
        description={overviewResult.error ?? "Onbekende fout"}
        actions={[{ href: "/dashboard", label: "Terug naar dashboard", variant: "secondary" }]}
      />
    );
  }

  const { stats, recentUsers, recentWaitlist } = overviewResult.data;
  const analytics = analyticsResult.data;
  const dashboard = dashboardResult.data;

  return (
    <div className="admin-layout">
      {/* ─── Hero ─── */}
      <section className="admin-hero">
        <div className="admin-hero-copy">
          <p className="label">CEO Command Center</p>
          <h1 className="admin-hero-title">Goedemorgen</h1>
          <p className="admin-hero-description">
            Strategisch overzicht van je platform. KPI&apos;s, alerts, retentie en prognoses in
            een enkele laag.
          </p>
          <div className="admin-inline-actions">
            <Link href="/admin/growth" className="admin-button-link">
              Groei bekijken
            </Link>
            <Link href="/admin/forecast" className="admin-button-link admin-button-link-secondary">
              Prognoses openen
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
              {analytics ? `${analytics.churnRate}%` : "—"}
            </p>
            <p className="admin-meta-sub">
              Klantverloop deze maand
            </p>
          </div>
        </div>
      </section>

      {/* ─── SaaS KPI Strip ─── */}
      <div className="admin-stat-grid">
        <StatCard
          label="MRR"
          value={analytics ? formatCurrency(analytics.mrr) : "—"}
          numericValue={analytics?.mrr ?? 0}
          sub={analytics && analytics.mrrGrowth !== 0
            ? `${analytics.mrrGrowth > 0 ? "+" : ""}${analytics.mrrGrowth}% groei`
            : "Maandelijks terugkerend"}
          compact
        />
        <StatCard
          label="ARR"
          value={analytics ? formatCurrency(analytics.mrr * 12) : "—"}
          numericValue={(analytics?.mrr ?? 0) * 12}
          sub="Jaarlijks terugkerend"
          compact
        />
        <StatCard
          label="ARPU"
          value={analytics ? formatCurrency(analytics.arpu) : "—"}
          numericValue={analytics?.arpu ?? 0}
          sub="Gem. omzet per gebruiker"
          compact
        />
        <StatCard
          label="LTV"
          value={analytics ? formatCurrency(analytics.ltv) : "—"}
          numericValue={analytics?.ltv ?? 0}
          sub="Geschatte levensduurwaarde"
          compact
        />
        <StatCard
          label="Klanten"
          value={String(stats.totalUsers)}
          numericValue={stats.totalUsers}
          isCurrency={false}
          sub={`${stats.newUsersThisMonth} nieuw deze maand`}
          compact
        />
        <StatCard
          label="Platform omzet"
          value={formatCurrency(stats.totalRevenue)}
          numericValue={stats.totalRevenue}
          sub={`${stats.overdueInvoices} facturen achterstallig`}
          compact
        />
      </div>

      {/* ─── Strategische Briefing ─── */}
      <section className="admin-section">
        <StrategicBriefing />
      </section>

      {/* ─── Alerts + Quick Actions ─── */}
      <div className="admin-section-grid">
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
              { label: "Gebruikers beoordelen", href: "/admin/users", count: stats.usersThisWeek },
              { label: "Wachtlijst opvolgen", href: "/admin/pipeline?tab=wachtlijst", count: stats.waitlistCount },
              { label: "Groei-analyse", href: "/admin/growth" },
              { label: "Prognoses bekijken", href: "/admin/forecast" },
              { label: "Pipeline openen", href: "/admin/pipeline" },
              { label: "Instellingen", href: "/admin/settings" },
            ]}
          />
        </section>
      </div>

      {/* ─── Retentie Snapshot ─── */}
      <section className="admin-section">
        <RetentionDashboard />
      </section>

      {/* ─── Recente activiteit ─── */}
      <div className="admin-section-grid">
        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <p className="label">Recente accounts</p>
              <h2 className="admin-panel-title">Laatste klanten</h2>
            </div>
            <Link href="/admin/users" className="admin-button-link admin-button-link-secondary">
              Alles bekijken
            </Link>
          </div>

          {recentUsers.length === 0 ? (
            <div className="admin-empty-state">Nog geen gebruikers beschikbaar.</div>
          ) : (
            <div className="admin-list">
              {recentUsers.map((user) => (
                <Link key={user.id} href={`/admin/users/${user.id}`} className="admin-list-item">
                  <div className="admin-list-content">
                    <p className="admin-list-title">{user.full_name || "Naamloos account"}</p>
                    <p className="admin-list-sub">
                      {user.studio_name || "Geen studionaam"} · aangemaakt op {formatDate(user.created_at)}
                    </p>
                  </div>
                  <span className={getBadgeClass(user.status === "suspended" ? "critical" : "success")}>
                    {user.status === "suspended" ? "Geblokkeerd" : "Actief"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <p className="label">Instroom</p>
              <h2 className="admin-panel-title">Recente wachtlijst</h2>
            </div>
            <Link href="/admin/pipeline?tab=wachtlijst" className="admin-button-link admin-button-link-secondary">
              Open wachtlijst
            </Link>
          </div>

          {recentWaitlist.length === 0 ? (
            <div className="admin-empty-state">Nog geen wachtlijstinschrijvingen beschikbaar.</div>
          ) : (
            <div className="admin-list">
              {recentWaitlist.map((entry) => (
                <Link key={entry.id} href="/admin/pipeline?tab=wachtlijst" className="admin-list-item">
                  <div className="admin-list-content">
                    <p className="admin-list-title">{entry.name || entry.email}</p>
                    <p className="admin-list-sub">
                      {entry.email} · {entry.referral || "Geen bron opgegeven"}
                    </p>
                  </div>
                  <span className={getBadgeClass("neutral")}>{formatDate(entry.created_at)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
