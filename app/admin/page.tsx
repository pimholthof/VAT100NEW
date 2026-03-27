import { getPlatformStats, getWaitlistCount } from "@/features/admin/actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import Link from "next/link";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export default async function AdminDashboardPage() {
  const [result, waitlistResult] = await Promise.all([
    getPlatformStats(),
    getWaitlistCount(),
  ]);

  if (result.error || !result.data) {
    return (
      <div>
        <PageHeader title="Platform Beheer" />
        <p style={{ opacity: 0.5 }}>
          Fout bij laden: {result.error ?? "Onbekende fout"}
        </p>
      </div>
    );
  }

  const stats = result.data;
  const waitlistCount = waitlistResult.data ?? 0;

  return (
    <div>
      <PageHeader
        title="Platform Beheer"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              href="/admin/waitlist"
              className="label-strong"
              style={{
                padding: "12px 24px",
                border: "var(--border-light)",
                textDecoration: "none",
                color: "var(--foreground)",
              }}
            >
              Wachtlijst ({waitlistCount})
            </Link>
            <Link
              href="/admin/users"
              className="label-strong"
              style={{
                padding: "12px 24px",
                border: "var(--border-light)",
                textDecoration: "none",
                color: "var(--foreground)",
              }}
            >
              Alle gebruikers &rarr;
            </Link>
          </div>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 1,
          border: "var(--border-light)",
        }}
      >
        <StatCard
          label="Gebruikers"
          value={String(stats.totalUsers)}
          numericValue={stats.totalUsers}
          isCurrency={false}
          sub={`${stats.newUsersThisMonth} nieuw deze maand`}
        />
        <StatCard
          label="Actief (30d)"
          value={String(stats.activeUsers)}
          numericValue={stats.activeUsers}
          isCurrency={false}
          sub={`van ${stats.totalUsers} totaal`}
        />
        <StatCard
          label="Facturen"
          value={String(stats.totalInvoices)}
          numericValue={stats.totalInvoices}
          isCurrency={false}
        />
        <StatCard
          label="Platform Omzet"
          value={formatCurrency(stats.totalRevenue)}
          numericValue={stats.totalRevenue}
          sub="Totaal betaald door klanten van gebruikers"
        />
      </div>
    </div>
  );
}
