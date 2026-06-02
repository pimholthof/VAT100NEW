"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getHoursLog, createHoursEntry, deleteHoursEntry, getYearTotalHours } from "@/features/hours/actions";
import { SkeletonCard, SkeletonTable, Th, Td, ConfirmDialog } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { useLocale } from "@/lib/i18n/context";

export default function HoursPage() {
  const { t } = useLocale();
  const now = new Date();
  const year = now.getFullYear();
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState(now.toISOString().split("T")[0]);
  const [formHours, setFormHours] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const { data: logResult, isLoading: logLoading } = useQuery({
    queryKey: ["hours-log", year],
    queryFn: () => getHoursLog({ dateFrom: yearStart, dateTo: yearEnd }),
  });

  const { data: totalResult, isLoading: totalLoading } = useQuery({
    queryKey: ["hours-total", year],
    queryFn: () => getYearTotalHours(year),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createHoursEntry({
        date: formDate,
        hours: parseFloat(formHours) || 0,
        category: formCategory || null,
      }),
    onSuccess: (res) => {
      if (!res.error) {
        queryClient.invalidateQueries({ queryKey: ["hours-log"] });
        queryClient.invalidateQueries({ queryKey: ["hours-total"] });
        setShowForm(false);
        setFormHours("");
        setFormCategory("");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHoursEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hours-log"] });
      queryClient.invalidateQueries({ queryKey: ["hours-total"] });
    },
  });

  const entries = logResult?.data ?? [];
  const totals = totalResult?.data;
  const TARGET = 1225;
  const isLoading = logLoading || totalLoading;
  const totalHours = totals?.total ?? 0;
  const remaining = Math.max(0, TARGET - totalHours);

  // Weekly average
  const yearStartDate = new Date(year, 0, 1);
  const endDate = now.getFullYear() === year ? now : new Date(year, 11, 31);
  const weeksElapsed = Math.max(1, Math.ceil((endDate.getTime() - yearStartDate.getTime()) / (7 * 24 * 3600 * 1000)));
  const weeklyAverage = Math.round((totalHours / weeksElapsed) * 10) / 10;
  const onTrack = weeklyAverage * 52 >= TARGET;

  return (
    <div>
      <div className="page-header" style={{ marginBottom: "var(--space-xl)" }}>
        <div>
          <h1 className="display-title">{t.hours.title}</h1>
          <p style={{ fontSize: "var(--text-body-md)", fontWeight: 400, margin: "12px 0 0", opacity: 0.4 }}>
            {t.hours.subtitle}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={showForm ? "btn-secondary" : "btn-primary"}
          style={{ cursor: "pointer" }}
        >
          {showForm ? t.common.cancel : t.hours.registerHours}
        </button>
      </div>

      {/* Progress */}
      {isLoading ? (
        <SkeletonCard />
      ) : (
        <div style={{ marginBottom: "var(--space-section)" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 24,
          }}>
            <StatCard label={t.hours.totalHours} value={`${totalHours}`} />
            <StatCard label={t.hours.goal} value={`${TARGET}`} />
            <StatCard label={t.hours.remaining} value={`${remaining}`} />
            <StatCard label={t.hours.statusLabel} value={onTrack ? t.hours.onTrack : t.hours.behind} />
          </div>

          {/* Progress bar */}
          <div style={{
            height: 4,
            background: "rgba(0, 0, 0, 0.04)",
            borderRadius: 2,
            overflow: "hidden",
          }}>
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, (totalHours / TARGET) * 100)}%`,
                background: onTrack ? "var(--foreground)" : "rgba(0, 0, 0, 0.2)",
                borderRadius: 2,
                transition: "width 0.6s var(--ease-out-expo)",
              }}
            />
          </div>
          <p style={{ fontSize: 12, opacity: 0.35, marginTop: 10 }}>
            {t.hours.averageWeekly.replace("{hours}", String(weeklyAverage))}
          </p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div style={{
          padding: 24,
          background: "rgba(0, 0, 0, 0.02)",
          border: "0.5px solid rgba(0, 0, 0, 0.06)",
          borderRadius: "var(--radius)",
          marginBottom: 28,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr auto", gap: 12, alignItems: "end" }}>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 8, opacity: 0.4, fontSize: 10 }}>{t.common.date}</label>
              <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                className="input-field" />
            </div>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 8, opacity: 0.4, fontSize: 10 }}>{t.hours.hoursLabel}</label>
              <input type="number" step="0.25" min="0.25" max="24" value={formHours} onChange={(e) => setFormHours(e.target.value)} placeholder="8"
                className="input-field" />
            </div>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 8, opacity: 0.4, fontSize: 10 }}>{t.hours.categoryLabel}</label>
              <input type="text" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder={t.hours.categoryPlaceholder}
                className="input-field" />
            </div>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !formHours}
              className="btn-primary"
              style={{ cursor: "pointer" }}
            >
              {createMutation.isPending ? t.common.saving : t.common.save}
            </button>
          </div>
        </div>
      )}

      {/* Entries table */}
      {logLoading ? (
        <SkeletonTable columns="1fr 1fr 2fr 80px" rows={5} headerWidths={[60, 40, 80, 40]} bodyWidths={[50, 30, 70, 30]} />
      ) : entries.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)", textAlign: "left" }}>
              <Th>{t.common.date}</Th>
              <Th style={{ textAlign: "right" }}>{t.hours.hoursLabel}</Th>
              <Th>{t.hours.categoryLabel}</Th>
              <Th style={{ textAlign: "right" }}>{t.common.actions}</Th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} style={{ borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
                <Td><span className="mono-amount">{formatDate(entry.date)}</span></Td>
                <Td style={{ textAlign: "right" }}><span className="mono-amount">{entry.hours}</span></Td>
                <Td>{entry.category ?? "—"}</Td>
                <Td style={{ textAlign: "right" }}>
                  <button onClick={() => setDeleteTarget(entry.id)} className="table-action" style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.3 }}>
                    {t.common.delete}
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="empty-state">{t.hours.noHoursYet}</p>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t.hours.deleteTitle}
        message={t.hours.deleteMessage}
        confirmLabel={t.common.delete}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: "var(--background)",
      padding: 20,
      border: "0.5px solid rgba(0, 0, 0, 0.06)",
      borderRadius: "var(--radius)",
    }}>
      <p className="label" style={{ margin: "0 0 10px", opacity: 0.35, fontSize: 10 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{value}</p>
    </div>
  );
}
