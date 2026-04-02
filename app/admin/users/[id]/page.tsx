"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  getUserDetail,
  suspendUser,
  reactivateUser,
} from "@/features/admin/actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { AdminStatePanel } from "../../AdminStatePanel";
import { formatCurrency } from "@/lib/format";

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

function StatusLabel({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="admin-kv-item">
      <span className="admin-kv-label">{label}</span>
      <p className="admin-kv-value">{value || "—"}</p>
    </div>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const classNames: Record<string, string> = {
    draft: "admin-badge admin-badge-neutral",
    sent: "admin-badge admin-badge-neutral",
    paid: "admin-badge admin-badge-success",
    overdue: "admin-badge admin-badge-critical",
  };
  const labels: Record<string, string> = {
    draft: "Concept",
    sent: "Verzonden",
    paid: "Betaald",
    overdue: "Te laat",
  };

  return (
    <span className={classNames[status] ?? "admin-badge admin-badge-neutral"}>
      {labels[status] ?? status}
    </span>
  );
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params.id as string;
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => getUserDetail(userId),
  });

  const suspendMutation = useMutation({
    mutationFn: () => suspendUser(userId),
    onSuccess: (res) => {
      if (res.error) {
        setActionError(res.error);
      } else {
        queryClient.invalidateQueries({ queryKey: ["admin-user", userId] });
        setActionError(null);
      }
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: () => reactivateUser(userId),
    onSuccess: (res) => {
      if (res.error) {
        setActionError(res.error);
      } else {
        queryClient.invalidateQueries({ queryKey: ["admin-user", userId] });
        setActionError(null);
      }
    },
  });

  if (isLoading) {
    return (
      <div className="admin-layout">
        <PageHeader title="Gebruiker laden..." backHref="/admin/users" backLabel="Gebruikers" />
        <div className="admin-table-shell">
          <div className="admin-empty-state">Gebruiker laden...</div>
        </div>
      </div>
    );
  }

  if (result?.error || !result?.data) {
    return (
      <div className="admin-layout">
        <PageHeader title="Gebruiker" backHref="/admin/users" backLabel="Gebruikers" />
        <AdminStatePanel
          eyebrow="Gebruiker"
          title="Gebruiker kon niet worden geladen"
          description={result?.error ?? "Niet gevonden"}
          actions={[{ href: "/admin/users", label: "Terug naar gebruikers", variant: "secondary" }]}
        />
      </div>
    );
  }

  const { profile, stats, recentInvoices } = result.data;
  const isSuspended = profile.status === "suspended";

  return (
    <div className="admin-layout">
      <PageHeader
        title={profile.full_name || "Naamloos"}
        backHref="/admin/users"
        backLabel="Gebruikers"
        action={
          <div className="admin-inline-actions">
            <span className={`admin-badge ${isSuspended ? "admin-badge-critical" : "admin-badge-success"}`}>
              {isSuspended ? "Geblokkeerd" : "Actief"}
            </span>
            {isSuspended ? (
              <button
                onClick={() => reactivateMutation.mutate()}
                disabled={reactivateMutation.isPending}
                className="admin-page-button"
              >
                {reactivateMutation.isPending
                  ? "Heractiveren..."
                  : "Heractiveren"}
              </button>
            ) : (
              <button
                onClick={() => {
                  if (confirm("Weet je zeker dat je dit account wilt blokkeren?")) {
                    suspendMutation.mutate();
                  }
                }}
                disabled={suspendMutation.isPending}
                className="admin-page-button admin-page-button-danger"
              >
                {suspendMutation.isPending ? "Blokkeren..." : "Blokkeren"}
              </button>
            )}
          </div>
        }
      />

      {actionError && (
        <p className="admin-error-text">
          {actionError}
        </p>
      )}

      {/* Profile info */}
      <div className="admin-kv-grid">
        <StatusLabel label="E-mail" value={profile.email} />
        <StatusLabel label="Studio" value={profile.studio_name} />
        <StatusLabel label="KVK" value={profile.kvk_number} />
        <StatusLabel label="BTW" value={profile.btw_number} />
        <StatusLabel label="IBAN" value={profile.iban} />
        <StatusLabel label="Status" value={isSuspended ? "Geblokkeerd" : "Actief"} />
        <StatusLabel label="Aangemeld" value={formatDate(profile.created_at)} />
        <StatusLabel label="Stad" value={profile.city} />
      </div>

      {/* Stats */}
      <h2
        className="label"
        style={{ marginBottom: 4 }}
      >
        Statistieken
      </h2>
      <div className="admin-stat-grid">
        <StatCard
          label="Facturen"
          value={String(stats.totalInvoices)}
          numericValue={stats.totalInvoices}
          isCurrency={false}
          compact
        />
        <StatCard
          label="Omzet"
          value={formatCurrency(stats.totalRevenue)}
          numericValue={stats.totalRevenue}
          compact
        />
        <StatCard
          label="Openstaand"
          value={formatCurrency(stats.openAmount)}
          numericValue={stats.openAmount}
          sub={`${stats.openInvoices} facturen`}
          compact
        />
        <StatCard
          label="Klanten"
          value={String(stats.totalClients)}
          numericValue={stats.totalClients}
          isCurrency={false}
          compact
        />
      </div>

      {/* Recent Invoices */}
      <h2
        className="label"
        style={{ marginBottom: 4 }}
      >
        Recente facturen
      </h2>

      {recentInvoices.length === 0 ? (
        <div className="admin-table-shell">
          <div className="admin-empty-state">Geen facturen</div>
        </div>
      ) : (
        <div className="admin-table-shell">
          <div className="admin-table-wrap">
            <table className="admin-table">
            <thead>
              <tr>
                {["Nummer", "Klant", "Status", "Datum", "Bedrag"].map(
                  (header) => (
                    <th key={header}>
                      {header}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {recentInvoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="mono-amount">
                    {inv.invoice_number}
                  </td>
                  <td>{inv.client_name}</td>
                  <td>
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td className="label">
                    {formatDate(inv.issue_date)}
                  </td>
                  <td className="mono-amount admin-right">
                    {formatCurrency(inv.total_inc_vat)}
                  </td>
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
