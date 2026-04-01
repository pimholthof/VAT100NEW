"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getCustomerOverview, exportAllCustomersCSV } from "@/features/admin/actions";
import {
  PageHeader,
  TableWrapper,
  Th,
  Td,
  Input,
  Select,
  ButtonSecondary,
  SkeletonTable,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type { CustomerOverviewItem } from "@/features/admin/actions";

function downloadCSV(csv: string, filename: string) {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminCustomersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const pageSize = 25;

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-customers", search, statusFilter, page],
    queryFn: () => getCustomerOverview({ search, status: statusFilter, page, pageSize }),
  });

  const customers = result?.data?.customers ?? [];
  const total = result?.data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleExportAll = async () => {
    setExporting(true);
    const res = await exportAllCustomersCSV();
    if (res.data) {
      downloadCSV(res.data, `vat100-klanten-${new Date().toISOString().slice(0, 10)}.csv`);
    }
    setExporting(false);
  };

  return (
    <div>
      <PageHeader
        title="Klantbeheer"
        backHref="/admin"
        backLabel="Beheer"
        action={
          <ButtonSecondary onClick={handleExportAll} disabled={exporting}>
            {exporting ? "Exporteren..." : "Exporteer alle klanten"}
          </ButtonSecondary>
        }
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
        <Input
          type="text"
          placeholder="Zoek op naam of studio..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ flex: 1, minWidth: 200 }}
        />
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ width: "auto", minWidth: 160 }}
        >
          <option value="all">Alle statussen</option>
          <option value="active">Actief</option>
          <option value="suspended">Geblokkeerd</option>
        </Select>
      </div>

      <p className="label" style={{ marginBottom: 16 }}>
        {total} klant{total !== 1 ? "en" : ""} gevonden
      </p>

      {isLoading ? (
        <SkeletonTable
          columns="2fr 1fr 1fr 1fr 1fr 1fr"
          rows={8}
          headerWidths={[60, 50, 40, 40, 50, 50]}
          bodyWidths={[50, 40, 30, 30, 40, 40]}
        />
      ) : customers.length === 0 ? (
        <p className="empty-state">Geen klanten gevonden</p>
      ) : (
        <TableWrapper>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>Naam</Th>
                <Th>Plan</Th>
                <Th>Status</Th>
                <Th style={{ textAlign: "right" }}>Facturen</Th>
                <Th style={{ textAlign: "right" }}>Omzet</Th>
                <Th>Aangemeld</Th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer: CustomerOverviewItem) => (
                <tr key={customer.id}>
                  <Td>
                    <Link
                      href={`/admin/customers/${customer.id}`}
                      style={{ textDecoration: "none", color: "var(--foreground)", fontWeight: 500 }}
                    >
                      {customer.full_name || "Naamloos"}
                      {customer.studio_name && (
                        <span className="label" style={{ display: "block", marginTop: 2, fontWeight: 400 }}>
                          {customer.studio_name}
                        </span>
                      )}
                    </Link>
                  </Td>
                  <Td>
                    {customer.plan_name ? (
                      <span className="label-strong" style={{ fontSize: 10 }}>{customer.plan_name}</span>
                    ) : (
                      <span className="label">{"\u2014"}</span>
                    )}
                  </Td>
                  <Td>
                    <span className={`status-badge ${customer.status === "active" ? "status-badge--sent" : "status-badge--overdue"}`}>
                      {customer.status === "active" ? "Actief" : "Geblokkeerd"}
                    </span>
                  </Td>
                  <Td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {customer.invoice_count}
                  </Td>
                  <Td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(customer.total_revenue)}
                  </Td>
                  <Td>
                    <span className="label">{formatDate(customer.created_at)}</span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrapper>
      )}

      {/* Paginering */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 32 }}>
          <ButtonSecondary
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Vorige
          </ButtonSecondary>
          <span className="label" style={{ padding: "8px 16px" }}>
            {page} / {totalPages}
          </span>
          <ButtonSecondary
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Volgende
          </ButtonSecondary>
        </div>
      )}
    </div>
  );
}
