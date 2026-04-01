import { getAdminOverview } from "@/features/admin/actions";
import { StatCard } from "@/components/ui/StatCard";
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
  const result = await getAdminOverview();

  if (result.error || !result.data) {
    return (
      <AdminStatePanel
        eyebrow="Admin overzicht"
        title="Platformdata kon niet worden geladen"
        description={result.error ?? "Onbekende fout"}
        actions={[{ href: "/dashboard", label: "Terug naar dashboard", variant: "secondary" }]}
      />
    );
  }

  const { stats, recentUsers, recentWaitlist } = result.data;
  const attention = [
    {
      title: "Geblokkeerde accounts",
      value: String(stats.suspendedUsers),
      href: "/admin/users",
      tone: stats.suspendedUsers > 0 ? "critical" : "success",
      description:
        stats.suspendedUsers > 0
          ? "Controleer welke accounts handmatige opvolging nodig hebben."
          : "Er staan momenteel geen accounts geblokkeerd.",
    },
    {
      title: "Nieuwe gebruikers deze week",
      value: String(stats.usersThisWeek),
      href: "/admin/users",
      tone: stats.usersThisWeek > 0 ? "warning" : "neutral",
      description:
        stats.usersThisWeek > 0
          ? "Nieuwe aanwas die onboarding en activatie kan gebruiken."
          : "Er zijn deze week nog geen nieuwe accounts aangemaakt.",
    },
    {
      title: "Wachtlijst",
      value: String(stats.waitlistCount),
      href: "/admin/waitlist",
      tone: stats.waitlistCount > 0 ? "warning" : "neutral",
      description:
        stats.waitlistCount > 0
          ? "Nieuwe leads staan klaar voor opvolging of activatie."
          : "Er staan momenteel geen wachtlijstinschrijvingen open.",
    },
    {
      title: "Achterstallige facturen",
      value: String(stats.overdueInvoices),
      href: "/admin/users",
      tone: stats.overdueInvoices > 0 ? "critical" : "success",
      description:
        stats.overdueInvoices > 0
          ? `${formatCurrency(stats.overdueAmount)} aan achterstallige omzet vraagt aandacht.`
          : "Er zijn geen achterstallige facturen op platformniveau.",
    },
  ] as const;

  return (
    <div className="admin-layout">
      <section className="admin-hero">
        <div className="admin-hero-copy">
          <p className="label">Platform command center</p>
          <h1 className="admin-hero-title">Admin overzicht</h1>
          <p className="admin-hero-description">
            Houd gebruikers, omzet, wachtlijst en uitzonderingen in één compacte laag in beeld en schakel direct door naar de juiste actie.
          </p>
          <div className="admin-inline-actions">
            <Link href="/admin/users" className="admin-button-link">
              Gebruikers openen
            </Link>
            <Link href="/admin/waitlist" className="admin-button-link admin-button-link-secondary">
              Wachtlijst bekijken
            </Link>
          </div>
        </div>

        <div className="admin-hero-meta">
          <div className="admin-meta-card">
            <span className="label">Nieuw deze week</span>
            <p className="admin-meta-value">{stats.usersThisWeek}</p>
            <p className="admin-meta-sub">Nieuwe accounts die onboarding of verificatie kunnen vragen.</p>
          </div>
          <div className="admin-meta-card">
            <span className="label">Activiteit 30 dagen</span>
            <p className="admin-meta-value">{stats.activeUsers} / {stats.totalUsers}</p>
            <p className="admin-meta-sub">Aantal gebruikers met recente factuuractiviteit.</p>
          </div>
          <div className="admin-meta-card">
            <span className="label">Platform omzet</span>
            <p className="admin-meta-value">{formatCurrency(stats.totalRevenue)}</p>
            <p className="admin-meta-sub">Totaal betaald door klanten van gebruikers.</p>
          </div>
        </div>
      </section>

      <div className="admin-stat-grid">
        <StatCard
          label="Gebruikers"
          value={String(stats.totalUsers)}
          numericValue={stats.totalUsers}
          isCurrency={false}
          sub={`${stats.newUsersThisMonth} nieuw deze maand`}
          compact
        />
        <StatCard
          label="Actief (30d)"
          value={String(stats.activeUsers)}
          numericValue={stats.activeUsers}
          isCurrency={false}
          sub={`van ${stats.totalUsers} totaal`}
          compact
        />
        <StatCard
          label="Facturen"
          value={String(stats.totalInvoices)}
          numericValue={stats.totalInvoices}
          isCurrency={false}
          sub={`${stats.overdueInvoices} achterstallig`}
          compact
        />
        <StatCard
          label="Platform Omzet"
          value={formatCurrency(stats.totalRevenue)}
          numericValue={stats.totalRevenue}
          sub="Totaal betaald door klanten van gebruikers"
          compact
        />
      </div>

      <div className="admin-section-grid">
        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <p className="label">Vereist aandacht</p>
              <h2 className="admin-panel-title">Belangrijkste signalen</h2>
              <p className="admin-panel-description">
                Prioriteer uitzonderingen en instroom zonder eerst door lijsten te hoeven klikken.
              </p>
            </div>
          </div>

          <div className="admin-signal-list">
            {attention.map((item) => (
              <Link key={item.title} href={item.href} className="admin-signal-item">
                <div className="admin-signal-content">
                  <div className="admin-inline-actions">
                    <h3 className="admin-signal-title">{item.title}</h3>
                    <span className={getBadgeClass(item.tone)}>{item.value}</span>
                  </div>
                  <p className="admin-signal-sub">{item.description}</p>
                </div>
                <p className="admin-signal-value">{item.value}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <p className="label">Snelle acties</p>
              <h2 className="admin-panel-title">Direct uitvoeren</h2>
              <p className="admin-panel-description">
                Sla tussenlagen over en ga meteen naar de plek waar je moet zijn.
              </p>
            </div>
          </div>

          <div className="admin-action-grid">
            <Link href="/admin/users" className="admin-action-card">
              <p className="admin-action-card-title">Gebruikers beoordelen</p>
              <p className="admin-action-card-copy">Bekijk de nieuwste accounts, status en omzet per gebruiker.</p>
              <span className="admin-action-card-meta">Open gebruikers</span>
            </Link>
            <Link href="/admin/waitlist" className="admin-action-card">
              <p className="admin-action-card-title">Wachtlijst opvolgen</p>
              <p className="admin-action-card-copy">Werk nieuwe leads of aanvragen af vanuit één compacte lijst.</p>
              <span className="admin-action-card-meta">{stats.waitlistCount} open</span>
            </Link>
            <Link href="/dashboard" className="admin-action-card">
              <p className="admin-action-card-title">Terug naar product</p>
              <p className="admin-action-card-copy">Schakel terug naar het hoofd-dashboard van het account.</p>
              <span className="admin-action-card-meta">Dashboard</span>
            </Link>
            <Link href="/admin/users" className="admin-action-card">
              <p className="admin-action-card-title">Accounts met risico</p>
              <p className="admin-action-card-copy">Loop geblokkeerde of financieel gevoelige accounts systematisch na.</p>
              <span className="admin-action-card-meta">{stats.suspendedUsers} geblokkeerd</span>
            </Link>
          </div>
        </section>
      </div>

      <div className="admin-section-grid">
        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <p className="label">Recente accounts</p>
              <h2 className="admin-panel-title">Laatste gebruikers</h2>
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
            <Link href="/admin/waitlist" className="admin-button-link admin-button-link-secondary">
              Open wachtlijst
            </Link>
          </div>

          {recentWaitlist.length === 0 ? (
            <div className="admin-empty-state">Nog geen wachtlijstinschrijvingen beschikbaar.</div>
          ) : (
            <div className="admin-list">
              {recentWaitlist.map((entry) => (
                <Link key={entry.id} href="/admin/waitlist" className="admin-list-item">
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
