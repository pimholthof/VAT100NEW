"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getWaitlist } from "@/features/admin/actions";
import { PageHeader } from "@/components/ui/PageHeader";

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

  return (
    <div>
      <PageHeader title="Wachtlijst" backHref="/admin" backLabel="Platform" />

      {/* Search */}
      <div style={{ marginBottom: 32 }}>
        <input
          type="text"
          placeholder="Zoek op naam of e-mail..."
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
            width: "100%",
            maxWidth: 400,
            fontSize: "var(--text-body)",
          }}
        />
      </div>

      <p className="label" style={{ marginBottom: 16, opacity: 0.4 }}>
        {total} aanmelding{total !== 1 ? "en" : ""}
      </p>

      {isLoading ? (
        <p className="label" style={{ opacity: 0.3, padding: 40, textAlign: "center" }}>
          Laden...
        </p>
      ) : entries.length === 0 ? (
        <p className="label" style={{ opacity: 0.3, padding: 40, textAlign: "center" }}>
          Nog geen aanmeldingen
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["#", "Naam", "E-mail", "Bron", "Datum"].map((header) => (
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
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.id} style={{ borderBottom: "var(--border-light)" }}>
                  <td
                    className="mono-amount"
                    style={{ padding: "14px 16px", opacity: 0.3 }}
                  >
                    {(page - 1) * pageSize + i + 1}
                  </td>
                  <td style={{ padding: "14px 16px", fontWeight: 500 }}>
                    {entry.name || "—"}
                  </td>
                  <td
                    className="mono-amount"
                    style={{ padding: "14px 16px", fontSize: "var(--text-body)" }}
                  >
                    {entry.email}
                  </td>
                  <td
                    className="label"
                    style={{ padding: "14px 16px", opacity: 0.4 }}
                  >
                    {entry.referral || "—"}
                  </td>
                  <td
                    className="label"
                    style={{ padding: "14px 16px", opacity: 0.5 }}
                  >
                    {formatDate(entry.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
          <span className="label" style={{ padding: "8px 16px", opacity: 0.5 }}>
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
