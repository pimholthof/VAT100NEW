"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getClients, deleteClient } from "@/lib/actions/clients";
import type { Client } from "@/lib/types";
import { Th, Td, ErrorMessage } from "@/components/ui";

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: result, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => getClients(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const clients = result?.data ?? [];
  const filtered = search.trim()
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
          c.email?.toLowerCase().includes(search.toLowerCase())
      )
    : clients;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 64,
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "var(--text-display-lg)",
            fontWeight: 900,
            letterSpacing: "var(--tracking-display)",
            lineHeight: 0.9,
            margin: 0,
          }}
        >
          Klanten
        </h1>
        <Link
          href="/dashboard/clients/new"
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-label)",
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "12px 24px",
            border: "0.5px solid var(--foreground)",
            background: "transparent",
            color: "var(--foreground)",
            textDecoration: "none",
            display: "inline-block",
            transition: "all 0.2s ease",
          }}
        >
          + Nieuwe klant
        </Link>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 24 }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op naam, contactpersoon of e-mail..."
          style={{
            width: "100%",
            maxWidth: 400,
            padding: "12px 0",
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
              style={{ width: "100%", height: 40, marginBottom: 1 }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ paddingTop: 48 }}>
          <p
            style={{
              fontFamily: "var(--font-body), sans-serif",
              fontSize: "13px",
              fontWeight: 300,
              opacity: 0.3,
              margin: "0 0 16px",
            }}
          >
            {search.trim()
              ? "Geen klanten gevonden."
              : "Nog geen klanten aangemaakt."}
          </p>
          {!search.trim() && (
            <Link
              href="/dashboard/clients/new"
              style={{
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "var(--text-body-md)",
                fontWeight: 400,
                color: "var(--foreground)",
                textDecoration: "none",
                opacity: 0.6,
              }}
            >
              Voeg je eerste klant toe
            </Link>
          )}
        </div>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
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
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      style={{
                        fontSize: "var(--text-label)",
                        fontWeight: 500,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--foreground)",
                        textDecoration: "none",
                      }}
                    >
                      Bekijk
                    </Link>
                    <button
                      onClick={() => {
                        if (confirm("Weet je zeker dat je deze klant wilt verwijderen?")) {
                          deleteMutation.mutate(client.id);
                        }
                      }}
                      style={{
                        fontSize: "var(--text-label)",
                        fontWeight: 500,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--foreground)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        opacity: 0.4,
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
