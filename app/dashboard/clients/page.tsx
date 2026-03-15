"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getClients, deleteClient } from "@/lib/actions/clients";
import type { Client } from "@/lib/types";
import { Th, Td, ErrorMessage } from "@/components/ui";

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search to avoid excessive server calls
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: result, isLoading } = useQuery({
    queryKey: ["clients", debouncedSearch],
    queryFn: () => getClients(debouncedSearch || undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const filtered = result?.data ?? [];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 80,
        }}
      >
        <h1 className="display-title">
          Klanten
        </h1>
        <Link
          href="/dashboard/clients/new"
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-label)",
            fontWeight: 500,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            padding: "14px 28px",
            border: "0.5px solid rgba(13,13,11,0.25)",
            background: "transparent",
            color: "var(--foreground)",
            textDecoration: "none",
            display: "inline-block",
            transition: "opacity 0.2s ease",
          }}
        >
          + Nieuwe klant
        </Link>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 32 }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op naam, contactpersoon of e-mail..."
          style={{
            width: "100%",
            maxWidth: 400,
            padding: "14px 0",
            border: "none",
            borderBottom: "0.5px solid rgba(13,13,11,0.15)",
            background: "transparent",
            color: "var(--foreground)",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "var(--text-mono-md)",
            fontWeight: 300,
            outline: "none",
          }}
        />
      </div>

      {isLoading ? (
        <div>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ width: "100%", height: 48, marginBottom: 1 }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ paddingTop: "var(--space-block)" }}>
          <p className="empty-state">
            {search.trim() ? "Geen klanten gevonden" : "Nog geen klanten"}
          </p>
          {!search.trim() && (
            <Link
              href="/dashboard/clients/new"
              className="table-action"
              style={{ opacity: 0.4 }}
            >
              Voeg je eerste klant toe
            </Link>
          )}
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)", textAlign: "left" }}>
              <Th>Bedrijfsnaam</Th>
              <Th>Contactpersoon</Th>
              <Th>E-mail</Th>
              <Th>Stad</Th>
              <Th style={{ textAlign: "right" }}>Acties</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((client: Client) => (
              <tr key={client.id} style={{ borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
                <Td>
                  <Link
                    href={`/dashboard/clients/${client.id}`}
                    style={{
                      color: "var(--foreground)",
                      fontWeight: 400,
                      textDecoration: "none",
                    }}
                  >
                    {client.name}
                  </Link>
                </Td>
                <Td>{client.contact_name ?? "—"}</Td>
                <Td>{client.email ?? "—"}</Td>
                <Td>{client.city ?? "—"}</Td>
                <Td style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className="table-action"
                    >
                      Bekijk
                    </Link>
                    <button
                      onClick={() => {
                        if (confirm("Weet je zeker dat je deze klant wilt verwijderen?")) {
                          deleteMutation.mutate(client.id);
                        }
                      }}
                      className="table-action"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        opacity: 0.3,
                        padding: 0,
                      }}
                    >
                      Verwijder
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {deleteMutation.data?.error && (
        <ErrorMessage style={{ marginTop: 16 }}>
          {deleteMutation.data.error}
        </ErrorMessage>
      )}
    </div>
  );
}
