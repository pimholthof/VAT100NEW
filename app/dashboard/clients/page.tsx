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
      <div className="flex justify-between items-end mb-[80px]">
        <h1 className="display-title">Klanten</h1>
        <Link
          href="/dashboard/clients/new"
          className="font-sans text-[length:var(--text-label)] font-medium tracking-[0.10em] uppercase px-7 py-3.5 border-[0.5px] border-foreground/25 bg-transparent text-foreground no-underline inline-block transition-opacity duration-200"
        >
          + Nieuwe klant
        </Link>
      </div>

      <div className="mb-8">
        <input
          type="search"
          aria-label="Zoek klanten"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op naam, contactpersoon of e-mail..."
          className="w-full max-w-[400px] py-3.5 px-0 border-0 border-b-[0.5px] border-foreground/15 bg-transparent text-foreground font-mono text-[length:var(--text-mono-md)] font-light outline-none"
        />
      </div>

      {isLoading ? (
        <div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton w-full h-12 mb-px" />
          ))}
        </div>
      ) : result?.error ? (
        <div className="pt-[var(--space-block)]">
          <ErrorMessage>{result.error}</ErrorMessage>
        </div>
      ) : filtered.length === 0 ? (
        <div className="pt-[var(--space-block)]">
          <p className="empty-state">
            {search.trim() ? "Geen klanten gevonden" : "Nog geen klanten"}
          </p>
          {!search.trim() && (
            <Link
              href="/dashboard/clients/new"
              className="table-action opacity-40"
            >
              Voeg je eerste klant toe
            </Link>
          )}
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-[0.5px] border-foreground/15 text-left">
              <Th>Bedrijfsnaam</Th>
              <Th>Contactpersoon</Th>
              <Th>E-mail</Th>
              <Th>Stad</Th>
              <Th className="text-right">Acties</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((client: Client) => (
              <tr
                key={client.id}
                className="border-b-[0.5px] border-foreground/[0.06]"
              >
                <Td>
                  <Link
                    href={`/dashboard/clients/${client.id}`}
                    className="text-foreground font-normal no-underline"
                  >
                    {client.name}
                  </Link>
                </Td>
                <Td>{client.contact_name ?? "—"}</Td>
                <Td>{client.email ?? "—"}</Td>
                <Td>{client.city ?? "—"}</Td>
                <Td className="text-right">
                  <div className="flex gap-3 justify-end">
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className="table-action"
                    >
                      Bekijk
                    </Link>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            "Weet je zeker dat je deze klant wilt verwijderen?",
                          )
                        ) {
                          deleteMutation.mutate(client.id);
                        }
                      }}
                      className="table-action bg-transparent border-none cursor-pointer opacity-30 p-0"
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
        <ErrorMessage className="mt-4">
          {deleteMutation.data.error}
        </ErrorMessage>
      )}
    </div>
  );
}
