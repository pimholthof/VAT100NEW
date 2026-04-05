"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  getUserDetail,
  suspendUser,
  reactivateUser,
  updateCustomerProfile,
  updateInvoiceStatusAsAdmin,
  deleteInvoiceAsAdmin,
  deleteClientAsAdmin,
  deleteReceiptAsAdmin,
} from "@/features/admin/actions";
import { getCustomerBenchmarks } from "@/features/admin/actions/customers";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { AdminStatePanel } from "../../AdminStatePanel";
import type { InvoiceStatus } from "@/lib/types";

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

function EditableField({
  label,
  value,
  fieldKey,
  onSave,
  isSaving,
}: {
  label: string;
  value: string | null;
  fieldKey: string;
  onSave: (key: string, val: string) => void;
  isSaving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  if (editing) {
    return (
      <div className="admin-kv-item">
        <span className="admin-kv-label">{label}</span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="admin-field"
            style={{ minHeight: 32, minWidth: 0, flex: 1, padding: "0 8px", fontSize: 13 }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSave(fieldKey, draft);
                setEditing(false);
              }
              if (e.key === "Escape") setEditing(false);
            }}
          />
          <button
            onClick={() => { onSave(fieldKey, draft); setEditing(false); }}
            disabled={isSaving}
            className="admin-page-button"
            style={{ minHeight: 32, padding: "0 8px", fontSize: 9 }}
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-kv-item" style={{ cursor: "pointer" }} onClick={() => { setDraft(value ?? ""); setEditing(true); }}>
      <span className="admin-kv-label">{label}</span>
      <p className="admin-kv-value" style={{ borderBottom: "1px dashed rgba(0,0,0,0.15)" }}>
        {value || "\u2014"}
      </p>
    </div>
  );
}

function CompletionDot({ complete }: { complete: boolean }) {
  return (
    <span
      className="admin-health-dot"
      data-status={complete ? "healthy" : "down"}
      style={{ width: 8, height: 8, flexShrink: 0 }}
    />
  );
}

function BenchmarkBar({ label, value, avg, unit }: { label: string; value: number; avg: number; unit: string }) {
  const ratio = avg > 0 ? value / avg : 0;
  const pct = Math.min(Math.max(ratio * 50, 4), 100);
  const avgPct = 50;
  const isAbove = ratio > 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="label">{label}</span>
        <span className="mono-amount" style={{ fontSize: 12, fontWeight: 500 }}>
          {unit === "EUR" ? formatCurrency(value) : `${value.toFixed(1)}${unit}`}
        </span>
      </div>
      <div style={{ position: "relative", height: 6, background: "rgba(0,0,0,0.04)", borderRadius: 3 }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${pct}%`,
            background: isAbove ? "var(--color-success, #1a7a3a)" : "rgba(0,0,0,0.2)",
            borderRadius: 3,
            transition: "width 0.3s",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${avgPct}%`,
            top: -2,
            width: 1,
            height: 10,
            background: "rgba(0,0,0,0.3)",
          }}
          title={`Platformgemiddelde: ${unit === "EUR" ? formatCurrency(avg) : `${avg.toFixed(1)}${unit}`}`}
        />
      </div>
      <span className="label" style={{ fontSize: 9, opacity: 0.5 }}>
        Platform gem: {unit === "EUR" ? formatCurrency(avg) : `${avg.toFixed(1)}${unit}`}
      </span>
    </div>
  );
}

export default function AdminKlantDetailPage() {
  const params = useParams();
  const userId = params.id as string;
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"facturen" | "klanten" | "bonnen">("facturen");

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => getUserDetail(userId),
  });

  const { data: benchmarkResult } = useQuery({
    queryKey: ["admin-customer-benchmarks", userId],
    queryFn: () => getCustomerBenchmarks(userId),
    enabled: !!result?.data,
    staleTime: 3600000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-user", userId] });

  const suspendMutation = useMutation({
    mutationFn: () => suspendUser(userId),
    onSuccess: (res) => { if (res.error) setActionError(res.error); else { invalidate(); setActionError(null); } },
  });

  const reactivateMutation = useMutation({
    mutationFn: () => reactivateUser(userId),
    onSuccess: (res) => { if (res.error) setActionError(res.error); else { invalidate(); setActionError(null); } },
  });

  const profileMutation = useMutation({
    mutationFn: (data: Record<string, string>) => updateCustomerProfile(userId, data),
    onSuccess: (res) => { if (res.error) setActionError(res.error); else { invalidate(); setActionError(null); } },
  });

  const invoiceStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) => updateInvoiceStatusAsAdmin(id, status),
    onSuccess: (res) => { if (res.error) setActionError(res.error); else { invalidate(); setActionError(null); } },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: (id: string) => deleteInvoiceAsAdmin(id),
    onSuccess: (res) => { if (res.error) setActionError(res.error); else { invalidate(); setActionError(null); } },
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id: string) => deleteClientAsAdmin(id),
    onSuccess: (res) => { if (res.error) setActionError(res.error); else { invalidate(); setActionError(null); } },
  });

  const deleteReceiptMutation = useMutation({
    mutationFn: (id: string) => deleteReceiptAsAdmin(id),
    onSuccess: (res) => { if (res.error) setActionError(res.error); else { invalidate(); setActionError(null); } },
  });

  if (isLoading) {
    return (
      <div className="admin-layout">
        <PageHeader title="Laden..." backHref="/admin/klanten" backLabel="Klanten" />
        <div className="admin-table-shell"><div className="admin-empty-state">Klant laden...</div></div>
      </div>
    );
  }

  if (result?.error || !result?.data) {
    return (
      <div className="admin-layout">
        <PageHeader title="Klant" backHref="/admin/klanten" backLabel="Klanten" />
        <AdminStatePanel
          eyebrow="Klant"
          title="Niet gevonden"
          description={result?.error ?? "Niet gevonden"}
          actions={[{ href: "/admin/klanten", label: "Terug", variant: "secondary" }]}
        />
      </div>
    );
  }

  const { profile, stats, recentInvoices, clients, receipts } = result.data;
  const isSuspended = profile.status === "suspended";
  const benchmarks = benchmarkResult?.data ?? null;

  const handleProfileSave = (key: string, value: string) => {
    profileMutation.mutate({ [key]: value });
  };

  // Administratie-completheid
  const p = profile as unknown as Record<string, unknown>;
  const profileFields = {
    "KVK": !!p.kvk_number,
    "BTW-nr": !!p.btw_number,
    "IBAN": !!p.iban,
    "Adres": !!p.address,
    "Postcode": !!p.postal_code,
    "Stad": !!p.city,
  };
  const completedFields = Object.values(profileFields).filter(Boolean).length;
  const totalFields = Object.keys(profileFields).length;
  const completionPct = Math.round((completedFields / totalFields) * 100);

  const tabs = [
    { key: "facturen" as const, label: "Facturen", count: stats.totalInvoices },
    { key: "klanten" as const, label: "Klanten", count: stats.totalClients },
    { key: "bonnen" as const, label: "Bonnen", count: stats.totalReceipts },
  ];

  return (
    <div className="admin-layout" style={{ gap: 16 }}>
      <PageHeader
        title={profile.full_name || "Naamloos"}
        backHref="/admin/klanten"
        backLabel="Klanten"
        action={
          <div className="admin-inline-actions">
            <span className={`admin-badge ${isSuspended ? "admin-badge-critical" : "admin-badge-success"}`}>
              {isSuspended ? "Geblokkeerd" : "Actief"}
            </span>
            {isSuspended ? (
              <button onClick={() => reactivateMutation.mutate()} disabled={reactivateMutation.isPending} className="admin-page-button">
                {reactivateMutation.isPending ? "Heractiveren..." : "Heractiveren"}
              </button>
            ) : (
              <button
                onClick={() => { if (confirm("Account blokkeren?")) suspendMutation.mutate(); }}
                disabled={suspendMutation.isPending}
                className="admin-page-button admin-page-button-danger"
              >
                {suspendMutation.isPending ? "Blokkeren..." : "Blokkeren"}
              </button>
            )}
          </div>
        }
      />

      {actionError && <p className="admin-error-text">{actionError}</p>}

      {/* ─── Klantinzicht: Benchmarks & Administratie ─── */}
      <div className="admin-section-grid">
        {/* Administratie-completheid */}
        <div className="admin-panel" style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <p className="label" style={{ marginBottom: 4 }}>Administratie</p>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
              Completheid: {completionPct}%
            </h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
            {Object.entries(profileFields).map(([field, complete]) => (
              <div key={field} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CompletionDot complete={complete} />
                <span className="label" style={{ opacity: complete ? 1 : 0.4 }}>{field}</span>
              </div>
            ))}
          </div>
          {benchmarks && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "0.5px solid rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <CompletionDot complete={benchmarks.hasBankConnection} />
                <span className="label" style={{ opacity: benchmarks.hasBankConnection ? 1 : 0.4 }}>Bank gekoppeld</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CompletionDot complete={benchmarks.hasHoursLogged} />
                <span className="label" style={{ opacity: benchmarks.hasHoursLogged ? 1 : 0.4 }}>Uren geregistreerd</span>
              </div>
            </div>
          )}
        </div>

        {/* Benchmarks vs Platform */}
        <div className="admin-panel" style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <p className="label" style={{ marginBottom: 4 }}>Benchmarks</p>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>vs. platformgemiddelde</h3>
          </div>
          {benchmarks ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <BenchmarkBar
                label="Gem. factuurbedrag"
                value={benchmarks.avgInvoiceAmount}
                avg={benchmarks.platform.avgInvoiceAmount}
                unit="EUR"
              />
              <BenchmarkBar
                label="Gem. betalingstermijn"
                value={benchmarks.avgPaymentDays}
                avg={benchmarks.platform.avgPaymentDays}
                unit=" dagen"
              />
              <BenchmarkBar
                label="Actieve klanten"
                value={benchmarks.clientCount}
                avg={benchmarks.platform.avgClientCount}
                unit=""
              />
              <BenchmarkBar
                label="Kosten-ratio"
                value={benchmarks.expenseRatio * 100}
                avg={benchmarks.platform.avgExpenseRatio * 100}
                unit="%"
              />
            </div>
          ) : (
            <div className="admin-empty-state">Benchmarks laden...</div>
          )}
        </div>
      </div>

      {/* Profile + Stats side by side */}
      <div className="admin-section-grid">
        <div className="admin-kv-grid" style={{ padding: 16, gap: "12px 16px" }}>
          <EditableField label="Naam" value={profile.full_name} fieldKey="full_name" onSave={handleProfileSave} isSaving={profileMutation.isPending} />
          <EditableField label="E-mail" value={profile.email} fieldKey="email" onSave={handleProfileSave} isSaving={profileMutation.isPending} />
          <EditableField label="Studio" value={profile.studio_name} fieldKey="studio_name" onSave={handleProfileSave} isSaving={profileMutation.isPending} />
          <EditableField label="KVK" value={profile.kvk_number} fieldKey="kvk_number" onSave={handleProfileSave} isSaving={profileMutation.isPending} />
          <EditableField label="BTW" value={profile.btw_number} fieldKey="btw_number" onSave={handleProfileSave} isSaving={profileMutation.isPending} />
          <EditableField label="IBAN" value={profile.iban} fieldKey="iban" onSave={handleProfileSave} isSaving={profileMutation.isPending} />
          <EditableField label="Adres" value={profile.address} fieldKey="address" onSave={handleProfileSave} isSaving={profileMutation.isPending} />
          <EditableField label="Postcode" value={profile.postal_code} fieldKey="postal_code" onSave={handleProfileSave} isSaving={profileMutation.isPending} />
          <EditableField label="Stad" value={profile.city} fieldKey="city" onSave={handleProfileSave} isSaving={profileMutation.isPending} />
        </div>

        <div className="admin-stat-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8, alignContent: "start" }}>
          <StatCard label="Facturen" value={String(stats.totalInvoices)} numericValue={stats.totalInvoices} isCurrency={false} compact />
          <StatCard label="Omzet" value={formatCurrency(stats.totalRevenue)} numericValue={stats.totalRevenue} compact />
          <StatCard label="Openstaand" value={formatCurrency(stats.openAmount)} numericValue={stats.openAmount} sub={`${stats.openInvoices} facturen`} compact />
          <StatCard label="Klanten" value={String(stats.totalClients)} numericValue={stats.totalClients} isCurrency={false} compact />
          <StatCard label="Bonnen" value={String(stats.totalReceipts)} numericValue={stats.totalReceipts} isCurrency={false} compact />
          <StatCard label="Aangemeld" value={formatDate(profile.created_at)} numericValue={0} isCurrency={false} compact />
        </div>
      </div>

      {/* Tab bar */}
      <div className="admin-toolbar" style={{ gap: 0, borderBottom: "0.5px solid rgba(0,0,0,0.08)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="admin-page-button"
            style={{
              borderBottom: activeTab === tab.key ? "2px solid #000" : "2px solid transparent",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              opacity: activeTab === tab.key ? 1 : 0.4,
              minHeight: 36,
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Facturen tab */}
      {activeTab === "facturen" && (
        recentInvoices.length === 0 ? (
          <div className="admin-table-shell"><div className="admin-empty-state">Geen facturen</div></div>
        ) : (
          <div className="admin-table-shell">
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    {["Nummer", "Klant", "Status", "Datum", "Bedrag", "Acties"].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="mono-amount">{inv.invoice_number}</td>
                      <td>{inv.client_name}</td>
                      <td>
                        <select
                          value={inv.status}
                          onChange={(e) => invoiceStatusMutation.mutate({ id: inv.id, status: e.target.value as InvoiceStatus })}
                          className="admin-select label"
                          style={{ minHeight: 28, minWidth: 100, padding: "0 8px", fontSize: 10 }}
                        >
                          <option value="draft">Concept</option>
                          <option value="sent">Verzonden</option>
                          <option value="paid">Betaald</option>
                          <option value="overdue">Te laat</option>
                        </select>
                      </td>
                      <td className="label">{formatDate(inv.issue_date)}</td>
                      <td className="mono-amount admin-right">{formatCurrency(inv.total_inc_vat)}</td>
                      <td>
                        <button
                          onClick={() => { if (confirm("Factuur verwijderen?")) deleteInvoiceMutation.mutate(inv.id); }}
                          className="admin-page-button admin-page-button-danger"
                          style={{ minHeight: 28, padding: "0 8px", fontSize: 9 }}
                        >
                          Verwijder
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Klanten tab */}
      {activeTab === "klanten" && (
        clients.length === 0 ? (
          <div className="admin-table-shell"><div className="admin-empty-state">Geen klanten</div></div>
        ) : (
          <div className="admin-table-shell">
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    {["Naam", "E-mail", "Stad", "Acties"].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id}>
                      <td className="admin-primary-link">{client.name}</td>
                      <td className="mono-amount">{client.email ?? "\u2014"}</td>
                      <td>{client.city ?? "\u2014"}</td>
                      <td>
                        <button
                          onClick={() => { if (confirm(`Klant "${client.name}" verwijderen?`)) deleteClientMutation.mutate(client.id); }}
                          className="admin-page-button admin-page-button-danger"
                          style={{ minHeight: 28, padding: "0 8px", fontSize: 9 }}
                        >
                          Verwijder
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Bonnen tab */}
      {activeTab === "bonnen" && (
        receipts.length === 0 ? (
          <div className="admin-table-shell"><div className="admin-empty-state">Geen bonnen</div></div>
        ) : (
          <div className="admin-table-shell">
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    {["Leverancier", "Categorie", "Datum", "Bedrag", "Acties"].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((receipt) => (
                    <tr key={receipt.id}>
                      <td>{receipt.vendor_name}</td>
                      <td className="label">{receipt.category ?? "\u2014"}</td>
                      <td className="label">{formatDate(receipt.receipt_date)}</td>
                      <td className="mono-amount admin-right">{formatCurrency(receipt.amount_inc_vat)}</td>
                      <td>
                        <button
                          onClick={() => { if (confirm("Bon verwijderen?")) deleteReceiptMutation.mutate(receipt.id); }}
                          className="admin-page-button admin-page-button-danger"
                          style={{ minHeight: 28, padding: "0 8px", fontSize: 9 }}
                        >
                          Verwijder
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
