"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getClient,
  getClientStats,
  getClientInvoices,
  updateClient,
} from "@/features/clients/actions";
import type { ClientInput } from "@/lib/types";
import {
  DetailCell,
  StatCard,
  FieldGroup,
  Th,
  Td,
  TableWrapper,
  ButtonPrimary,
  ButtonSecondary,
  ErrorMessage,
  PageHeader,
  inputStyle,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/constants/status";

export default function ClientDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: clientResult, isLoading: clientLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: () => getClient(id),
  });

  const { data: statsResult } = useQuery({
    queryKey: ["client-stats", id],
    queryFn: () => getClientStats(id),
    enabled: !!clientResult?.data,
  });

  const { data: invoicesResult } = useQuery({
    queryKey: ["client-invoices", id],
    queryFn: () => getClientInvoices(id),
    enabled: !!clientResult?.data,
  });

  const client = clientResult?.data;
  const stats = statsResult?.data;
  const invoices = invoicesResult?.data ?? [];

  // Edit form state
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [kvkNumber, setKvkNumber] = useState("");
  const [btwNumber, setBtwNumber] = useState("");

  const startEditing = () => {
    if (!client) return;
    setName(client.name);
    setContactName(client.contact_name ?? "");
    setEmail(client.email ?? "");
    setAddress(client.address ?? "");
    setPostalCode(client.postal_code ?? "");
    setCity(client.city ?? "");
    setKvkNumber(client.kvk_number ?? "");
    setBtwNumber(client.btw_number ?? "");
    setEditing(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Bedrijfsnaam is verplicht.");
      return;
    }

    setSaving(true);
    setError(null);

    const input: ClientInput = {
      name,
      contact_name: contactName || null,
      email: email || null,
      address: address || null,
      city: city || null,
      postal_code: postalCode || null,
      kvk_number: kvkNumber || null,
      btw_number: btwNumber || null,
    };

    const result = await updateClient(id, input);
    if (result.error) {
      setError(result.error);
    } else {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["client", id] });
    }
    setSaving(false);
  };

  if (clientLoading) {
    return (
      <div style={{ padding: "64px 0" }}>
        <div className="skeleton" style={{ width: 200, height: 32, marginBottom: 32 }} />
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <div className="skeleton" style={{ width: 80, height: 9, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: "100%", height: 36 }} />
          </div>
        ))}
      </div>
    );
  }

  if (!client) {
    return (
      <div>
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "13px",
            fontWeight: 300,
          }}
        >
          Klant niet gevonden.
        </p>
        <Link
          href="/dashboard/clients"
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-md)",
            fontWeight: 400,
            color: "var(--foreground)",
            textDecoration: "none",
          }}
        >
          Terug naar klanten
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={client.name}
        backHref="/dashboard/clients"
        backLabel="Terug naar klanten"
        action={
          !editing ? (
            <ButtonSecondary onClick={startEditing}>
              Bewerken
            </ButtonSecondary>
          ) : undefined
        }
      />

      {error && (
        <ErrorMessage style={{ marginBottom: 24 }}>{error}</ErrorMessage>
      )}

      {/* Client details */}
      {editing ? (
        <div
          style={{
            borderTop: "0.5px solid rgba(13,13,11,0.08)",
            borderBottom: "0.5px solid rgba(13,13,11,0.08)",
            padding: "24px 0",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            <FieldGroup label="Bedrijfsnaam *">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
            </FieldGroup>
            <FieldGroup label="Contactpersoon">
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                style={inputStyle}
              />
            </FieldGroup>
            <FieldGroup label="E-mailadres">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
            </FieldGroup>
            <FieldGroup label="Adres">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={inputStyle}
              />
            </FieldGroup>
            <FieldGroup label="Postcode">
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                style={inputStyle}
              />
            </FieldGroup>
            <FieldGroup label="Stad">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={inputStyle}
              />
            </FieldGroup>
            <FieldGroup label="KVK-nummer">
              <input
                type="text"
                value={kvkNumber}
                onChange={(e) => setKvkNumber(e.target.value)}
                style={{ ...inputStyle }}
              />
            </FieldGroup>
            <FieldGroup label="BTW-nummer">
              <input
                type="text"
                value={btwNumber}
                onChange={(e) => setBtwNumber(e.target.value)}
                style={{ ...inputStyle }}
              />
            </FieldGroup>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <ButtonSecondary onClick={() => setEditing(false)} style={{ opacity: 0.4 }}>
              Annuleer
            </ButtonSecondary>
            <ButtonPrimary onClick={handleSave} disabled={saving}>
              {saving ? "Opslaan..." : "Opslaan"}
            </ButtonPrimary>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 0,
            marginBottom: 32,
          }}
        >
          <DetailCell label="Contactpersoon" value={client.contact_name} />
          <DetailCell label="E-mailadres" value={client.email} />
          <DetailCell label="Adres" value={client.address} />
          <DetailCell
            label="Postcode / Stad"
            value={
              [client.postal_code, client.city].filter(Boolean).join(", ") ||
              null
            }
          />
          <DetailCell label="KVK-nummer" value={client.kvk_number} />
          <DetailCell label="BTW-nummer" value={client.btw_number} />
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div
          style={{
            borderTop: "0.5px solid rgba(13,13,11,0.15)",
            marginBottom: 48,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
            className="stat-cards-grid"
          >
            <StatCard
              label="Totaal gefactureerd"
              value={formatCurrency(stats.totalInvoiced)}
            />
            <StatCard
              label="Betaald"
              value={formatCurrency(stats.totalPaid)}
            />
            <StatCard
              label="Openstaand"
              value={formatCurrency(stats.totalOutstanding)}
            />
          </div>
        </div>
      )}

      {/* Invoice history */}
      <h2
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "var(--text-display-sm)",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          lineHeight: 1,
          margin: "0 0 16px",
        }}
      >
        Factuurgeschiedenis
      </h2>

      {invoices.length === 0 ? (
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "13px",
            fontWeight: 300,
            opacity: 0.3,
            paddingTop: 48,
          }}
        >
          Nog geen facturen voor deze klant.
        </p>
      ) : (
        <TableWrapper><table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 500,
          }}
        >
          <thead>
            <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)", textAlign: "left" }}>
              <Th>Nummer</Th>
              <Th>Datum</Th>
              <Th>Status</Th>
              <Th style={{ textAlign: "right" }}>Totaal</Th>
              <Th style={{ textAlign: "right" }}>Actie</Th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} style={{ borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
                <Td>
                  <Link
                    href={`/dashboard/invoices/${inv.id}`}
                    style={{
                      fontSize: "var(--text-mono-md)",
                      color: "var(--foreground)",
                      fontWeight: 400,
                      textDecoration: "none",
                    }}
                  >
                    {inv.invoice_number}
                  </Link>
                </Td>
                <Td>
                  <span style={{ fontSize: "var(--text-mono-md)" }}>
                    {formatDate(inv.issue_date)}
                  </span>
                </Td>
                <Td>
                  <span
                    style={{
                      fontSize: "var(--text-label)",
                      fontWeight: 500,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {STATUS_LABELS[inv.status] ?? inv.status}
                  </span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "var(--text-mono-md)", fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(inv.total_inc_vat)}
                  </span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <Link
                    href={`/dashboard/invoices/${inv.id}/preview`}
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
                </Td>
              </tr>
            ))}
          </tbody>
        </table></TableWrapper>
      )}
    </div>
  );
}
