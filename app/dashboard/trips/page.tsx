"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTrips, createTrip, deleteTrip, getYearTripSummary } from "@/features/trips/actions";
import { SkeletonCard, SkeletonTable, Th, Td, ConfirmDialog } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { useLocale } from "@/lib/i18n/context";

export default function TripsPage() {
  const { t } = useLocale();
  const now = new Date();
  const year = now.getFullYear();
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState(now.toISOString().split("T")[0]);
  const [formPurpose, setFormPurpose] = useState("");
  const [formKm, setFormKm] = useState("");
  const [formReturn, setFormReturn] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const { data: tripsResult, isLoading: tripsLoading } = useQuery({
    queryKey: ["trips", year],
    queryFn: () => getTrips({ dateFrom: yearStart, dateTo: yearEnd }),
  });

  const { data: summaryResult, isLoading: summaryLoading } = useQuery({
    queryKey: ["trips-summary", year],
    queryFn: () => getYearTripSummary(year),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createTrip({
        date: formDate,
        distance_km: parseFloat(formKm) || 0,
        is_return_trip: formReturn,
        purpose: formPurpose || null,
      }),
    onSuccess: (res) => {
      if (!res.error) {
        queryClient.invalidateQueries({ queryKey: ["trips"] });
        queryClient.invalidateQueries({ queryKey: ["trips-summary"] });
        setShowForm(false);
        setFormPurpose("");
        setFormKm("");
        setFormReturn(false);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTrip(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["trips-summary"] });
    },
  });

  const entries = tripsResult?.data ?? [];
  const summary = summaryResult?.data;
  const isLoading = tripsLoading || summaryLoading;

  return (
    <div>
      <div className="page-header" style={{ marginBottom: "var(--space-xl)" }}>
        <div>
          <h1 className="display-title">{t.trips.title}</h1>
          <p style={{ fontSize: "var(--text-body-md)", fontWeight: 400, margin: "12px 0 0", opacity: 0.4 }}>
            {t.trips.subtitle.replace("{rate}", formatCurrency(summary?.kmRate ?? 0.23))}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={showForm ? "btn-secondary" : "btn-primary"}
          style={{ cursor: "pointer" }}
        >
          {showForm ? t.common.cancel : t.trips.registerTrip}
        </button>
      </div>

      {/* Summary */}
      {isLoading ? (
        <SkeletonCard />
      ) : summary ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginBottom: "var(--space-section)",
        }}>
          <StatCard label={t.trips.totalKm} value={`${summary.totalKm} km`} />
          <StatCard label={t.trips.deduction} value={formatCurrency(summary.deduction)} />
          <StatCard label={t.trips.tripCount} value={`${entries.length}`} />
        </div>
      ) : null}

      {/* Form */}
      {showForm && (
        <div style={{
          padding: 24,
          background: "rgba(0, 0, 0, 0.02)",
          border: "0.5px solid rgba(0, 0, 0, 0.06)",
          borderRadius: "var(--radius)",
          marginBottom: 28,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr auto", gap: 12, alignItems: "end" }}>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 8, opacity: 0.4, fontSize: 10 }}>{t.common.date}</label>
              <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                className="input-field" />
            </div>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 8, opacity: 0.4, fontSize: 10 }}>{t.trips.purpose}</label>
              <input type="text" value={formPurpose} onChange={(e) => setFormPurpose(e.target.value)} placeholder={t.trips.purposePlaceholder}
                className="input-field" />
            </div>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 8, opacity: 0.4, fontSize: 10 }}>{t.trips.kmSingleTrip}</label>
              <input type="number" step="0.1" min="0.1" value={formKm} onChange={(e) => setFormKm(e.target.value)} placeholder="45"
                className="input-field" />
            </div>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !formKm}
              className="btn-primary"
              style={{ cursor: "pointer" }}
            >
              {createMutation.isPending ? t.common.saving : t.common.save}
            </button>
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, opacity: 0.5, cursor: "pointer" }}>
              <input type="checkbox" checked={formReturn} onChange={(e) => setFormReturn(e.target.checked)} />
              {t.trips.returnTrip}
            </label>
          </div>
        </div>
      )}

      {/* Entries table */}
      {tripsLoading ? (
        <SkeletonTable columns="1fr 2fr 1fr 1fr 80px" rows={5} headerWidths={[60, 80, 60, 50, 40]} bodyWidths={[50, 70, 50, 40, 30]} />
      ) : entries.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)", textAlign: "left" }}>
              <Th>{t.common.date}</Th>
              <Th>{t.trips.goalLabel}</Th>
              <Th style={{ textAlign: "right" }}>{t.trips.km}</Th>
              <Th style={{ textAlign: "right" }}>{t.trips.deductionLabel}</Th>
              <Th style={{ textAlign: "right" }}>{t.common.actions}</Th>
            </tr>
          </thead>
          <tbody>
            {entries.map((trip) => {
              const km = Number(trip.distance_km);
              const rate = summary?.kmRate ?? 0.23;
              return (
                <tr key={trip.id} style={{ borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
                  <Td><span className="mono-amount">{formatDate(trip.date)}</span></Td>
                  <Td>
                    {trip.purpose ?? "—"}
                    {trip.is_return_trip && <span style={{ opacity: 0.4, fontSize: "var(--text-body-xs)" }}> {t.trips.returnLabel}</span>}
                  </Td>
                  <Td style={{ textAlign: "right" }}><span className="mono-amount">{km}</span></Td>
                  <Td style={{ textAlign: "right" }}><span className="mono-amount">{formatCurrency(km * rate)}</span></Td>
                  <Td style={{ textAlign: "right" }}>
                    <button onClick={() => setDeleteTarget(trip.id)} className="table-action" style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.3 }}>
                      {t.common.delete}
                    </button>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="empty-state">{t.trips.noTripsYet}</p>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t.trips.deleteTitle}
        message={t.trips.deleteMessage}
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
