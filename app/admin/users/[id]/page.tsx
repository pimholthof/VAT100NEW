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

function StatusLabel({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <span
        className="label"
        style={{ opacity: 0.4, display: "block", marginBottom: 4, fontSize: 10 }}
      >
        {label}
      </span>
      <span style={{ fontWeight: 500 }}>{value || "—"}</span>
    </div>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "rgba(0,0,0,0.06)",
    sent: "rgba(59,130,246,0.1)",
    paid: "rgba(34,197,94,0.1)",
    overdue: "rgba(220,38,38,0.1)",
  };
  const textColors: Record<string, string> = {
    draft: "var(--foreground)",
    sent: "rgb(59,130,246)",
    paid: "rgb(34,197,94)",
    overdue: "rgb(220,38,38)",
  };
  const labels: Record<string, string> = {
    draft: "Concept",
    sent: "Verzonden",
    paid: "Betaald",
    overdue: "Te laat",
  };

  return (
    <span
      className="label"
      style={{
        padding: "2px 8px",
        fontSize: 9,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        background: colors[status] ?? "rgba(0,0,0,0.04)",
        color: textColors[status] ?? "var(--foreground)",
      }}
    >
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
      <div>
        <PageHeader title="Gebruiker laden..." backHref="/admin/users" backLabel="Gebruikers" />
        <p className="label" style={{ opacity: 0.3 }}>Laden...</p>
      </div>
    );
  }

  if (result?.error || !result?.data) {
    return (
      <div>
        <PageHeader title="Gebruiker" backHref="/admin/users" backLabel="Gebruikers" />
        <p style={{ opacity: 0.5 }}>{result?.error ?? "Niet gevonden"}</p>
      </div>
    );
  }

  const { profile, stats, recentInvoices } = result.data;
  const isSuspended = profile.status === "suspended";

  return (
    <div>
      <PageHeader
        title={profile.full_name || "Naamloos"}
        backHref="/admin/users"
        backLabel="Gebruikers"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            {isSuspended ? (
              <button
                onClick={() => reactivateMutation.mutate()}
                disabled={reactivateMutation.isPending}
                className="label-strong"
                style={{
                  padding: "10px 20px",
                  border: "var(--border-light)",
                  background: "transparent",
                  cursor: "pointer",
                }}
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
                className="label-strong"
                style={{
                  padding: "10px 20px",
                  border: "1px solid rgba(220,38,38,0.3)",
                  background: "transparent",
                  color: "rgb(220,38,38)",
                  cursor: "pointer",
                }}
              >
                {suspendMutation.isPending ? "Blokkeren..." : "Blokkeren"}
              </button>
            )}
          </div>
        }
      />

      {actionError && (
        <p
          style={{
            color: "rgb(220,38,38)",
            marginBottom: 24,
            fontSize: "var(--text-body)",
          }}
        >
          {actionError}
        </p>
      )}

      {/* Profile info */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 24,
          marginBottom: 48,
          padding: 28,
          border: "var(--border-light)",
        }}
      >
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
        style={{
          marginBottom: 16,
          opacity: 0.4,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        Statistieken
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 1,
          border: "var(--border-light)",
          marginBottom: 48,
        }}
      >
        <StatCard
          label="Facturen"
          value={String(stats.totalInvoices)}
          numericValue={stats.totalInvoices}
          isCurrency={false}
        />
        <StatCard
          label="Omzet"
          value={formatCurrency(stats.totalRevenue)}
          numericValue={stats.totalRevenue}
        />
        <StatCard
          label="Openstaand"
          value={formatCurrency(stats.openAmount)}
          numericValue={stats.openAmount}
          sub={`${stats.openInvoices} facturen`}
        />
        <StatCard
          label="Klanten"
          value={String(stats.totalClients)}
          numericValue={stats.totalClients}
          isCurrency={false}
        />
      </div>

      {/* Recent Invoices */}
      <h2
        className="label"
        style={{
          marginBottom: 16,
          opacity: 0.4,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        Recente facturen
      </h2>

      {recentInvoices.length === 0 ? (
        <p className="label" style={{ opacity: 0.3 }}>
          Geen facturen
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Nummer", "Klant", "Status", "Datum", "Bedrag"].map(
                  (header) => (
                    <th
                      key={header}
                      className="label"
                      style={{
                        textAlign: "left",
                        padding: "12px 16px",
                        borderBottom: "var(--border-light)",
                        opacity: 0.4,
                        fontWeight: 500,
                        fontSize: 10,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      {header}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {recentInvoices.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: "var(--border-light)" }}>
                  <td
                    className="mono-amount"
                    style={{ padding: "14px 16px", fontWeight: 500 }}
                  >
                    {inv.invoice_number}
                  </td>
                  <td style={{ padding: "14px 16px" }}>{inv.client_name}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td className="label" style={{ padding: "14px 16px", opacity: 0.5 }}>
                    {formatDate(inv.issue_date)}
                  </td>
                  <td
                    className="mono-amount"
                    style={{ padding: "14px 16px", textAlign: "right" }}
                  >
                    {formatCurrency(inv.total_inc_vat)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
