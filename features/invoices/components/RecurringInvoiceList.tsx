"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listRecurringInvoices,
  deleteRecurringInvoice,
  toggleRecurringInvoice,
} from "@/features/invoices/recurring-actions";
import type { RecurringInvoiceWithDetails } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Th,
  Td,
  TableWrapper,
  ConfirmDialog,
  useToast,
  EmptyState,
} from "@/components/ui";
import { RecurringInvoiceForm } from "./RecurringInvoiceForm";

const FREQ_LABELS: Record<string, string> = {
  weekly: "Wekelijks",
  monthly: "Maandelijks",
  quarterly: "Per kwartaal",
  yearly: "Jaarlijks",
};

export function RecurringInvoiceList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<RecurringInvoiceWithDetails | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: result, isLoading } = useQuery({
    queryKey: ["recurring-invoices"],
    queryFn: () => listRecurringInvoices(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRecurringInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      toast("Template verwijderd");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleRecurringInvoice(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      toast("Status bijgewerkt");
    },
  });

  const handleSaved = useCallback(() => {
    setShowForm(false);
    setEditTarget(null);
    queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
  }, [queryClient]);

  const templates = result?.data ?? [];

  if (showForm || editTarget) {
    return (
      <RecurringInvoiceForm
        existing={editTarget ?? undefined}
        onSaved={handleSaved}
        onCancel={() => {
          setShowForm(false);
          setEditTarget(null);
        }}
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="display-title" style={{ marginBottom: 8 }}>
            Terugkerend
          </h1>
          <p className="label" style={{ opacity: 0.25 }}>
            {templates.length}{" "}
            {templates.length === 1 ? "TEMPLATE" : "TEMPLATES"}
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + Nieuwe template
        </button>
      </div>

      {isLoading ? (
        <div>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ width: "100%", height: 48, marginBottom: 1 }}
            />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <p style={{ fontSize: 32, marginBottom: 12, opacity: 0.15 }}>↻</p>
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
            Nog geen terugkerende facturen
          </p>
          <p style={{ fontSize: 13, opacity: 0.4, marginBottom: 20 }}>
            Maak een template voor automatisch terugkerende facturen.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Nieuwe template
          </button>
        </div>
      ) : (
        <TableWrapper>
          <table
            style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "0.5px solid rgba(0,0,0,0.08)",
                }}
              >
                <Th>Klant</Th>
                <Th>Frequentie</Th>
                <Th>Volgende run</Th>
                <Th>Bedrag</Th>
                <Th>Status</Th>
                <Th style={{ textAlign: "right" }}>Acties</Th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t: RecurringInvoiceWithDetails) => {
                const subtotal = t.lines.reduce(
                  (sum, l) => sum + Number(l.amount),
                  0
                );
                const vatAmount =
                  Math.round(subtotal * (Number(t.vat_rate) / 100) * 100) / 100;
                const total =
                  Math.round((subtotal + vatAmount) * 100) / 100;

                return (
                  <tr
                    key={t.id}
                    className="table-row-interactive"
                    style={{
                      borderBottom: "0.5px solid rgba(0,0,0,0.03)",
                    }}
                  >
                    <Td>{t.client?.name ?? "—"}</Td>
                    <Td>
                      <span style={{ fontSize: 12, opacity: 0.6 }}>
                        {FREQ_LABELS[t.frequency] ?? t.frequency}
                      </span>
                    </Td>
                    <Td>
                      <span
                        style={{
                          fontSize: 12,
                          opacity: 0.4,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatDate(t.next_run_date)}
                      </span>
                    </Td>
                    <Td>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatCurrency(total)}
                      </span>
                    </Td>
                    <Td>
                      <button
                        onClick={() =>
                          toggleMutation.mutate({
                            id: t.id,
                            isActive: !t.is_active,
                          })
                        }
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: t.is_active
                            ? "rgba(0,128,0,0.7)"
                            : "rgba(0,0,0,0.3)",
                        }}
                      >
                        {t.is_active ? "Actief" : "Gepauzeerd"}
                      </button>
                    </Td>
                    <Td style={{ textAlign: "right" }}>
                      <div
                        className="table-row-actions"
                        style={{
                          display: "flex",
                          gap: 8,
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          onClick={() => setEditTarget(t)}
                          className="table-action"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          Bewerken
                        </button>
                        <button
                          onClick={() => setDeleteTarget(t.id)}
                          className="table-action"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          Verwijder
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrapper>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Template verwijderen"
        message="Weet je zeker dat je deze terugkerende factuur wilt verwijderen?"
        confirmLabel="Verwijder"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
