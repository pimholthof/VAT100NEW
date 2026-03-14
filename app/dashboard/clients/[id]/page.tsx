"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getClient,
  getClientStats,
  getClientInvoices,
  updateClient,
} from "@/lib/actions/clients";
import type { ClientInput } from "@/lib/types";

const statusLabels: Record<string, string> = {
  draft: "Concept",
  sent: "Verzonden",
  paid: "Betaald",
  overdue: "Verlopen",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
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
      <p
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-body-lg)",
          fontWeight: 300,
        }}
      >
        Laden...
      </p>
    );
  }

  if (!client) {
    return (
      <div>
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-lg)",
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
            fontWeight: 500,
            color: "var(--foreground)",
          }}
        >
          Terug naar klanten
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Back link + title */}
      <div style={{ marginBottom: 32 }}>
        <Link
          href="/dashboard/clients"
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-sm)",
            fontWeight: 500,
            letterSpacing: "0.02em",
            color: "var(--foreground)",
            opacity: 0.6,
            textDecoration: "none",
          }}
        >
          ← Terug naar klanten
        </Link>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-display), sans-serif",
              fontSize: "var(--text-display-lg)",
              fontWeight: 900,
              letterSpacing: "var(--tracking-display)",
              lineHeight: 1,
              margin: 0,
            }}
          >
            {client.name}
          </h1>
          {!editing && (
            <button
              type="button"
              onClick={startEditing}
              style={buttonSecondaryStyle}
            >
              Bewerken
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            border: "none",
            borderLeft: "2px solid var(--foreground)",
            marginBottom: 24,
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-md)",
            fontWeight: 400,
          }}
        >
          {error}
        </div>
      )}

      {/* Client details */}
      {editing ? (
        <div
          style={{
            border: "none",
            borderTop: "var(--border-rule)",
            borderBottom: "var(--border-rule)",
            padding: 24,
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
                style={inputStyle}
              />
            </FieldGroup>
            <FieldGroup label="BTW-nummer">
              <input
                type="text"
                value={btwNumber}
                onChange={(e) => setBtwNumber(e.target.value)}
                style={inputStyle}
              />
            </FieldGroup>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button
              type="button"
              onClick={() => setEditing(false)}
              style={buttonSecondaryStyle}
            >
              Annuleer
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={buttonPrimaryStyle}
            >
              {saving ? "Opslaan..." : "Opslaan"}
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 0,
            border: "none",
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
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginBottom: 48,
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
      )}

      {/* Invoice history */}
      <h2
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "1.25rem",
          fontWeight: 900,
          letterSpacing: "var(--tracking-display)",
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
            fontSize: "var(--text-body-lg)",
            fontWeight: 300,
            opacity: 0.5,
          }}
        >
          Nog geen facturen voor deze klant.
        </p>
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
              <Th>Nummer</Th>
              <Th>Datum</Th>
              <Th>Status</Th>
              <Th style={{ textAlign: "right" }}>Totaal</Th>
              <Th style={{ textAlign: "right" }}>Actie</Th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} style={{ borderBottom: "var(--border)" }}>
                <Td>
                  <Link
                    href={`/dashboard/invoices/${inv.id}`}
                    style={{
                      color: "var(--foreground)",
                      fontWeight: 500,
                    }}
                  >
                    {inv.invoice_number}
                  </Link>
                </Td>
                <Td>{formatDate(inv.issue_date)}</Td>
                <Td>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 500,
                      letterSpacing: "0.02em",
                      padding: "4px 0",
                      border: "none",
                      borderBottom: "var(--border-rule)",
                      display: "inline-block",
                    }}
                  >
                    {statusLabels[inv.status] ?? inv.status}
                  </span>
                </Td>
                <Td
                  style={{
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatCurrency(inv.total_inc_vat)}
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <Link
                    href={`/dashboard/invoices/${inv.id}/preview`}
                    style={{
                      fontSize: "var(--text-body-xs)",
                      fontWeight: 500,
                      color: "var(--foreground)",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Bekijk
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function DetailCell({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div style={{ padding: "20px 0", borderBottom: "var(--border-rule)" }}>
      <p
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.02em",
          margin: "0 0 4px",
          opacity: 0.6,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-body-lg)",
          fontWeight: 300,
          margin: 0,
        }}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "none", borderTop: "var(--border-rule)", padding: "24px 0" }}>
      <p
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.02em",
          margin: "0 0 8px",
          opacity: 0.6,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "2.5rem",
          fontWeight: 900,
          lineHeight: 1,
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.02em",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
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
        fontSize: "10px",
        letterSpacing: "0.02em",
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
    <td style={{ padding: "12px 8px", fontWeight: 300, ...style }}>
      {children}
    </td>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 2px",
  border: "none",
  borderBottom: "var(--border-input)",
  background: "transparent",
  color: "var(--foreground)",
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "var(--text-body-md)",
  fontWeight: 300,
  outline: "none",
};

const buttonPrimaryStyle: React.CSSProperties = {
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "var(--text-body-lg)",
  fontWeight: 500,
  letterSpacing: "0.05em",
  padding: "12px 20px",
  border: "none",
  background: "var(--foreground)",
  color: "var(--background)",
  cursor: "pointer",
};

const buttonSecondaryStyle: React.CSSProperties = {
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "var(--text-body-md)",
  fontWeight: 500,
  letterSpacing: "0.05em",
  padding: "10px 16px",
  border: "1px solid rgba(13, 13, 11, 0.2)",
  background: "transparent",
  color: "var(--foreground)",
  cursor: "pointer",
};
