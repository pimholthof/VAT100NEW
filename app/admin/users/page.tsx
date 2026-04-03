"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getUsers, getUserKpis } from "@/features/admin/actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminPageKpis } from "@/features/admin/AdminPageKpis";
import type { AdminUser } from "@/lib/types";
import { AdminStatePanel } from "../AdminStatePanel";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <span className={`admin-badge ${isActive ? "admin-badge-success" : "admin-badge-critical"}`}>
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
    queryFn: () =>
      getUsers({ search, status: statusFilter, page, pageSize }),
  });

  const users = result?.data?.users ?? [];
  const total = result?.data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  if (result?.error) {
    return (
      <div className="admin-layout">
        <PageHeader title="Klanten" backHref="/admin" backLabel="Command Center" />
        <AdminStatePanel
          eyebrow="Gebruikers"
          title="Gebruikers konden niet worden geladen"
          description={result.error}
          actions={[{ href: "/admin", label: "Terug naar admin", variant: "secondary" }]}
        />
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <PageHeader title="Klanten" backHref="/admin" backLabel="Command Center" />

      {/* KPI Strip */}
      <AdminPageKpis queryKey="admin-user-kpis" queryFn={getUserKpis} />

      {/* Filters */}
      <div className="admin-toolbar">
        <input
          type="text"
          placeholder="Zoek op naam of studio..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="admin-field mono-amount"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="admin-select label"
        >
          <option value="all">Alle statussen</option>
          <option value="active">Actief</option>
          <option value="suspended">Geblokkeerd</option>
        </select>
      </div>

      {/* Results summary */}
      <div className="admin-summary-row">
        <p className="label">
          {total} gebruiker{total !== 1 ? "s" : ""} gevonden
        </p>
        <p className="label">Pagina {page}{totalPages > 0 ? ` van ${totalPages}` : ""}</p>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="admin-table-shell">
          <div className="admin-empty-state">Gebruikers laden...</div>
        </div>
      ) : users.length === 0 ? (
        <div className="admin-table-shell">
          <div className="admin-empty-state">Geen gebruikers gevonden</div>
        </div>
      ) : (
        <div className="admin-table-shell">
          <div className="admin-table-wrap">
            <table className="admin-table">
            <thead>
              <tr>
                {["Naam", "E-mail", "Status", "Facturen", "Omzet", "Laatste activiteit"].map(
                  (header) => (
                    <th key={header}>
                      {header}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {users.map((user: AdminUser) => (
                <tr key={user.id}>
                  <td>
                    <Link href={`/admin/users/${user.id}`} className="admin-primary-link">
                      {user.full_name || "Naamloos"}
                      {user.studio_name && (
                        <span className="admin-muted-text">
                          {user.studio_name}
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="mono-amount">
                    {user.email}
                  </td>
                  <td>
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="mono-amount admin-right">
                    {user.invoice_count}
                  </td>
                  <td className="mono-amount admin-right">
                    {formatCurrency(user.total_revenue)}
                  </td>
                  <td className="label">
                    {user.last_activity ? formatDate(user.last_activity) : "Nog geen activiteit"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="admin-pagination">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="admin-page-button"
          >
            Vorige
          </button>
          <span className="admin-page-button label">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="admin-page-button"
          >
            Volgende
          </button>
        </div>
      )}
    </div>
  );
}
