"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuditLog } from "@/features/admin/actions/audit";
import { PageHeader, TableWrapper, Th, Td, Select, ButtonSecondary, SkeletonTable } from "@/components/ui";
import { formatDateLong } from "@/lib/format";

const ACTION_LABELS: Record<string, string> = {
  "user.suspend": "Gebruiker geblokkeerd",
  "user.reactivate": "Gebruiker geactiveerd",
  "user.delete": "Gebruiker verwijderd",
  "user.anonymize": "Gebruiker geanonimiseerd",
  "customer.profile_update": "Profiel bijgewerkt",
  "customer.bulk_action": "Bulk actie",
  "invoice.status_change": "Factuurstatus gewijzigd",
  "lead.stage_change": "Lead fase gewijzigd",
  "lead.plan_change": "Lead plan gewijzigd",
  "lead.provision": "Account aangemaakt",
  "lead.task_toggle": "Taak gewijzigd",
  "lead.payment_initiated": "Betaling gestart",
  "settings.update": "Instelling gewijzigd",
  "impersonation.start": "Impersonatie gestart",
  "data.export": "Data geëxporteerd",
};

const TARGET_LABELS: Record<string, string> = {
  user: "Gebruiker",
  customer: "Klant",
  invoice: "Factuur",
  lead: "Lead",
  setting: "Instelling",
  system: "Systeem",
};

export default function AdminAuditLogPage() {
  const [actionFilter, setActionFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-audit-log", actionFilter, targetFilter, page],
    queryFn: () =>
      getAuditLog({
        action: actionFilter,
        targetType: targetFilter,
        page,
        pageSize,
      }),
  });

  const entries = result?.data?.entries ?? [];
  const total = result?.data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <PageHeader title="Audit Log" backHref="/admin" backLabel="Beheer" />

      {/* Filters */}
      <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
        <Select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          style={{ maxWidth: 260 }}
        >
          <option value="all">Alle acties</option>
          {Object.entries(ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>

        <Select
          value={targetFilter}
          onChange={(e) => { setTargetFilter(e.target.value); setPage(1); }}
          style={{ maxWidth: 200 }}
        >
          <option value="all">Alle typen</option>
          {Object.entries(TARGET_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </div>

      <p className="label" style={{ marginBottom: 16 }}>
        {total} log{total !== 1 ? "regels" : "regel"}
      </p>

      {isLoading ? (
        <SkeletonTable
          columns="0.5fr 1.5fr 1.5fr 1fr 1fr 1.5fr"
          rows={10}
          headerWidths={[30, 60, 60, 50, 50, 60]}
          bodyWidths={[20, 50, 50, 40, 40, 50]}
        />
      ) : entries.length === 0 ? (
        <p className="empty-state">Nog geen audit log entries</p>
      ) : (
        <TableWrapper>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>Datum</Th>
                <Th>Admin</Th>
                <Th>Actie</Th>
                <Th>Type</Th>
                <Th>Target ID</Th>
                <Th>Details</Th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <Td>
                    <span className="label">{formatDateLong(entry.created_at)}</span>
                  </Td>
                  <Td style={{ fontWeight: 500 }}>
                    {entry.admin_name}
                  </Td>
                  <Td>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: "rgba(0,0,0,0.04)",
                        fontSize: "var(--text-body-sm)",
                        fontWeight: 500,
                      }}
                    >
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </span>
                  </Td>
                  <Td>
                    <span className="label">
                      {TARGET_LABELS[entry.target_type] ?? entry.target_type}
                    </span>
                  </Td>
                  <Td style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-body-sm)", opacity: 0.6 }}>
                    {entry.target_id.substring(0, 8)}...
                  </Td>
                  <Td style={{ fontSize: "var(--text-body-sm)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {Object.keys(entry.metadata).length > 0
                      ? JSON.stringify(entry.metadata)
                      : "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrapper>
      )}

      {/* Paginering */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 32 }}>
          <ButtonSecondary
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Vorige
          </ButtonSecondary>
          <span className="label" style={{ padding: "8px 16px" }}>
            {page} / {totalPages}
          </span>
          <ButtonSecondary
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Volgende
          </ButtonSecondary>
        </div>
      )}
    </div>
  );
}
