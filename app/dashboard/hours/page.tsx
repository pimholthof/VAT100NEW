"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getHoursSummary, createHoursEntry, deleteHoursEntry } from "@/features/hours/actions";
import { SkeletonCard, SkeletonTable, Th, Td, ConfirmDialog } from "@/components/ui";
import { formatDate } from "@/lib/format";

export default function HoursPage() {
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState(now.toISOString().split("T")[0]);
  const [formHours, setFormHours] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formProject, setFormProject] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: result, isLoading } = useQuery({
    queryKey: ["hours-summary", year],
    queryFn: () => getHoursSummary(year),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createHoursEntry({
        work_date: formDate,
        hours: parseFloat(formHours) || 0,
        description: formDesc || null,
        project: formProject || null,
      }),
    onSuccess: (res) => {
      if (!res.error) {
        queryClient.invalidateQueries({ queryKey: ["hours-summary"] });
        setShowForm(false);
        setFormHours("");
        setFormDesc("");
        setFormProject("");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHoursEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hours-summary"] });
    },
  });

  const summary = result?.data;
  const TARGET = 1225;

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 80 }}>
        <div>
          <h1 className="display-title">Urenregistratie</h1>
          <p style={{ fontSize: "var(--text-body-lg)", fontWeight: 300, margin: "16px 0 0", opacity: 0.5 }}>
            Urencriterium: minimaal 1.225 uur per jaar
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
          {showForm ? "Annuleer" : "+ Uren registreren"}
        </button>
      </div>

      {/* Progress */}
      {isLoading ? (
        <SkeletonCard />
      ) : summary ? (
        <div style={{ marginBottom: "var(--space-section)" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 1,
            background: "rgba(13,13,11,0.08)",
            marginBottom: 24,
          }}>
            <StatCard label="Totaal uren" value={`${summary.totalHours}`} />
            <StatCard label="Doel" value={`${TARGET}`} />
            <StatCard label="Resterend" value={`${summary.remaining}`} />
            <StatCard
              label="Status"
              value={summary.onTrack ? "Op schema" : "Achterstand"}
            />
          </div>

          {/* Progress bar */}
          <div style={{
            height: 6,
            background: "rgba(13,13,11,0.06)",
            borderRadius: 3,
            overflow: "hidden",
          }}>
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, (summary.totalHours / TARGET) * 100)}%`,
                background: summary.onTrack ? "var(--foreground)" : "rgba(13,13,11,0.3)",
                transition: "width 0.4s ease",
              }}
            />
          </div>
          <p style={{ fontSize: "var(--text-body-xs)", opacity: 0.4, marginTop: 8 }}>
            Gemiddeld {summary.weeklyAverage} uur per week
          </p>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr 2fr auto", gap: 12, alignItems: "end" }}>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 6, opacity: 0.5 }}>Datum</label>
              <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "0.5px solid rgba(13,13,11,0.15)", background: "var(--background)", fontSize: 13 }} />
            </div>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 6, opacity: 0.5 }}>Uren</label>
              <input type="number" step="0.25" min="0.25" max="24" value={formHours} onChange={(e) => setFormHours(e.target.value)} placeholder="8"
                style={{ width: "100%", padding: "10px 12px", border: "0.5px solid rgba(13,13,11,0.15)", background: "var(--background)", fontSize: 13 }} />
            </div>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 6, opacity: 0.5 }}>Omschrijving</label>
              <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Projectwerk"
                style={{ width: "100%", padding: "10px 12px", border: "0.5px solid rgba(13,13,11,0.15)", background: "var(--background)", fontSize: 13 }} />
            </div>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 6, opacity: 0.5 }}>Project</label>
              <input type="text" value={formProject} onChange={(e) => setFormProject(e.target.value)} placeholder="Optioneel"
                style={{ width: "100%", padding: "10px 12px", border: "0.5px solid rgba(13,13,11,0.15)", background: "var(--background)", fontSize: 13 }} />
            </div>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !formHours}
              className="label-strong"
              style={{
                padding: "10px 20px",
                border: "0.5px solid rgba(13,13,11,0.25)",
                background: "var(--foreground)",
                color: "var(--background)",
                cursor: "pointer",
                opacity: createMutation.isPending || !formHours ? 0.5 : 1,
              }}
            >
              {createMutation.isPending ? "Opslaan..." : "Opslaan"}
            </button>
          </div>
        </div>
      )}

      {/* Entries table */}
      {isLoading ? (
        <SkeletonTable columns="1fr 1fr 2fr 2fr 80px" rows={5} headerWidths={[60, 40, 80, 70, 40]} bodyWidths={[50, 30, 70, 60, 30]} />
      ) : summary && summary.entries.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)", textAlign: "left" }}>
              <Th>Datum</Th>
              <Th style={{ textAlign: "right" }}>Uren</Th>
              <Th>Omschrijving</Th>
              <Th>Project</Th>
              <Th style={{ textAlign: "right" }}>Acties</Th>
            </tr>
          </thead>
          <tbody>
            {summary.entries.map((entry) => (
              <tr key={entry.id} style={{ borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
                <Td><span className="mono-amount">{formatDate(entry.work_date)}</span></Td>
                <Td style={{ textAlign: "right" }}><span className="mono-amount">{entry.hours}</span></Td>
                <Td>{entry.description ?? "—"}</Td>
                <Td><span style={{ opacity: 0.5 }}>{entry.project ?? "—"}</span></Td>
                <Td style={{ textAlign: "right" }}>
                  <button onClick={() => setDeleteTarget(entry.id)} className="table-action" style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.3 }}>
                    Verwijder
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="empty-state">Nog geen uren geregistreerd</p>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Uren verwijderen"
        message="Weet je zeker dat je deze registratie wilt verwijderen?"
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
