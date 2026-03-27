"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getUsers } from "@/features/admin/actions";
import { PageHeader } from "@/components/ui/PageHeader";
import type { AdminUser } from "@/lib/types";

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
    <span
      className="label"
      style={{
        padding: "2px 8px",
        fontSize: 9,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        background: isActive ? "rgba(0,0,0,0.04)" : "rgba(220,38,38,0.1)",
        color: isActive ? "var(--foreground)" : "rgb(220,38,38)",
      }}
    >
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

  return (
    <div>
      <PageHeader title="Gebruikers" backHref="/admin" backLabel="Platform" />

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 32,
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Zoek op naam of studio..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="mono-amount"
          style={{
            padding: "10px 16px",
            border: "var(--border-light)",
            background: "transparent",
            flex: 1,
            minWidth: 200,
            fontSize: "var(--text-body)",
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="label"
          style={{
            padding: "10px 16px",
            border: "var(--border-light)",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          <option value="all">Alle statussen</option>
          <option value="active">Actief</option>
          <option value="suspended">Geblokkeerd</option>
        </select>
      </div>

      {/* Results summary */}
      <p className="label" style={{ marginBottom: 16, opacity: 0.4 }}>
        {total} gebruiker{total !== 1 ? "s" : ""} gevonden
      </p>

      {/* Table */}
      {isLoading ? (
        <div style={{ opacity: 0.3, padding: 40, textAlign: "center" }}>
          <p className="label">Laden...</p>
        </div>
      ) : users.length === 0 ? (
        <div style={{ opacity: 0.3, padding: 40, textAlign: "center" }}>
          <p className="label">Geen gebruikers gevonden</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Naam", "E-mail", "Status", "Facturen", "Omzet", "Aangemeld"].map(
                  (header) => (
                    <th
                      key={header}
                      className="label"
                      style={{
                        textAlign: "left",
                        padding: "12px 16px",
                        borderBottom: "var(--border-light)",
                        opacity: 0.4,
                        fontWeight: 500,
                        fontSize: 10,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      {header}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {users.map((user: AdminUser) => (
                <tr
                  key={user.id}
                  style={{
                    borderBottom: "var(--border-light)",
                  }}
                >
                  <td style={{ padding: "16px" }}>
                    <Link
                      href={`/admin/users/${user.id}`}
                      style={{
                        textDecoration: "none",
                        color: "var(--foreground)",
                        fontWeight: 500,
                      }}
                    >
                      {user.full_name || "Naamloos"}
                      {user.studio_name && (
                        <span
                          className="label"
                          style={{
                            display: "block",
                            opacity: 0.4,
                            marginTop: 2,
                            fontWeight: 400,
                          }}
                        >
                          {user.studio_name}
                        </span>
                      )}
                    </Link>
                  </td>
                  <td
                    className="mono-amount"
                    style={{ padding: "16px", fontSize: "var(--text-body)" }}
                  >
                    {user.email}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <StatusBadge status={user.status} />
                  </td>
                  <td
                    className="mono-amount"
                    style={{ padding: "16px", textAlign: "right" }}
                  >
                    {user.invoice_count}
                  </td>
                  <td
                    className="mono-amount"
                    style={{ padding: "16px", textAlign: "right" }}
                  >
                    {formatCurrency(user.total_revenue)}
                  </td>
                  <td
                    className="label"
                    style={{ padding: "16px", opacity: 0.5 }}
                  >
                    {formatDate(user.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginTop: 32,
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="label"
            style={{
              padding: "8px 16px",
              border: "var(--border-light)",
              background: "transparent",
              cursor: page === 1 ? "default" : "pointer",
              opacity: page === 1 ? 0.3 : 1,
            }}
          >
            Vorige
          </button>
          <span
            className="label"
            style={{ padding: "8px 16px", opacity: 0.5 }}
          >
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="label"
            style={{
              padding: "8px 16px",
              border: "var(--border-light)",
              background: "transparent",
              cursor: page === totalPages ? "default" : "pointer",
              opacity: page === totalPages ? 0.3 : 1,
            }}
          >
            Volgende
          </button>
        </div>
      )}
    </div>
  );
}
