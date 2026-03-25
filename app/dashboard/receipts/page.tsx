"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getReceipts, deleteReceipt } from "@/features/receipts/actions";
import { getKostensoortByCode, KOSTENSOORTEN } from "@/lib/constants/costs";
import type { Receipt } from "@/lib/types";
import { Th, Td, SkeletonTable, SearchFilter, TableWrapper } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

const CATEGORY_OPTIONS = KOSTENSOORTEN.map((k) => ({
  value: k.label,
  label: k.label,
}));

export default function ReceiptsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

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

  const receipts = result?.data ?? [];

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
            className="label-strong"
            style={{
              padding: "14px 24px",
              border: "0.5px solid rgba(13,13,11,0.25)",
              background: "transparent",
              color: "var(--foreground)",
              textDecoration: "none",
              display: "inline-block",
              transition: "opacity 0.2s ease",
            }}
          >
            Exporteer CSV
          </a>
          <Link
            href="/dashboard/receipts/new"
            className="label-strong"
            style={{
              padding: "14px 28px",
              border: "0.5px solid rgba(13,13,11,0.25)",
              background: "transparent",
              color: "var(--foreground)",
              textDecoration: "none",
              display: "inline-block",
              transition: "opacity 0.2s ease",
            }}
          >
            + Nieuwe bon
          </Link>
        </div>
      </div>

      {/* Search & Filter */}
      <SearchFilter
        placeholder="Zoek op leverancier of bedrag..."
        filters={[
          { key: "category", label: "Alle categorieën", options: CATEGORY_OPTIONS },
        ]}
        onSearch={handleSearch}
        onFilterChange={handleFilter}
      />

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
              <Th style={{ width: 24 }}></Th>
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

              return (
                <tr key={receipt.id} style={{ borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
                  <Td style={{ width: 24, textAlign: "center", opacity: 0.4 }}>
                    {receipt.storage_path ? "📷" : ""}
                  </Td>
                  <Td>
                    <span className="mono-amount">
                      {receipt.receipt_date ? formatDate(receipt.receipt_date) : "—"}
                    </span>
                  </Td>
                  <Td style={{ fontWeight: 400 }}>{receipt.vendor_name ?? "—"}</Td>
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
                          if (confirm("Weet je zeker dat je deze bon wilt verwijderen?")) {
                            deleteMutation.mutate(receipt.id);
                          }
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
    </div>
  );
}
