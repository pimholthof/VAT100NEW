"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  getUserDetail,
  suspendUser,
  reactivateUser,
} from "@/features/admin/actions";
import {
  PageHeader,
  StatCard,
  TableWrapper,
  Th,
  Td,
  ButtonSecondary,
  ErrorMessage,
  ConfirmDialog,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { className: string; label: string }> = {
    draft: { className: "status-badge--draft", label: "Concept" },
    sent: { className: "status-badge--sent", label: "Verzonden" },
    paid: { className: "status-badge--paid", label: "Betaald" },
    overdue: { className: "status-badge--overdue", label: "Te laat" },
  };
  const badge = map[status] ?? { className: "status-badge--draft", label: status };
  return <span className={`status-badge ${badge.className}`}>{badge.label}</span>;
}

function ProfileField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <span className="label" style={{ display: "block", marginBottom: 4 }}>
        {label}
      </span>
      <span style={{ fontWeight: 500, fontSize: "var(--text-body-md)" }}>
        {value || "\u2014"}
      </span>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params.id as string;
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

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
        <div className="skeleton" style={{ width: "60%", height: 20, marginBottom: 12 }} />
        <div className="skeleton" style={{ width: "40%", height: 20 }} />
      </div>
    );
  }

  if (result?.error || !result?.data) {
    return (
      <div>
        <PageHeader title="Gebruiker" backHref="/admin/users" backLabel="Gebruikers" />
        <ErrorMessage>{result?.error ?? "Niet gevonden"}</ErrorMessage>
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
              <ButtonSecondary
                onClick={() => reactivateMutation.mutate()}
                disabled={reactivateMutation.isPending}
              >
                {reactivateMutation.isPending ? "Heractiveren..." : "Heractiveren"}
              </ButtonSecondary>
            ) : (
              <ButtonSecondary
                onClick={() => setShowConfirm(true)}
                disabled={suspendMutation.isPending}
                style={{ borderColor: "rgba(165,28,48,0.3)", color: "var(--color-accent)" }}
              >
                {suspendMutation.isPending ? "Blokkeren..." : "Blokkeren"}
              </ButtonSecondary>
            )}
          </div>
        }
      />

      <ConfirmDialog
        open={showConfirm}
        title="Account blokkeren"
        message="Weet je zeker dat je dit account wilt blokkeren? De gebruiker kan niet meer inloggen."
        confirmLabel="Blokkeren"
        cancelLabel="Annuleren"
        onConfirm={() => {
          setShowConfirm(false);
          suspendMutation.mutate();
        }}
        onCancel={() => setShowConfirm(false)}
      />

      {actionError && <ErrorMessage>{actionError}</ErrorMessage>}

      {/* Profiel */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 24,
          marginBottom: 48,
          padding: 28,
          border: "0.5px solid rgba(0,0,0,0.08)",
          borderRadius: "var(--radius)",
        }}
      >
        <ProfileField label="E-mail" value={profile.email} />
        <ProfileField label="Studio" value={profile.studio_name} />
        <ProfileField label="KVK" value={profile.kvk_number} />
        <ProfileField label="BTW" value={profile.btw_number} />
        <ProfileField label="IBAN" value={profile.iban} />
        <ProfileField label="Status" value={isSuspended ? "Geblokkeerd" : "Actief"} />
        <ProfileField label="Aangemeld" value={formatDate(profile.created_at)} />
        <ProfileField label="Stad" value={profile.city} />
      </div>

      {/* Statistieken */}
      <h2 className="label" style={{ marginBottom: 16 }}>Statistieken</h2>
      <div
        className="stat-cards-grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: 48 }}
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

      {/* Recente facturen */}
      <h2 className="label" style={{ marginBottom: 16 }}>Recente facturen</h2>

      {recentInvoices.length === 0 ? (
        <p className="empty-state">Geen facturen</p>
      ) : (
        <TableWrapper>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>Nummer</Th>
                <Th>Klant</Th>
                <Th>Status</Th>
                <Th>Datum</Th>
                <Th style={{ textAlign: "right" }}>Bedrag</Th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.map((inv) => (
                <tr key={inv.id}>
                  <Td style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                    {inv.invoice_number}
                  </Td>
                  <Td>{inv.client_name}</Td>
                  <Td><StatusBadge status={inv.status} /></Td>
                  <Td><span className="label">{formatDate(inv.issue_date)}</span></Td>
                  <Td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(inv.total_inc_vat)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrapper>
      )}
    </div>
  );
}
