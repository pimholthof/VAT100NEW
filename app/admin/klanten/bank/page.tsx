"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getPlatformBankConnections } from "@/features/admin/actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { AdminStatePanel } from "../../AdminStatePanel";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" }).format(new Date(dateStr));
}

const STATUS_CLASSES: Record<string, string> = {
  active: "admin-badge admin-badge-success",
  pending: "admin-badge admin-badge-warning",
  expired: "admin-badge admin-badge-critical",
  error: "admin-badge admin-badge-critical",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Actief",
  pending: "In afwachting",
  expired: "Verlopen",
  error: "Fout",
};

export default function AdminKlantenBankPage() {
  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-platform-bank"],
    queryFn: getPlatformBankConnections,
  });

  const connections = result?.data?.connections ?? [];
  const stats = result?.data?.stats;

  if (result?.error) {
    return (
      <div className="admin-layout">
        <PageHeader title="Bankkoppelingen" backHref="/admin/klanten" backLabel="Klanten" />
        <AdminStatePanel eyebrow="Bank" title="Kon niet worden geladen" description={result.error} actions={[{ href: "/admin/klanten", label: "Terug", variant: "secondary" }]} />
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <PageHeader title="Bankkoppelingen" backHref="/admin/klanten" backLabel="Klanten" />

      {stats && (
        <div className="admin-stat-grid">
          <StatCard label="Koppelingen" value={String(stats.totalConnections)} numericValue={stats.totalConnections} isCurrency={false} sub={`${stats.activeConnections} actief`} compact />
          <StatCard label="Actief" value={String(stats.activeConnections)} numericValue={stats.activeConnections} isCurrency={false} compact />
          <StatCard label="Verlopen/Fout" value={String(stats.expiredConnections)} numericValue={stats.expiredConnections} isCurrency={false} compact />
          <StatCard label="Transacties" value={String(stats.totalTransactions)} numericValue={stats.totalTransactions} isCurrency={false} compact />
          <StatCard label="Inkomsten" value={formatCurrency(stats.totalIncome)} numericValue={stats.totalIncome} compact />
          <StatCard label="Uitgaven" value={formatCurrency(stats.totalExpenses)} numericValue={stats.totalExpenses} compact />
        </div>
      )}

      {isLoading ? (
        <div className="admin-table-shell"><div className="admin-empty-state">Laden...</div></div>
      ) : connections.length === 0 ? (
        <div className="admin-table-shell"><div className="admin-empty-state">Nog geen bankkoppelingen</div></div>
      ) : (
        <div className="admin-table-shell">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  {["Gebruiker", "Bank", "IBAN", "Status", "Transacties", "Laatst gesynchroniseerd", "Aangesloten"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {connections.map((conn) => (
                  <tr key={conn.id}>
                    <td>
                      <Link href={`/admin/klanten/${conn.user_id}`} className="admin-primary-link">
                        {conn.user_name}
                      </Link>
                    </td>
                    <td>{conn.institution_name}</td>
                    <td className="mono-amount">{conn.iban ?? "\u2014"}</td>
                    <td>
                      <span className={STATUS_CLASSES[conn.status] ?? "admin-badge"}>
                        {STATUS_LABELS[conn.status] ?? conn.status}
                      </span>
                    </td>
                    <td className="mono-amount admin-right">{conn.transaction_count}</td>
                    <td className="label">{conn.last_synced_at ? formatDate(conn.last_synced_at) : "Nooit"}</td>
                    <td className="label">{formatDate(conn.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
