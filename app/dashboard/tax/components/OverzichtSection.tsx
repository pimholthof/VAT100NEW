"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTaxPaymentsSummary, createTaxPayment, deleteTaxPayment } from "@/features/tax/payments-actions";
import type { TaxPaymentType } from "@/lib/types";
import { SkeletonTable, Th, Td, ConfirmDialog } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

interface Props {
  year: number;
}

export function OverzichtSection({ year }: Props) {
  return <VoorlopigeAanslagSection year={year} />;
}

// ─── Voorlopige Aanslag Section ───

function VoorlopigeAanslagSection({ year }: { year: number }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<TaxPaymentType>("ib");
  const [formPeriod, setFormPeriod] = useState(`${year}`);
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formRef, setFormRef] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: summaryResult, isLoading } = useQuery({
    queryKey: ["tax-payments-summary", year],
    queryFn: () => getTaxPaymentsSummary(year),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createTaxPayment({
        type: formType,
        period: formPeriod,
        amount: parseFloat(formAmount) || 0,
        paid_date: formDate || null,
        reference: formRef || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-payments-summary"] });
      setShowForm(false);
      setFormAmount("");
      setFormRef("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTaxPayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-payments-summary"] });
    },
  });

  const summary = summaryResult?.data;

  return (
    <div style={{
      borderTop: "0.5px solid rgba(13,13,11,0.08)",
      paddingTop: "var(--space-section)",
      marginTop: "var(--space-section)",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        flexWrap: "wrap",
        gap: 8,
        margin: "0 0 24px",
      }}>
        <h2 className="section-header" style={{ margin: 0 }}>Voorlopige aanslagen</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="label-strong"
          style={{
            padding: "12px 24px",
            border: "1px solid var(--color-black)",
            borderRadius: 9999,
            background: "transparent",
            cursor: "pointer",
            fontSize: 10,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          {showForm ? "Annuleer" : "+ Betaling toevoegen"}
        </button>
      </div>

      {/* Samenvatting */}
      {!isLoading && summary && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          marginBottom: 32,
        }}>
          <div style={{ padding: "24px 24px 24px 0", borderRight: "0.5px solid rgba(0,0,0,0.08)" }}>
            <p className="label" style={{ margin: "0 0 10px" }}>Inkomstenbelasting</p>
            <p style={{ margin: "0 0 6px", fontSize: "var(--text-body-lg)", fontWeight: 600 }}>
              {formatCurrency(summary.ibBetaald)} <span style={{ opacity: 0.35, fontSize: "var(--text-body-sm)", fontWeight: 400 }}>betaald</span>
            </p>
            <p style={{ fontSize: "var(--text-body-xs)", opacity: 0.4, margin: 0 }}>
              Geschat: {formatCurrency(summary.geschatteIB)} — {summary.verschilIB > 0
                ? `nog ${formatCurrency(summary.verschilIB)} te betalen`
                : summary.verschilIB < 0
                  ? `${formatCurrency(Math.abs(summary.verschilIB))} teveel betaald`
                  : "op schema"}
            </p>
          </div>
          <div style={{ padding: "24px 0 24px 24px" }}>
            <p className="label" style={{ margin: "0 0 10px" }}>BTW</p>
            <p style={{ margin: "0 0 6px", fontSize: "var(--text-body-lg)", fontWeight: 600 }}>
              {formatCurrency(summary.btwBetaald)} <span style={{ opacity: 0.35, fontSize: "var(--text-body-sm)", fontWeight: 400 }}>betaald</span>
            </p>
            <p style={{ fontSize: "var(--text-body-xs)", opacity: 0.4, margin: 0 }}>
              Geschat: {formatCurrency(summary.geschatteBTW)} — {summary.verschilBTW > 0
                ? `nog ${formatCurrency(summary.verschilBTW)} te betalen`
                : summary.verschilBTW < 0
                  ? `${formatCurrency(Math.abs(summary.verschilBTW))} teveel betaald`
                  : "op schema"}
            </p>
          </div>
        </div>
      )}

      {/* Formulier */}
      {showForm && (
        <div style={{
          padding: "24px 0",
          borderTop: "0.5px solid rgba(0,0,0,0.06)",
          borderBottom: "0.5px solid rgba(0,0,0,0.06)",
          marginBottom: 32,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 16, alignItems: "end" }}>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 8 }}>Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as TaxPaymentType)}
                className="input-field"
                style={{ height: 48, boxSizing: "border-box" }}
              >
                <option value="ib">Inkomstenbelasting</option>
                <option value="btw">BTW</option>
              </select>
            </div>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 8 }}>Periode</label>
              <input
                type="text"
                value={formPeriod}
                onChange={(e) => setFormPeriod(e.target.value)}
                placeholder={`${year} of ${year}-Q1`}
                className="input-field"
                style={{ height: 48, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 8 }}>Bedrag</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0,00"
                className="input-field"
                style={{ height: 48, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 8 }}>Betaaldatum</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="input-field"
                style={{ height: 48, boxSizing: "border-box" }}
              />
            </div>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !formAmount}
              className="btn-primary"
              style={{
                height: 48,
                boxSizing: "border-box",
                opacity: createMutation.isPending || !formAmount ? 0.4 : 1,
              }}
            >
              {createMutation.isPending ? "Opslaan..." : "Opslaan"}
            </button>
          </div>
        </div>
      )}

      {/* Betalingsoverzicht */}
      {isLoading ? (
        <SkeletonTable columns="1fr 1fr 1fr 1fr 80px" rows={3} headerWidths={[60, 50, 60, 50, 40]} bodyWidths={[50, 40, 50, 40, 30]} />
      ) : summary && summary.betalingen.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)", textAlign: "left" }}>
              <Th>Type</Th>
              <Th>Periode</Th>
              <Th style={{ textAlign: "right" }}>Bedrag</Th>
              <Th>Betaaldatum</Th>
              <Th style={{ textAlign: "right" }}>Acties</Th>
            </tr>
          </thead>
          <tbody>
            {summary.betalingen.map((p) => (
              <tr key={p.id} style={{ borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
                <Td>
                  <span className="label" style={{ opacity: 1 }}>
                    {p.type === "ib" ? "Inkomstenbelasting" : "BTW"}
                  </span>
                </Td>
                <Td><span className="mono-amount">{p.period}</span></Td>
                <Td style={{ textAlign: "right" }}><span className="mono-amount">{formatCurrency(p.amount)}</span></Td>
                <Td><span className="mono-amount">{p.paid_date ? formatDate(p.paid_date) : "—"}</span></Td>
                <Td style={{ textAlign: "right" }}>
                  <button
                    onClick={() => setDeleteTarget(p.id)}
                    className="table-action"
                    style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.3 }}
                  >
                    Verwijder
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="empty-state">Nog geen voorlopige aanslagen geregistreerd</p>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Betaling verwijderen"
        message="Weet je zeker dat je deze betaling wilt verwijderen?"
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
