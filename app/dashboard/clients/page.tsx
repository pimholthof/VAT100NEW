"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getClients, deleteClient } from "@/lib/actions/clients";
import type { Client } from "@/lib/types";

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
          marginBottom: 32,
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "var(--text-display-md)",
            fontWeight: 900,
            letterSpacing: "var(--tracking-display)",
            lineHeight: 1,
            margin: 0,
          }}
        >
          Klanten
        </h1>
        <Link
          href="/dashboard/clients/new"
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-lg)",
            fontWeight: 500,
            letterSpacing: "var(--tracking-caps)",
            textTransform: "uppercase",
            padding: "12px 20px",
            border: "none",
            background: "var(--foreground)",
            color: "var(--background)",
            textDecoration: "none",
            display: "inline-block",
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
            padding: "10px 12px",
            border: "1px solid var(--foreground)",
            background: "var(--background)",
            color: "var(--foreground)",
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-md)",
            fontWeight: 300,
            outline: "none",
          }}
        />
      </div>

      {isLoading ? (
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-lg)",
            fontWeight: 300,
          }}
        >
          Laden...
        </p>
      ) : filtered.length === 0 ? (
        <div
          style={{
            border: "1px solid var(--foreground)",
            padding: 48,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-body), sans-serif",
              fontSize: "var(--text-body-lg)",
              fontWeight: 300,
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
                fontWeight: 500,
                color: "var(--foreground)",
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
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-md)",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--foreground)",
                textAlign: "left",
              }}
            >
              <Th>Bedrijfsnaam</Th>
              <Th>Contactpersoon</Th>
              <Th>E-mail</Th>
              <Th>Stad</Th>
              <Th style={{ textAlign: "right" }}>Acties</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((client: Client) => (
              <tr
                key={client.id}
                style={{ borderBottom: "var(--border)" }}
              >
                <Td>
                  <Link
                    href={`/dashboard/clients/${client.id}`}
                    style={{
                      color: "var(--foreground)",
                      fontWeight: 500,
                    }}
                  >
                    {client.name}
                  </Link>
                </Td>
                <Td>{client.contact_name ?? "—"}</Td>
                <Td>{client.email ?? "—"}</Td>
                <Td>{client.city ?? "—"}</Td>
                <Td style={{ textAlign: "right" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "flex-end",
                    }}
                  >
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      style={{
                        fontSize: "var(--text-body-xs)",
                        fontWeight: 500,
                        color: "var(--foreground)",
                        textTransform: "uppercase",
                        letterSpacing: "var(--tracking-caps)",
                      }}
                    >
                      Bekijk
                    </Link>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            "Weet je zeker dat je deze klant wilt verwijderen?"
                          )
                        ) {
                          deleteMutation.mutate(client.id);
                        }
                      }}
                      style={{
                        fontSize: "var(--text-body-xs)",
                        fontWeight: 500,
                        color: "var(--foreground)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textTransform: "uppercase",
                        letterSpacing: "var(--tracking-caps)",
                        opacity: 0.6,
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
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-md)",
            fontWeight: 400,
            marginTop: 16,
            padding: "12px 16px",
            border: "1px solid var(--foreground)",
          }}
        >
          {deleteMutation.data.error}
        </p>
      )}
    </div>
  );
}

function Th({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <th
      style={{
        fontWeight: 500,
        fontSize: "var(--text-body-xs)",
        letterSpacing: "var(--tracking-caps)",
        textTransform: "uppercase",
        padding: "12px 8px",
        ...style,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <td
      style={{
        padding: "12px 8px",
        fontWeight: 300,
        ...style,
      }}
    >
      {children}
    </td>
  );
}
