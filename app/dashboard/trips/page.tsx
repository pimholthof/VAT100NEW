"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTrips, createTrip, deleteTrip, getYearTripSummary } from "@/features/trips/actions";
import { SkeletonCard, SkeletonTable, Th, Td, ConfirmDialog } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

export default function TripsPage() {
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
      <div className="page-header" style={{ marginBottom: 80 }}>
        <div>
          <h1 className="display-title">Kilometerregistratie</h1>
          <p style={{ fontSize: "var(--text-body-lg)", fontWeight: 300, margin: "16px 0 0", opacity: 0.5 }}>
            Fiscale aftrek: {formatCurrency(summary?.kmRate ?? 0.23)}/km
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="label-strong"
          style={{
            padding: "14px 24px",
            border: "0.5px solid rgba(13,13,11,0.25)",
            background: showForm ? "transparent" : "var(--foreground)",
            color: showForm ? "var(--foreground)" : "var(--background)",
            cursor: "pointer",
          }}
        >
          {showForm ? "Annuleer" : "+ Rit registreren"}
        </button>
      </div>

      {/* Summary */}
      {isLoading ? (
        <SkeletonCard />
      ) : summary ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 1,
          background: "rgba(13,13,11,0.08)",
          marginBottom: "var(--space-section)",
        }}>
          <StatCard label="Totaal kilometers" value={`${summary.totalKm} km`} />
          <StatCard label="Fiscale aftrek" value={formatCurrency(summary.deduction)} />
          <StatCard label="Aantal ritten" value={`${entries.length}`} />
        </div>
      ) : null}

      {/* Form */}
      {showForm && (
        <div style={{
          padding: 20,
          background: "rgba(13,13,11,0.02)",
          border: "0.5px solid rgba(13,13,11,0.06)",
          marginBottom: 24,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr auto", gap: 12, alignItems: "end" }}>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 6, opacity: 0.5 }}>Datum</label>
              <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "0.5px solid rgba(13,13,11,0.15)", background: "var(--background)", fontSize: 13 }} />
            </div>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 6, opacity: 0.5 }}>Doel van de rit</label>
              <input type="text" value={formPurpose} onChange={(e) => setFormPurpose(e.target.value)} placeholder="Klantbezoek Amsterdam"
                style={{ width: "100%", padding: "10px 12px", border: "0.5px solid rgba(13,13,11,0.15)", background: "var(--background)", fontSize: 13 }} />
            </div>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 6, opacity: 0.5 }}>Km (enkele reis)</label>
              <input type="number" step="0.1" min="0.1" value={formKm} onChange={(e) => setFormKm(e.target.value)} placeholder="45"
                style={{ width: "100%", padding: "10px 12px", border: "0.5px solid rgba(13,13,11,0.15)", background: "var(--background)", fontSize: 13 }} />
            </div>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !formKm}
              className="label-strong"
              style={{
                padding: "10px 20px",
                border: "0.5px solid rgba(13,13,11,0.25)",
                background: "var(--foreground)",
                color: "var(--background)",
                cursor: "pointer",
                opacity: createMutation.isPending || !formKm ? 0.5 : 1,
              }}
            >
              {createMutation.isPending ? "Opslaan..." : "Opslaan"}
            </button>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, opacity: 0.6, cursor: "pointer" }}>
              <input type="checkbox" checked={formReturn} onChange={(e) => setFormReturn(e.target.checked)} />
              Heen-en-terug (verdubbelt kilometers)
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
              <Th>Datum</Th>
              <Th>Doel</Th>
              <Th style={{ textAlign: "right" }}>Km</Th>
              <Th style={{ textAlign: "right" }}>Aftrek</Th>
              <Th style={{ textAlign: "right" }}>Acties</Th>
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
                    {trip.is_return_trip && <span style={{ opacity: 0.4, fontSize: "var(--text-body-xs)" }}> (retour)</span>}
                  </Td>
                  <Td style={{ textAlign: "right" }}><span className="mono-amount">{km}</span></Td>
                  <Td style={{ textAlign: "right" }}><span className="mono-amount">{formatCurrency(km * rate)}</span></Td>
                  <Td style={{ textAlign: "right" }}>
                    <button onClick={() => setDeleteTarget(trip.id)} className="table-action" style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.3 }}>
                      Verwijder
                    </button>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="empty-state">Nog geen ritten geregistreerd</p>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Rit verwijderen"
        message="Weet je zeker dat je deze rit wilt verwijderen?"
        confirmLabel="Verwijderen"
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
    <div style={{ background: "var(--background)", padding: 20 }}>
      <p className="label" style={{ margin: "0 0 8px", opacity: 0.4 }}>{label}</p>
      <p className="mono-amount" style={{ margin: 0, fontSize: "var(--text-body-lg)" }}>{value}</p>
    </div>
  );
}
