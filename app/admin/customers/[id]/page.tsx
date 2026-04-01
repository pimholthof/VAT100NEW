"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  getCustomerDetail,
  updateCustomerProfile,
  updateInvoiceStatusAsAdmin,
  exportCustomerInvoicesCSV,
  exportCustomerReceiptsCSV,
  suspendUser,
  reactivateUser,
} from "@/features/admin/actions";
import {
  PageHeader,
  StatCard,
  TableWrapper,
  Th,
  Td,
  Input,
  ButtonPrimary,
  ButtonSecondary,
  ErrorMessage,
  ConfirmDialog,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type { InvoiceStatus } from "@/lib/types";

function downloadCSV(csv: string, filename: string) {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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

function EditableField({
  label,
  value,
  fieldKey,
  onSave,
}: {
  label: string;
  value: string | null | undefined;
  fieldKey: string;
  onSave: (key: string, val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  const handleSave = () => {
    onSave(fieldKey, draft);
    setEditing(false);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <span className="label" style={{ display: "block", marginBottom: 4 }}>{label}</span>
      {editing ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{ flex: 1, padding: "8px 12px", fontSize: "var(--text-body-sm)" }}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
          />
          <ButtonPrimary onClick={handleSave} style={{ padding: "8px 16px", fontSize: 9 }}>
            Opslaan
          </ButtonPrimary>
        </div>
      ) : (
        <span
          onClick={() => setEditing(true)}
          style={{
            fontWeight: 500,
            fontSize: "var(--text-body-md)",
            cursor: "pointer",
            borderBottom: "0.5px dashed rgba(0,0,0,0.15)",
            paddingBottom: 2,
          }}
          title="Klik om te bewerken"
        >
          {value || "\u2014"}
        </span>
      )}
    </div>
  );
}

export default function AdminCustomerDetailPage() {
  const params = useParams();
  const userId = params.id as string;
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<"profiel" | "facturen" | "klanten" | "uitgaven">("profiel");
  const [exportingInvoices, setExportingInvoices] = useState(false);
  const [exportingReceipts, setExportingReceipts] = useState(false);

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-customer", userId],
    queryFn: () => getCustomerDetail(userId),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: Record<string, string>) => updateCustomerProfile(userId, data),
    onSuccess: (res) => {
      if (res.error) setActionError(res.error);
      else {
        queryClient.invalidateQueries({ queryKey: ["admin-customer", userId] });
        setActionError(null);
      }
    },
  });

  const updateInvoiceStatusMutation = useMutation({
    mutationFn: ({ invoiceId, status }: { invoiceId: string; status: InvoiceStatus }) =>
      updateInvoiceStatusAsAdmin(invoiceId, status),
    onSuccess: (res) => {
      if (res.error) setActionError(res.error);
      else queryClient.invalidateQueries({ queryKey: ["admin-customer", userId] });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: () => suspendUser(userId),
    onSuccess: (res) => {
      if (res.error) setActionError(res.error);
      else {
        queryClient.invalidateQueries({ queryKey: ["admin-customer", userId] });
        setActionError(null);
      }
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: () => reactivateUser(userId),
    onSuccess: (res) => {
      if (res.error) setActionError(res.error);
      else {
        queryClient.invalidateQueries({ queryKey: ["admin-customer", userId] });
        setActionError(null);
      }
    },
  });

  const handleFieldSave = (key: string, value: string) => {
    updateProfileMutation.mutate({ [key]: value });
  };

  const handleExportInvoices = async () => {
    setExportingInvoices(true);
    const res = await exportCustomerInvoicesCSV(userId);
    if (res.data) downloadCSV(res.data, `facturen-${userId.slice(0, 8)}.csv`);
    setExportingInvoices(false);
  };

  const handleExportReceipts = async () => {
    setExportingReceipts(true);
    const res = await exportCustomerReceiptsCSV(userId);
    if (res.data) downloadCSV(res.data, `uitgaven-${userId.slice(0, 8)}.csv`);
    setExportingReceipts(false);
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Klant laden..." backHref="/admin/customers" backLabel="Klantbeheer" />
        <div className="skeleton" style={{ width: "60%", height: 20, marginBottom: 12 }} />
        <div className="skeleton" style={{ width: "40%", height: 20 }} />
      </div>
    );
  }

  if (result?.error || !result?.data) {
    return (
      <div>
        <PageHeader title="Klant" backHref="/admin/customers" backLabel="Klantbeheer" />
        <ErrorMessage>{result?.error ?? "Niet gevonden"}</ErrorMessage>
      </div>
    );
  }

  const { profile, subscription, stats, invoices, clients, receipts } = result.data;
  const isSuspended = profile.status === "suspended";

  const tabs = [
    { key: "profiel" as const, label: "Profiel" },
    { key: "facturen" as const, label: `Facturen (${stats.totalInvoices})` },
    { key: "klanten" as const, label: `Klanten (${stats.totalClients})` },
    { key: "uitgaven" as const, label: `Uitgaven (${stats.totalReceipts})` },
  ];

  return (
    <div>
      <PageHeader
        title={(profile.full_name as string) || "Naamloos"}
        backHref="/admin/customers"
        backLabel="Klantbeheer"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            {isSuspended ? (
              <ButtonSecondary onClick={() => reactivateMutation.mutate()} disabled={reactivateMutation.isPending}>
                {reactivateMutation.isPending ? "Heractiveren..." : "Heractiveren"}
              </ButtonSecondary>
            ) : (
              <ButtonSecondary
                onClick={() => setShowSuspendConfirm(true)}
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
        open={showSuspendConfirm}
        title="Account blokkeren"
        message="Weet je zeker dat je dit account wilt blokkeren? De klant kan niet meer inloggen."
        confirmLabel="Blokkeren"
        cancelLabel="Annuleren"
        onConfirm={() => { setShowSuspendConfirm(false); suspendMutation.mutate(); }}
        onCancel={() => setShowSuspendConfirm(false)}
      />

      {actionError && <ErrorMessage>{actionError}</ErrorMessage>}

      {/* Abonnement info */}
      {subscription && (
        <div
          style={{
            display: "flex",
            gap: 24,
            marginBottom: 32,
            padding: "16px 20px",
            border: "0.5px solid rgba(0,0,0,0.08)",
            borderRadius: "var(--radius)",
            alignItems: "center",
          }}
        >
          <div>
            <span className="label" style={{ display: "block", marginBottom: 2 }}>Plan</span>
            <span style={{ fontWeight: 600 }}>{subscription.plan_name}</span>
          </div>
          <div>
            <span className="label" style={{ display: "block", marginBottom: 2 }}>Status</span>
            <span style={{ fontWeight: 500, color: subscription.status === "active" ? "var(--color-success)" : "var(--color-accent)" }}>
              {subscription.status === "active" ? "Actief" : subscription.status}
            </span>
          </div>
          {subscription.current_period_end && (
            <div>
              <span className="label" style={{ display: "block", marginBottom: 2 }}>Verlengdatum</span>
              <span style={{ fontWeight: 500 }}>{formatDate(subscription.current_period_end)}</span>
            </div>
          )}
        </div>
      )}

      {/* Statistieken */}
      <div className="stat-cards-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 32 }}>
        <StatCard label="Facturen" value={String(stats.totalInvoices)} numericValue={stats.totalInvoices} isCurrency={false} />
        <StatCard label="Omzet" value={formatCurrency(stats.totalRevenue)} numericValue={stats.totalRevenue} />
        <StatCard label="Openstaand" value={formatCurrency(stats.openAmount)} numericValue={stats.openAmount} sub={`${stats.openInvoices} facturen`} />
        <StatCard label="Klanten" value={String(stats.totalClients)} numericValue={stats.totalClients} isCurrency={false} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "0.5px solid rgba(0,0,0,0.08)", marginBottom: 32 }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="label-strong"
            style={{
              padding: "12px 20px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid var(--color-black)" : "2px solid transparent",
              cursor: "pointer",
              opacity: activeTab === tab.key ? 1 : 0.4,
              transition: "opacity 0.2s ease, border-color 0.2s ease",
              fontSize: 10,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Profiel */}
      {activeTab === "profiel" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 24,
            padding: 28,
            border: "0.5px solid rgba(0,0,0,0.08)",
            borderRadius: "var(--radius)",
          }}
        >
          <EditableField label="Naam" value={profile.full_name as string} fieldKey="full_name" onSave={handleFieldSave} />
          <EditableField label="Studio" value={profile.studio_name as string} fieldKey="studio_name" onSave={handleFieldSave} />
          <div style={{ marginBottom: 16 }}>
            <span className="label" style={{ display: "block", marginBottom: 4 }}>E-mail</span>
            <span style={{ fontWeight: 500, fontSize: "var(--text-body-md)" }}>{profile.email}</span>
          </div>
          <EditableField label="KVK" value={profile.kvk_number as string} fieldKey="kvk_number" onSave={handleFieldSave} />
          <EditableField label="BTW-nummer" value={profile.btw_number as string} fieldKey="btw_number" onSave={handleFieldSave} />
          <EditableField label="IBAN" value={profile.iban as string} fieldKey="iban" onSave={handleFieldSave} />
          <EditableField label="Adres" value={profile.address as string} fieldKey="address" onSave={handleFieldSave} />
          <EditableField label="Stad" value={profile.city as string} fieldKey="city" onSave={handleFieldSave} />
          <EditableField label="Postcode" value={profile.postal_code as string} fieldKey="postal_code" onSave={handleFieldSave} />
          <div style={{ marginBottom: 16 }}>
            <span className="label" style={{ display: "block", marginBottom: 4 }}>Status</span>
            <span style={{ fontWeight: 500, fontSize: "var(--text-body-md)", color: isSuspended ? "var(--color-accent)" : "var(--color-success)" }}>
              {isSuspended ? "Geblokkeerd" : "Actief"}
            </span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <span className="label" style={{ display: "block", marginBottom: 4 }}>Aangemeld</span>
            <span style={{ fontWeight: 500, fontSize: "var(--text-body-md)" }}>
              {formatDate(profile.created_at as string)}
            </span>
          </div>
        </div>
      )}

      {/* Tab: Facturen */}
      {activeTab === "facturen" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <ButtonSecondary onClick={handleExportInvoices} disabled={exportingInvoices}>
              {exportingInvoices ? "Exporteren..." : "Exporteer facturen"}
            </ButtonSecondary>
          </div>
          {invoices.length === 0 ? (
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
                    <Th>Actie</Th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <Td style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{inv.invoice_number}</Td>
                      <Td>{inv.client_name}</Td>
                      <Td><StatusBadge status={inv.status} /></Td>
                      <Td><span className="label">{formatDate(inv.issue_date)}</span></Td>
                      <Td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(inv.total_inc_vat)}</Td>
                      <Td>
                        <select
                          value={inv.status}
                          onChange={(e) => updateInvoiceStatusMutation.mutate({ invoiceId: inv.id, status: e.target.value as InvoiceStatus })}
                          className="label"
                          style={{
                            padding: "4px 8px",
                            border: "0.5px solid rgba(0,0,0,0.1)",
                            borderRadius: 4,
                            background: "transparent",
                            cursor: "pointer",
                            fontSize: 9,
                          }}
                        >
                          <option value="draft">Concept</option>
                          <option value="sent">Verzonden</option>
                          <option value="paid">Betaald</option>
                          <option value="overdue">Te laat</option>
                        </select>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrapper>
          )}
        </div>
      )}

      {/* Tab: Klanten */}
      {activeTab === "klanten" && (
        <div>
          {clients.length === 0 ? (
            <p className="empty-state">Geen klanten</p>
          ) : (
            <TableWrapper>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <Th>Naam</Th>
                    <Th>E-mail</Th>
                    <Th>Stad</Th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id}>
                      <Td style={{ fontWeight: 500 }}>{client.name}</Td>
                      <Td style={{ fontSize: "var(--text-body-sm)" }}>{client.email || "\u2014"}</Td>
                      <Td><span className="label">{client.city || "\u2014"}</span></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrapper>
          )}
        </div>
      )}

      {/* Tab: Uitgaven */}
      {activeTab === "uitgaven" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <ButtonSecondary onClick={handleExportReceipts} disabled={exportingReceipts}>
              {exportingReceipts ? "Exporteren..." : "Exporteer uitgaven"}
            </ButtonSecondary>
          </div>
          {receipts.length === 0 ? (
            <p className="empty-state">Geen uitgaven</p>
          ) : (
            <TableWrapper>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <Th>Leverancier</Th>
                    <Th>Categorie</Th>
                    <Th>Datum</Th>
                    <Th style={{ textAlign: "right" }}>Bedrag incl. BTW</Th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((receipt) => (
                    <tr key={receipt.id}>
                      <Td style={{ fontWeight: 500 }}>{receipt.vendor_name}</Td>
                      <Td><span className="label">{receipt.category || "\u2014"}</span></Td>
                      <Td><span className="label">{formatDate(receipt.receipt_date)}</span></Td>
                      <Td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {formatCurrency(receipt.amount_inc_vat)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrapper>
          )}
        </div>
      )}
    </div>
  );
}
