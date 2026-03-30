"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTripsSummary, createTrip, deleteTrip } from "@/features/trips/actions";
import { SkeletonCard, SkeletonTable, Th, Td, ConfirmDialog } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

const KM_TARIEF = 0.23;

export default function TripsPage() {
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState(now.toISOString().split("T")[0]);
  const [formDesc, setFormDesc] = useState("");
  const [formOrigin, setFormOrigin] = useState("");
  const [formDest, setFormDest] = useState("");
  const [formKm, setFormKm] = useState("");
  const [formReturn, setFormReturn] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: result, isLoading } = useQuery({
    queryKey: ["trips-summary", year],
    queryFn: () => getTripsSummary(year),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createTrip({
        trip_date: formDate,
        description: formDesc,
        origin: formOrigin || null,
        destination: formDest || null,
        distance_km: parseFloat(formKm) || 0,
        is_return_trip: formReturn,
      }),
    onSuccess: (res) => {
      if (!res.error) {
        queryClient.invalidateQueries({ queryKey: ["trips-summary"] });
        setShowForm(false);
        setFormDesc("");
        setFormOrigin("");
        setFormDest("");
        setFormKm("");
        setFormReturn(false);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTrip(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips-summary"] });
    },
  });

  const summary = result?.data;

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 80 }}>
        <div>
          <h1 className="display-title">Kilometerregistratie</h1>
          <p style={{ fontSize: "var(--text-body-lg)", fontWeight: 300, margin: "16px 0 0", opacity: 0.5 }}>
            Fiscale aftrek: {formatCurrency(KM_TARIEF)}/km
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
          <StatCard label="Fiscale aftrek" value={formatCurrency(summary.totalDeduction)} />
          <StatCard label="Aantal ritten" value={`${summary.tripCount}`} />
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 6, opacity: 0.5 }}>Datum</label>
              <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "0.5px solid rgba(13,13,11,0.15)", background: "var(--background)", fontSize: 13 }} />
            </div>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 6, opacity: 0.5 }}>Omschrijving</label>
              <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Klantbezoek"
                style={{ width: "100%", padding: "10px 12px", border: "0.5px solid rgba(13,13,11,0.15)", background: "var(--background)", fontSize: 13 }} />
            </div>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 6, opacity: 0.5 }}>Van</label>
              <input type="text" value={formOrigin} onChange={(e) => setFormOrigin(e.target.value)} placeholder="Amsterdam"
                style={{ width: "100%", padding: "10px 12px", border: "0.5px solid rgba(13,13,11,0.15)", background: "var(--background)", fontSize: 13 }} />
            </div>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 6, opacity: 0.5 }}>Naar</label>
              <input type="text" value={formDest} onChange={(e) => setFormDest(e.target.value)} placeholder="Rotterdam"
                style={{ width: "100%", padding: "10px 12px", border: "0.5px solid rgba(13,13,11,0.15)", background: "var(--background)", fontSize: 13 }} />
            </div>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 6, opacity: 0.5 }}>Km</label>
              <input type="number" step="0.1" min="0.1" value={formKm} onChange={(e) => setFormKm(e.target.value)} placeholder="45"
                style={{ width: "100%", padding: "10px 12px", border: "0.5px solid rgba(13,13,11,0.15)", background: "var(--background)", fontSize: 13 }} />
            </div>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !formKm || !formDesc}
              className="label-strong"
              style={{
                padding: "10px 20px",
                border: "0.5px solid rgba(13,13,11,0.25)",
                background: "var(--foreground)",
                color: "var(--background)",
                cursor: "pointer",
                opacity: createMutation.isPending || !formKm || !formDesc ? 0.5 : 1,
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
      {isLoading ? (
        <SkeletonTable columns="1fr 2fr 1fr 1fr 1fr 80px" rows={5} headerWidths={[60, 80, 60, 60, 50, 40]} bodyWidths={[50, 70, 50, 50, 40, 30]} />
      ) : summary && summary.entries.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)", textAlign: "left" }}>
              <Th>Datum</Th>
              <Th>Omschrijving</Th>
              <Th>Route</Th>
              <Th style={{ textAlign: "right" }}>Km</Th>
              <Th style={{ textAlign: "right" }}>Aftrek</Th>
              <Th style={{ textAlign: "right" }}>Acties</Th>
            </tr>
          </thead>
          <tbody>
            {summary.entries.map((trip) => {
              const effectiveKm = trip.is_return_trip ? Number(trip.distance_km) * 2 : Number(trip.distance_km);
              return (
                <tr key={trip.id} style={{ borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
                  <Td><span className="mono-amount">{formatDate(trip.trip_date)}</span></Td>
                  <Td>{trip.description}</Td>
                  <Td>
                    <span style={{ opacity: 0.5, fontSize: "var(--text-body-sm)" }}>
                      {[trip.origin, trip.destination].filter(Boolean).join(" → ") || "—"}
                      {trip.is_return_trip ? " (retour)" : ""}
                    </span>
                  </Td>
                  <Td style={{ textAlign: "right" }}><span className="mono-amount">{effectiveKm}</span></Td>
                  <Td style={{ textAlign: "right" }}><span className="mono-amount">{formatCurrency(effectiveKm * KM_TARIEF)}</span></Td>
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
