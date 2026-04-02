"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getWaitlist } from "@/features/admin/actions";
import { SkeletonTable, Th, Td } from "@/components/ui";
import { AdminStatePanel } from "../AdminStatePanel";

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

export default function WaitlistTab() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-waitlist", search, page],
    queryFn: () => getWaitlist({ search, page, pageSize }),
  });

  if (result?.error) {
    return (
      <AdminStatePanel
        eyebrow="Wachtlijst"
        title="Kan wachtlijst niet laden"
        description={result.error}
        actions={[{ href: "/admin", label: "Terug", variant: "secondary" }]}
      />
    );
  }

  const entries = result?.data?.entries ?? [];
  const totalCount = result?.data?.total ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Zoek op naam of e-mail..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="input-field"
          style={{ maxWidth: 320 }}
        />
      </div>

      {isLoading ? (
        <SkeletonTable rows={5} />
      ) : entries.length === 0 ? (
        <p className="empty-state">Geen wachtlijstinschrijvingen gevonden.</p>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>Naam</Th>
                <Th>E-mail</Th>
                <Th>Bron</Th>
                <Th style={{ textAlign: "right" }}>Datum</Th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.id}>
                  <Td>{(page - 1) * pageSize + i + 1}</Td>
                  <Td>{entry.name || "—"}</Td>
                  <Td>{entry.email}</Td>
                  <Td>{entry.referral || "—"}</Td>
                  <Td style={{ textAlign: "right" }}>{formatDate(entry.created_at)}</Td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="btn-secondary"
              >
                Vorige
              </button>
              <span className="label" style={{ alignSelf: "center" }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="btn-secondary"
              >
                Volgende
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
