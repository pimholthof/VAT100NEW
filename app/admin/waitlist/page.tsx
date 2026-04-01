"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getWaitlist } from "@/features/admin/actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminStatePanel } from "../AdminStatePanel";

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

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

  if (result?.error) {
    return (
      <div className="admin-layout">
        <PageHeader title="Wachtlijst" backHref="/admin" backLabel="Platform" />
        <AdminStatePanel
          eyebrow="Wachtlijst"
          title="Wachtlijst kon niet worden geladen"
          description={result.error}
          actions={[{ href: "/admin", label: "Terug naar admin", variant: "secondary" }]}
        />
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <PageHeader title="Wachtlijst" backHref="/admin" backLabel="Platform" />

      {/* Search */}
      <div className="admin-toolbar">
        <input
          type="text"
          placeholder="Zoek op naam of e-mail..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="admin-field mono-amount"
        />
      </div>

      <div className="admin-summary-row">
        <p className="label">{total} aanmelding{total !== 1 ? "en" : ""}</p>
        <p className="label">Pagina {page}{totalPages > 0 ? ` van ${totalPages}` : ""}</p>
      </div>

      {isLoading ? (
        <div className="admin-table-shell">
          <div className="admin-empty-state">Wachtlijst laden...</div>
        </div>
      ) : entries.length === 0 ? (
        <div className="admin-table-shell">
          <div className="admin-empty-state">Nog geen aanmeldingen</div>
        </div>
      ) : (
        <div className="admin-table-shell">
          <div className="admin-table-wrap">
            <table className="admin-table">
            <thead>
              <tr>
                {["#", "Naam", "E-mail", "Bron", "Datum"].map((header) => (
                  <th key={header}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.id}>
                  <td className="mono-amount label">
                    {(page - 1) * pageSize + i + 1}
                  </td>
                  <td>
                    {entry.name || "—"}
                  </td>
                  <td className="mono-amount">
                    {entry.email}
                  </td>
                  <td className="label">
                    {entry.referral || "—"}
                  </td>
                  <td className="label">
                    {formatDate(entry.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

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
