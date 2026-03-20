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
} from "@/lib/actions/clients";
import type { ClientInput } from "@/lib/types";
import {
  DetailCell,
  StatCard,
  FieldGroup,
  Th,
  Td,
  ButtonPrimary,
  ButtonSecondary,
  ErrorMessage,
  PageHeader,
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
      <div className="py-16">
        <div className="skeleton w-[200px] h-8 mb-8" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="mb-5">
            <div className="skeleton w-[80px] h-[9px] mb-2" />
            <div className="skeleton w-full h-9" />
          </div>
        ))}
      </div>
    );
  }

  if (!client) {
    return (
      <div>
        <p className="font-sans text-[13px] font-light">
          Klant niet gevonden.
        </p>
        <Link
          href="/dashboard/clients"
          className="font-sans text-[length:var(--text-body-md)] font-normal text-foreground no-underline"
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
        <ErrorMessage className="mb-6">{error}</ErrorMessage>
      )}

      {editing ? (
        <div className="border-t-[0.5px] border-b-[0.5px] border-foreground/[0.08] py-6 mb-8">
          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Bedrijfsnaam *">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full py-2 px-0 border-0 border-b-[0.6px] border-[var(--vat-dark-grey)] bg-transparent text-foreground font-sans text-base font-normal outline-none transition-[border-color] duration-200"
              />
            </FieldGroup>
            <FieldGroup label="Contactpersoon">
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full py-2 px-0 border-0 border-b-[0.6px] border-[var(--vat-dark-grey)] bg-transparent text-foreground font-sans text-base font-normal outline-none transition-[border-color] duration-200"
              />
            </FieldGroup>
            <FieldGroup label="E-mailadres">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full py-2 px-0 border-0 border-b-[0.6px] border-[var(--vat-dark-grey)] bg-transparent text-foreground font-sans text-base font-normal outline-none transition-[border-color] duration-200"
              />
            </FieldGroup>
            <FieldGroup label="Adres">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full py-2 px-0 border-0 border-b-[0.6px] border-[var(--vat-dark-grey)] bg-transparent text-foreground font-sans text-base font-normal outline-none transition-[border-color] duration-200"
              />
            </FieldGroup>
            <FieldGroup label="Postcode">
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full py-2 px-0 border-0 border-b-[0.6px] border-[var(--vat-dark-grey)] bg-transparent text-foreground font-sans text-base font-normal outline-none transition-[border-color] duration-200"
              />
            </FieldGroup>
            <FieldGroup label="Stad">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full py-2 px-0 border-0 border-b-[0.6px] border-[var(--vat-dark-grey)] bg-transparent text-foreground font-sans text-base font-normal outline-none transition-[border-color] duration-200"
              />
            </FieldGroup>
            <FieldGroup label="KVK-nummer">
              <input
                type="text"
                value={kvkNumber}
                onChange={(e) => setKvkNumber(e.target.value)}
                className="w-full py-2 px-0 border-0 border-b-[0.6px] border-[var(--vat-dark-grey)] bg-transparent text-foreground font-mono text-base font-normal outline-none transition-[border-color] duration-200"
              />
            </FieldGroup>
            <FieldGroup label="BTW-nummer">
              <input
                type="text"
                value={btwNumber}
                onChange={(e) => setBtwNumber(e.target.value)}
                className="w-full py-2 px-0 border-0 border-b-[0.6px] border-[var(--vat-dark-grey)] bg-transparent text-foreground font-mono text-base font-normal outline-none transition-[border-color] duration-200"
              />
            </FieldGroup>
          </div>
          <div className="flex gap-3 mt-5">
            <ButtonSecondary
              onClick={() => setEditing(false)}
              className="opacity-40"
            >
              Annuleer
            </ButtonSecondary>
            <ButtonPrimary onClick={handleSave} disabled={saving}>
              {saving ? "Opslaan..." : "Opslaan"}
            </ButtonPrimary>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-0 mb-8">
          <DetailCell label="Contactpersoon" value={client.contact_name} />
          <DetailCell label="E-mailadres" value={client.email} />
          <DetailCell label="Adres" value={client.address} />
          <DetailCell
            label="Postcode / Stad"
            value={
              [client.postal_code, client.city]
                .filter(Boolean)
                .join(", ") || null
            }
          />
          <DetailCell label="KVK-nummer" value={client.kvk_number} />
          <DetailCell label="BTW-nummer" value={client.btw_number} />
        </div>
      )}

      {stats && (
        <div className="border-t-[0.5px] border-foreground/15 mb-12">
          <div className="stat-cards-grid grid grid-cols-3 gap-4">
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

      <h2 className="font-[family-name:var(--font-display)] text-[length:var(--text-display-sm)] font-bold tracking-[0.08em] uppercase leading-none mb-4">
        Factuurgeschiedenis
      </h2>

      {invoices.length === 0 ? (
        <p className="font-sans text-[13px] font-light opacity-30 pt-12">
          Nog geen facturen voor deze klant.
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-[0.5px] border-foreground/15 text-left">
              <Th>Nummer</Th>
              <Th>Datum</Th>
              <Th>Status</Th>
              <Th className="text-right">Totaal</Th>
              <Th className="text-right">Actie</Th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr
                key={inv.id}
                className="border-b-[0.5px] border-foreground/[0.06]"
              >
                <Td>
                  <Link
                    href={`/dashboard/invoices/${inv.id}`}
                    className="font-mono text-[length:var(--text-mono-md)] text-foreground font-normal no-underline"
                  >
                    {inv.invoice_number}
                  </Link>
                </Td>
                <Td>
                  <span className="font-mono text-[length:var(--text-mono-md)]">
                    {formatDate(inv.issue_date)}
                  </span>
                </Td>
                <Td>
                  <span className="text-[length:var(--text-label)] font-medium tracking-[0.08em] uppercase">
                    {STATUS_LABELS[inv.status] ?? inv.status}
                  </span>
                </Td>
                <Td className="text-right">
                  <span className="font-mono text-[length:var(--text-mono-md)] tabular-nums">
                    {formatCurrency(inv.total_inc_vat)}
                  </span>
                </Td>
                <Td className="text-right">
                  <Link
                    href={`/dashboard/invoices/${inv.id}/preview`}
                    className="text-[length:var(--text-label)] font-medium tracking-[0.08em] uppercase text-foreground no-underline"
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
