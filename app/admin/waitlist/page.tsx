"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getWaitlist, getWaitlistKpis } from "@/features/admin/actions";
import { AdminPageKpis } from "@/features/admin/AdminPageKpis";
import { PageHeader, TableWrapper, Th, Td, Input, ButtonSecondary, SkeletonTable } from "@/components/ui";
import { formatDateLong } from "@/lib/format";

export default function AdminWaitlistPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-waitlist", search, page],
    queryFn: () => getWaitlist({ search, page, pageSize }),
  });

  const entries = result?.data?.entries ?? [];
  const total = result?.data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <PageHeader title="Wachtlijst" backHref="/admin" backLabel="Beheer" />

      {/* KPI's */}
      <AdminPageKpis queryKey="waitlist-kpis" queryFn={getWaitlistKpis} />

      {/* Zoeken */}
      <div style={{ marginBottom: 32 }}>
        <Input
          type="text"
          placeholder="Zoek op naam of e-mail..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ maxWidth: 400 }}
        />
      </div>

      <p className="label" style={{ marginBottom: 16 }}>
        {total} aanmelding{total !== 1 ? "en" : ""}
      </p>

      {isLoading ? (
        <SkeletonTable
          columns="0.5fr 2fr 2fr 1fr 1.5fr"
          rows={10}
          headerWidths={[30, 60, 70, 50, 60]}
          bodyWidths={[20, 50, 60, 40, 50]}
        />
      ) : entries.length === 0 ? (
        <p className="empty-state">Nog geen aanmeldingen</p>
      ) : (
        <TableWrapper>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>Naam</Th>
                <Th>E-mail</Th>
                <Th>Bron</Th>
                <Th>Datum</Th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.id}>
                  <Td style={{ opacity: 0.3, fontVariantNumeric: "tabular-nums" }}>
                    {(page - 1) * pageSize + i + 1}
                  </Td>
                  <Td style={{ fontWeight: 500 }}>
                    {entry.name || "\u2014"}
                  </Td>
                  <Td style={{ fontSize: "var(--text-body-sm)" }}>
                    {entry.email}
                  </Td>
                  <Td>
                    <span className="label">{entry.referral || "\u2014"}</span>
                  </Td>
                  <Td>
                    <span className="label">{formatDateLong(entry.created_at)}</span>
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
