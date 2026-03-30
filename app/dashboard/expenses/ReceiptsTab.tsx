"use client";

import Link from "next/link";
import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getReceipts, deleteReceipt, deleteReceipts } from "@/features/receipts/actions";
import { getKostensoortByCode, KOSTENSOORTEN } from "@/lib/constants/costs";
import type { Receipt } from "@/lib/types";
import { Th, Td, SkeletonTable, SearchFilter, TableWrapper, ConfirmDialog } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

const CATEGORY_OPTIONS = KOSTENSOORTEN.map((k) => ({
  value: k.label,
  label: k.label,
}));

export default function ReceiptsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const handleSearch = useCallback((q: string) => setSearch(q), []);
  const handleFilter = useCallback((f: Record<string, string>) => {
    setCategoryFilter(f.category ?? "");
  }, []);

  const { data: result, isLoading } = useQuery({
    queryKey: ["receipts", search, categoryFilter],
    queryFn: () =>
      getReceipts({
        search: search || undefined,
        category: categoryFilter || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReceipt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => deleteReceipts(ids),
    onSuccess: () => {
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
    },
  });

  const receipts = result?.data ?? [];

  const allSelected = useMemo(
    () => receipts.length > 0 && receipts.every((r: Receipt) => selected.has(r.id)),
    [receipts, selected]
  );

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(receipts.map((r: Receipt) => r.id)));
    }
  }, [allSelected, receipts]);

  return (
    <div>
      <div className="page-header">
        <h1 className="display-title">
          Bonnen
        </h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <a
            href="/api/export/receipts"
            download
            className="btn-secondary"
          >
            Exporteer CSV
          </a>
          <Link
            href="/dashboard/receipts/new"
            className="btn-primary"
          >
            + Nieuwe bon
          </Link>
        </div>
      </div>

      <SearchFilter
        placeholder="Zoek op leverancier of bedrag..."
        filters={[
          { key: "category", label: "Alle categorieën", options: CATEGORY_OPTIONS },
        ]}
        onSearch={handleSearch}
        onFilterChange={handleFilter}
      />

      {selected.size > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "10px 16px",
            marginBottom: 8,
            background: "rgba(0,0,0,0.03)",
            borderRadius: 8,
            fontSize: "var(--text-body-sm)",
          }}
        >
          <span style={{ fontWeight: 500 }}>
            {selected.size} {selected.size === 1 ? "bon" : "bonnen"} geselecteerd
          </span>
          <button
            onClick={() => setBulkDeleteOpen(true)}
            disabled={bulkDeleteMutation.isPending}
            style={{
              background: "none",
              border: "1px solid rgba(0,0,0,0.15)",
              borderRadius: 6,
              padding: "4px 12px",
              cursor: "pointer",
              fontSize: "var(--text-body-sm)",
              fontWeight: 500,
              color: "#c00",
            }}
          >
            {bulkDeleteMutation.isPending ? "Bezig..." : "Verwijderen"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "var(--text-body-sm)",
              opacity: 0.5,
            }}
          >
            Deselecteer
          </button>
        </div>
      )}

      {isLoading ? (
        <SkeletonTable
          columns="24px 1fr 2fr 1fr 1fr 1fr 1fr 80px"
          headerWidths={[10, 60, 80, 70, 60, 50, 50, 40]}
          bodyWidths={[10, 50, 70, 60, 50, 40, 40, 30]}
        />
      ) : receipts.length === 0 ? (
        <div style={{ paddingTop: "var(--space-block)" }}>
          <p className="empty-state">
            {search || categoryFilter ? "Geen bonnen gevonden" : "Nog geen bonnen"}
          </p>
          {!search && !categoryFilter && (
            <Link
              href="/dashboard/receipts/new"
              className="table-action"
              style={{ opacity: 0.4 }}
            >
              Voeg je eerste bon toe
            </Link>
          )}
        </div>
      ) : (
        <TableWrapper><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
          <thead>
            <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)", textAlign: "left" }}>
              <Th style={{ width: 24 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  style={{ cursor: "pointer", accentColor: "#000" }}
                  aria-label="Selecteer alle bonnen"
                />
              </Th>
              <Th>Datum</Th>
              <Th>Leverancier</Th>
              <Th>Kostensoort</Th>
              <Th style={{ textAlign: "right" }}>Excl. BTW</Th>
              <Th style={{ textAlign: "right" }}>BTW</Th>
              <Th style={{ textAlign: "right" }}>Incl. BTW</Th>
              <Th style={{ textAlign: "right" }}>Acties</Th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((receipt: Receipt) => {
              const kostensoort = receipt.cost_code
                ? getKostensoortByCode(receipt.cost_code)
                : null;
              const isSelected = selected.has(receipt.id);

              return (
                <tr
                  key={receipt.id}
                  style={{
                    borderBottom: "0.5px solid rgba(13,13,11,0.06)",
                    background: isSelected ? "rgba(0,0,0,0.02)" : undefined,
                  }}
                >
                  <Td style={{ width: 24, textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(receipt.id)}
                      style={{ cursor: "pointer", accentColor: "#000" }}
                      aria-label={`Selecteer bon ${receipt.vendor_name ?? receipt.id}`}
                    />
                  </Td>
                  <Td>
                    <span className="mono-amount">
                      {receipt.receipt_date ? formatDate(receipt.receipt_date) : "—"}
                    </span>
                  </Td>
                  <Td style={{ fontWeight: 400 }}>
                    {receipt.vendor_name ?? "—"}
                    {receipt.business_percentage < 100 && (
                      <span style={{ fontSize: "var(--text-body-xs)", opacity: 0.4, marginLeft: 6 }}>
                        {receipt.business_percentage}% zakelijk
                      </span>
                    )}
                  </Td>
                  <Td>
                    {kostensoort ? kostensoort.label : receipt.category ?? "—"}
                  </Td>
                  <Td style={{ textAlign: "right" }}>
                    <span className="mono-amount">
                      {receipt.amount_ex_vat != null ? formatCurrency(receipt.amount_ex_vat) : "—"}
                    </span>
                  </Td>
                  <Td style={{ textAlign: "right" }}>
                    <span className="mono-amount">
                      {receipt.vat_amount != null ? formatCurrency(receipt.vat_amount) : "—"}
                    </span>
                  </Td>
                  <Td style={{ textAlign: "right" }}>
                    <span className="mono-amount">
                      {receipt.amount_inc_vat != null ? formatCurrency(receipt.amount_inc_vat) : "—"}
                    </span>
                  </Td>
                  <Td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                      <Link
                        href={`/dashboard/receipts/${receipt.id}`}
                        className="table-action"
                      >
                        Bekijk
                      </Link>
                      <button
                        onClick={() => {
                          setDeleteTarget(receipt.id);
                        }}
                        className="table-action"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          opacity: 0.3,
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
        </table></TableWrapper>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Bon verwijderen"
        message="Weet je zeker dat je deze bon wilt verwijderen?"
        confirmLabel="Verwijderen"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Bonnen verwijderen"
        message={`Weet je zeker dat je ${selected.size} ${selected.size === 1 ? "bon" : "bonnen"} wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`}
        confirmLabel="Verwijderen"
        onConfirm={() => {
          bulkDeleteMutation.mutate(Array.from(selected));
          setBulkDeleteOpen(false);
        }}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </div>
  );
}
