"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdvisorClients,
  linkClient,
  removeClient,
  getUserRole,
} from "@/lib/actions/advisor";
import type { AdvisorClientWithProfile } from "@/lib/types";
import { Th, Td, SkeletonTable } from "@/components/ui";
import { formatDate } from "@/lib/format";

const STATUS_LABELS: Record<string, string> = {
  pending: "WACHTEND",
  active: "ACTIEF",
  revoked: "INGETROKKEN",
};

export default function AdvisorPage() {
  const queryClient = useQueryClient();
  const [newClientId, setNewClientId] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const { data: roleResult } = useQuery({
    queryKey: ["user-role"],
    queryFn: () => getUserRole(),
  });

  const { data: clientsResult, isLoading } = useQuery({
    queryKey: ["advisor-clients"],
    queryFn: () => getAdvisorClients(),
    enabled: roleResult?.data === "advisor",
  });

  const linkMutation = useMutation({
    mutationFn: (userId: string) => linkClient(userId),
    onSuccess: (res) => {
      if (res.error) {
        setLinkError(res.error);
      } else {
        setNewClientId("");
        setLinkError(null);
        queryClient.invalidateQueries({ queryKey: ["advisor-clients"] });
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advisor-clients"] });
    },
  });

  if (roleResult?.data !== "advisor") {
    return (
      <div>
        <h1 className="display-title">Advisor</h1>
        <p className="empty-state mt-8">
          Je account is niet ingesteld als advisor.
          Neem contact op met support om je account te upgraden.
        </p>
      </div>
    );
  }

  const clients = clientsResult?.data ?? [];
  const activeClients = clients.filter((c) => c.status === "active");

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="display-title">Klantenoverzicht</h1>
            <p className="page-header-count">
              {activeClients.length} actieve {activeClients.length === 1 ? "klant" : "klanten"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mb-8 items-end">
        <div className="flex-1">
          <label className="label block mb-1">
            Klant koppelen (user ID)
          </label>
          <input
            type="text"
            value={newClientId}
            onChange={(e) => setNewClientId(e.target.value)}
            className="input-field"
            placeholder="UUID van de klant"
          />
        </div>
        <button
          className="action-button"
          disabled={!newClientId.trim() || linkMutation.isPending}
          onClick={() => {
            setLinkError(null);
            linkMutation.mutate(newClientId.trim());
          }}
        >
          KOPPELEN
        </button>
      </div>

      {linkError && (
        <p className="text-[color:var(--color-reserved)] text-xs mb-4">
          {linkError}
        </p>
      )}

      {isLoading ? (
        <SkeletonTable
          columns="2fr 1fr 1fr 80px"
          headerWidths={[80, 60, 50, 40]}
          bodyWidths={[70, 50, 40, 30]}
        />
      ) : clients.length === 0 ? (
        <p className="empty-state">Nog geen klanten gekoppeld</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-foreground/15 text-left">
              <Th>Klant</Th>
              <Th>Bedrijf</Th>
              <Th>Status</Th>
              <Th>Gekoppeld</Th>
              <Th className="text-right">Acties</Th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client: AdvisorClientWithProfile) => (
              <tr key={client.id} className="border-b border-[var(--border-rule)]">
                <Td className="font-normal">
                  {client.profile.full_name}
                </Td>
                <Td>{client.profile.studio_name ?? "—"}</Td>
                <Td>
                  <span
                    className={`label ${
                      client.status === "active"
                        ? "text-[color:var(--color-safe)]"
                        : client.status === "pending"
                          ? "text-[color:var(--color-warning)]"
                          : "text-[color:var(--color-reserved)]"
                    }`}
                  >
                    {STATUS_LABELS[client.status]}
                  </span>
                </Td>
                <Td>
                  <span className="mono-amount">{formatDate(client.created_at)}</span>
                </Td>
                <Td className="text-right">
                  {client.status === "active" && (
                    <button
                      onClick={() => {
                        if (confirm("Weet je zeker dat je deze koppeling wilt intrekken?")) {
                          removeMutation.mutate(client.id);
                        }
                      }}
                      className="table-action bg-transparent border-none cursor-pointer opacity-30 p-0"
                    >
                      Intrekken
                    </button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
