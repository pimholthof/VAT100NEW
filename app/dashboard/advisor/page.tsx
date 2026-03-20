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
        <p className="empty-state" style={{ marginTop: 32 }}>
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

      {/* Add client */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 32,
          alignItems: "flex-end",
        }}
      >
        <div style={{ flex: 1 }}>
          <label className="label" style={{ display: "block", marginBottom: 4 }}>
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
        <p style={{ color: "var(--color-reserved)", fontSize: 12, marginBottom: 16 }}>
          {linkError}
        </p>
      )}

      {/* Clients table */}
      {isLoading ? (
        <SkeletonTable
          columns="2fr 1fr 1fr 80px"
          headerWidths={[80, 60, 50, 40]}
          bodyWidths={[70, 50, 40, 30]}
        />
      ) : clients.length === 0 ? (
        <p className="empty-state">Nog geen klanten gekoppeld</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)", textAlign: "left" }}>
              <Th>Klant</Th>
              <Th>Bedrijf</Th>
              <Th>Status</Th>
              <Th>Gekoppeld</Th>
              <Th style={{ textAlign: "right" }}>Acties</Th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client: AdvisorClientWithProfile) => (
              <tr key={client.id} style={{ borderBottom: "var(--border-rule)" }}>
                <Td style={{ fontWeight: 400 }}>
                  {client.profile.full_name}
                </Td>
                <Td>{client.profile.studio_name ?? "—"}</Td>
                <Td>
                  <span
                    className="label"
                    style={{
                      color: client.status === "active"
                        ? "var(--color-safe)"
                        : client.status === "pending"
                          ? "var(--color-warning)"
                          : "var(--color-reserved)",
                    }}
                  >
                    {STATUS_LABELS[client.status]}
                  </span>
                </Td>
                <Td>
                  <span className="mono-amount">{formatDate(client.created_at)}</span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  {client.status === "active" && (
                    <button
                      onClick={() => {
                        if (confirm("Weet je zeker dat je deze koppeling wilt intrekken?")) {
                          removeMutation.mutate(client.id);
                        }
                      }}
                      className="table-action"
                      style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.3, padding: 0 }}
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
