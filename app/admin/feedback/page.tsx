"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminFeedback, getNPSStats, updateFeedbackStatus } from "@/features/feedback/actions";
import { PageHeader, TableWrapper, Th, Td, Select, ButtonSecondary, SkeletonTable, StatCard } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { FeedbackStatus } from "@/lib/types";

const TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  feature: "Verzoek",
  nps: "NPS",
  general: "Algemeen",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In behandeling",
  resolved: "Opgelost",
  wont_fix: "Niet opgepakt",
};

export default function AdminFeedbackPage() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data: feedbackResult, isLoading } = useQuery({
    queryKey: ["admin-feedback", typeFilter, statusFilter, page],
    queryFn: () => getAdminFeedback({ type: typeFilter, status: statusFilter, page, pageSize }),
  });

  const { data: npsResult } = useQuery({
    queryKey: ["admin-nps"],
    queryFn: () => getNPSStats(),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: FeedbackStatus }) =>
      updateFeedbackStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });
    },
  });

  const entries = feedbackResult?.data?.entries ?? [];
  const total = feedbackResult?.data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);
  const nps = npsResult?.data;

  return (
    <div>
      <PageHeader title="Feedback" backHref="/admin" backLabel="Beheer" />

      {/* NPS Score */}
      {nps && nps.totalResponses > 0 && (
        <div className="stat-cards-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginBottom: 32 }}>
          <StatCard
            label="NPS Score"
            value={String(nps.nps)}
            numericValue={nps.nps}
            isCurrency={false}
          />
          <StatCard
            label="Promoters (9-10)"
            value={String(nps.promoters)}
            numericValue={nps.promoters}
            isCurrency={false}
          />
          <StatCard
            label="Passief (7-8)"
            value={String(nps.passives)}
            numericValue={nps.passives}
            isCurrency={false}
          />
          <StatCard
            label="Detractors (0-6)"
            value={String(nps.detractors)}
            numericValue={nps.detractors}
            isCurrency={false}
          />
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
        <Select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          style={{ width: "auto", minWidth: 140 }}
        >
          <option value="all">Alle types</option>
          <option value="bug">Bug</option>
          <option value="feature">Verzoek</option>
          <option value="nps">NPS</option>
          <option value="general">Algemeen</option>
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ width: "auto", minWidth: 140 }}
        >
          <option value="all">Alle statussen</option>
          <option value="open">Open</option>
          <option value="in_progress">In behandeling</option>
          <option value="resolved">Opgelost</option>
          <option value="wont_fix">Niet opgepakt</option>
        </Select>
      </div>

      <p className="label" style={{ marginBottom: 16 }}>
        {total} feedback item{total !== 1 ? "s" : ""}
      </p>

      {isLoading ? (
        <SkeletonTable columns="1fr 3fr 0.5fr 1fr 1fr" rows={8} headerWidths={[40, 70, 30, 50, 50]} bodyWidths={[30, 60, 20, 40, 40]} />
      ) : entries.length === 0 ? (
        <p className="empty-state">Geen feedback gevonden</p>
      ) : (
        <TableWrapper>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>Type</Th>
                <Th>Bericht</Th>
                <Th>Score</Th>
                <Th>Status</Th>
                <Th>Datum</Th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <Td>
                    <span className="label-strong" style={{ fontSize: 10 }}>
                      {TYPE_LABELS[entry.type] ?? entry.type}
                    </span>
                    {entry.full_name && (
                      <span className="label" style={{ display: "block", marginTop: 2 }}>
                        {entry.full_name}
                      </span>
                    )}
                  </Td>
                  <Td>
                    <span style={{ fontSize: "var(--text-body-sm)", lineHeight: 1.4 }}>
                      {entry.message.length > 120 ? entry.message.slice(0, 120) + "..." : entry.message}
                    </span>
                  </Td>
                  <Td style={{ fontVariantNumeric: "tabular-nums", textAlign: "center" }}>
                    {entry.score !== null ? entry.score : "\u2014"}
                  </Td>
                  <Td>
                    <select
                      value={entry.status}
                      onChange={(e) => statusMutation.mutate({ id: entry.id, status: e.target.value as FeedbackStatus })}
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
                      {Object.entries(STATUS_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </Td>
                  <Td>
                    <span className="label">{formatDate(entry.created_at)}</span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrapper>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 32 }}>
          <ButtonSecondary onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Vorige
          </ButtonSecondary>
          <span className="label" style={{ padding: "8px 16px" }}>{page} / {totalPages}</span>
          <ButtonSecondary onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Volgende
          </ButtonSecondary>
        </div>
      )}
    </div>
  );
}
