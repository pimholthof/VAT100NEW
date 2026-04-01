"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getUsers, getUserKpis } from "@/features/admin/actions";
import { AdminPageKpis } from "@/features/admin/AdminPageKpis";
import { PageHeader, TableWrapper, Th, Td, Input, Select, ButtonSecondary, SkeletonTable } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type { AdminUser } from "@/lib/types";

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <span className={`status-badge ${isActive ? "status-badge--sent" : "status-badge--overdue"}`}>
      {isActive ? "Actief" : "Geblokkeerd"}
    </span>
  );
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-users", search, statusFilter, page],
    queryFn: () => getUsers({ search, status: statusFilter, page, pageSize }),
  });

  const users = result?.data?.users ?? [];
  const total = result?.data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <PageHeader title="Gebruikers" backHref="/admin" backLabel="Beheer" />

      {/* KPI's */}
      <AdminPageKpis queryKey="user-kpis" queryFn={getUserKpis} />

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

      {/* Resultaten */}
      <p className="label" style={{ marginBottom: 16 }}>
        {total} gebruiker{total !== 1 ? "s" : ""} gevonden
      </p>

      {isLoading ? (
        <SkeletonTable
          columns="2fr 2fr 1fr 1fr 1fr 1fr"
          rows={8}
          headerWidths={[60, 70, 50, 40, 50, 60]}
          bodyWidths={[50, 60, 40, 30, 40, 50]}
        />
      ) : users.length === 0 ? (
        <p className="empty-state">Geen gebruikers gevonden</p>
      ) : (
        <TableWrapper>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>Naam</Th>
                <Th>E-mail</Th>
                <Th>Status</Th>
                <Th style={{ textAlign: "right" }}>Facturen</Th>
                <Th style={{ textAlign: "right" }}>Omzet</Th>
                <Th>Aangemeld</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: AdminUser) => (
                <tr key={user.id}>
                  <Td>
                    <Link
                      href={`/admin/users/${user.id}`}
                      style={{ textDecoration: "none", color: "var(--foreground)", fontWeight: 500 }}
                    >
                      {user.full_name || "Naamloos"}
                      {user.studio_name && (
                        <span className="label" style={{ display: "block", marginTop: 2, fontWeight: 400 }}>
                          {user.studio_name}
                        </span>
                      )}
                    </Link>
                  </Td>
                  <Td style={{ fontSize: "var(--text-body-sm)" }}>
                    {user.email}
                  </Td>
                  <Td>
                    <StatusBadge status={user.status} />
                  </Td>
                  <Td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {user.invoice_count}
                  </Td>
                  <Td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(user.total_revenue)}
                  </Td>
                  <Td>
                    <span className="label">{formatDate(user.created_at)}</span>
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
