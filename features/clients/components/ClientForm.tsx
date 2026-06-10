"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createNewClient, updateClient, checkDuplicateClients } from "@/features/clients/actions";
import type { Client, ClientInput } from "@/lib/types";
import {
  FieldGroup,
  FieldError,
  ButtonPrimary,
  ButtonSecondary,
  ErrorMessage,
} from "@/components/ui";
import { validateEmail, validateKvk, validateBtw } from "@/lib/validation/client-validators";
import { scrollToField } from "@/lib/utils/focus-field";
import { useLocale } from "@/lib/i18n/context";
import { useToast } from "@/components/ui/Toast";

interface ClientFormProps {
  client?: Client;
}

export function ClientForm({ client }: ClientFormProps) {
  const { t } = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationHint, setValidationHint] = useState<string | null>(null);

  const [name, setName] = useState(client?.name ?? "");
  const [contactName, setContactName] = useState(client?.contact_name ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [address, setAddress] = useState(client?.address ?? "");
  const [postalCode, setPostalCode] = useState(client?.postal_code ?? "");
  const [city, setCity] = useState(client?.city ?? "");
  const [kvkNumber, setKvkNumber] = useState(client?.kvk_number ?? "");
  const [btwNumber, setBtwNumber] = useState(client?.btw_number ?? "");
  const [country, setCountry] = useState(client?.country ?? "NL");
  const [paymentTermsDays, setPaymentTermsDays] = useState(client?.payment_terms_days ?? 30);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  const [kvkLoading, setKvkLoading] = useState(false);
  const [kvkFilled, setKvkFilled] = useState(false);
  const [viesStatus, setViesStatus] = useState<"valid" | "invalid" | "loading" | null>(null);
  const [viesName, setViesName] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Array<{ id: string; name: string; email: string | null }>>([]);
  const dupCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function validateField(field: string, value: string) {
    let err: string | null = null;
    if (field === "email" && value) err = validateEmail(value);
    if (field === "kvk" && value) err = validateKvk(value);
    if (field === "btw" && value) err = validateBtw(value);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
  }

  async function handleKvkBlur() {
    validateField("kvk", kvkNumber);
    const cleaned = kvkNumber.trim();
    if (!/^[0-9]{8}$/.test(cleaned)) return;
    setKvkLoading(true);
    setKvkFilled(false);
    try {
      const res = await fetch(`/api/lookup/kvk?nummer=${encodeURIComponent(cleaned)}`);
      const json = await res.json();
      const first = json.results?.[0];
      if (first) {
        if (!name) setName(first.handelsnaam);
        if (!city) setCity(first.vestigingsplaats);
        setKvkFilled(true);
        toast("Gegevens aangevuld via KvK");
      }
    } catch {
      // Non-fatal
    } finally {
      setKvkLoading(false);
    }
  }

  async function handleBtwBlur() {
    validateField("btw", btwNumber);
    const cleaned = btwNumber.trim();
    if (!cleaned || cleaned.length < 8) return;
    setViesStatus("loading");
    setViesName(null);
    try {
      const res = await fetch(`/api/lookup/vies?vatNumber=${encodeURIComponent(cleaned)}`);
      const json = await res.json();
      if (json.valid === true) {
        setViesStatus("valid");
        if (json.name && json.name !== "---") {
          setViesName(json.name);
          if (!name) setName(json.name);
        }
      } else if (json.valid === false) {
        setViesStatus("invalid");
      } else {
        setViesStatus(null);
      }
    } catch {
      setViesStatus(null);
    }
  }

  function triggerDuplicateCheck(currentName: string) {
    if (dupCheckTimeout.current) clearTimeout(dupCheckTimeout.current);
    if (currentName.trim().length < 3) { setDuplicates([]); return; }
    dupCheckTimeout.current = setTimeout(async () => {
      const result = await checkDuplicateClients({
        name: currentName,
        email: email || undefined,
        kvkNumber: kvkNumber || undefined,
        excludeId: client?.id,
      });
      setDuplicates(result.data ?? []);
    }, 600);
  }

  const handleSubmit = async () => {
    // Fouten op het veld zelf (rode rand + inline melding) i.p.v. alleen een
    // losse melding bovenaan; daarna naar het eerste foutveld scrollen zodat
    // een klik op de knop onderaan nooit "stilletjes" lijkt te mislukken.
    const errs: Record<string, string | null> = {
      name: name.trim() ? null : t.clients.companyNameRequired,
      email: validateEmail(email),
      kvk: validateKvk(kvkNumber),
      btw: validateBtw(btwNumber),
    };
    setFieldErrors((prev) => ({ ...prev, ...errs }));

    const fieldIds: Record<string, string> = {
      name: "client-name",
      email: "client-email",
      kvk: "client-kvk",
      btw: "client-btw",
    };
    const firstInvalid = Object.keys(errs).find((k) => errs[k]);
    if (firstInvalid) {
      setValidationHint(t.common.checkFields);
      scrollToField(fieldIds[firstInvalid]);
      return;
    }

    setSaving(true);
    setError(null);
    setValidationHint(null);

    const input: ClientInput = {
      name,
      contact_name: contactName || null,
      email: email || null,
      address: address || null,
      city: city || null,
      postal_code: postalCode || null,
      kvk_number: kvkNumber || null,
      btw_number: btwNumber || null,
      country: country || "NL",
      payment_terms_days: paymentTermsDays,
    };

    const result = client
      ? await updateClient(client.id, input)
      : await createNewClient(input);

    if (result.error) {
      setError(result.error);
      scrollToField("client-form-error");
      setSaving(false);
      return;
    }

    if (result.data) {
      toast(client ? "Klant bijgewerkt" : "Klant aangemaakt");
      router.push(`/dashboard/clients/${result.data.id}`);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      {error && (
        <div id="client-form-error">
          <ErrorMessage style={{ marginBottom: 24 }}>{error}</ErrorMessage>
        </div>
      )}

      <FieldGroup
        label={`${t.clients.companyName} *`}
        htmlFor="client-name"
        error={fieldErrors.name ?? undefined}
      >
        <input
          id="client-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value.trim()) {
              setFieldErrors((prev) => ({ ...prev, name: null }));
            }
            triggerDuplicateCheck(e.target.value);
          }}
          placeholder={t.clients.companyName}
          className="form-input"
          style={fieldErrors.name ? { borderColor: "var(--color-accent)" } : undefined}
        />
        {duplicates.length > 0 && (
          <div style={{ marginTop: 6, padding: "8px 12px", background: "rgba(180, 83, 9, 0.06)", border: "0.5px solid rgba(180, 83, 9, 0.25)", borderRadius: "var(--radius-sm)", fontSize: 12 }}>
            <span style={{ fontWeight: 600, color: "var(--color-warning)" }}>Mogelijk bestaande klant: </span>
            {duplicates.map((d, i) => (
              <span key={d.id}>
                <a href={`/dashboard/clients/${d.id}`} style={{ color: "var(--color-warning)", textDecoration: "underline" }}>{d.name}</a>
                {i < duplicates.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        )}
      </FieldGroup>

      <FieldGroup label={t.clients.contactPerson}>
        <input
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder={t.clients.contactPerson}
          className="form-input"
        />
      </FieldGroup>

      <FieldGroup
        label={t.clients.email}
        htmlFor="client-email"
        error={fieldErrors.email ?? undefined}
      >
        <input
          id="client-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => validateField("email", email)}
          placeholder={t.clients.emailPlaceholder}
          className="form-input"
          style={fieldErrors.email ? { borderColor: "var(--color-accent)" } : undefined}
        />
      </FieldGroup>

      <FieldGroup label={t.clients.address}>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={t.clients.address}
          className="form-input"
        />
      </FieldGroup>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: 16,
        }}
      >
        <FieldGroup label={t.clients.postalCode}>
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="1234 AB"
            className="form-input"
          />
        </FieldGroup>
        <FieldGroup label={t.clients.city}>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t.clients.city}
            className="form-input"
          />
        </FieldGroup>
      </div>

      <FieldGroup label="Land">
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="form-input"
        >
          <option value="NL">Nederland</option>
          <option value="BE">België</option>
          <option value="DE">Duitsland</option>
          <option value="FR">Frankrijk</option>
          <option value="GB">Verenigd Koninkrijk</option>
          <option value="AT">Oostenrijk</option>
          <option value="ES">Spanje</option>
          <option value="IT">Italië</option>
          <option value="IE">Ierland</option>
          <option value="LU">Luxemburg</option>
          <option value="PL">Polen</option>
          <option value="SE">Zweden</option>
          <option value="DK">Denemarken</option>
          <option value="FI">Finland</option>
          <option value="PT">Portugal</option>
          <option value="CZ">Tsjechië</option>
          <option value="RO">Roemenië</option>
          <option value="HU">Hongarije</option>
          <option value="BG">Bulgarije</option>
          <option value="HR">Kroatië</option>
          <option value="SK">Slowakije</option>
          <option value="SI">Slovenië</option>
          <option value="LT">Litouwen</option>
          <option value="LV">Letland</option>
          <option value="EE">Estland</option>
          <option value="CY">Cyprus</option>
          <option value="MT">Malta</option>
          <option value="EL">Griekenland</option>
          <option value="US">Verenigde Staten</option>
          <option value="CH">Zwitserland</option>
          <option value="NO">Noorwegen</option>
          <option value="OTHER">Overig</option>
        </select>
      </FieldGroup>

      <FieldGroup label="Betaaltermijn (dagen)">
        <input
          type="number"
          min={0}
          max={120}
          value={paymentTermsDays}
          onChange={(e) => setPaymentTermsDays(Number(e.target.value) || 30)}
          className="form-input"
          style={{ maxWidth: 120 }}
        />
      </FieldGroup>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <FieldGroup
          label={t.clients.kvkNumber}
          htmlFor="client-kvk"
          error={fieldErrors.kvk ?? undefined}
          hint={kvkFilled ? "Gegevens aangevuld via KvK" : undefined}
        >
          <div style={{ position: "relative" }}>
            <input
              id="client-kvk"
              type="text"
              value={kvkNumber}
              onChange={(e) => setKvkNumber(e.target.value)}
              onBlur={handleKvkBlur}
              placeholder="12345678"
              className="form-input"
              style={{
                paddingRight: 32,
                ...(fieldErrors.kvk ? { borderColor: "var(--color-accent)" } : {}),
              }}
            />
            {kvkLoading && (
              <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "rgba(0,0,0,0.4)" }}>...</span>
            )}
            {kvkFilled && !kvkLoading && (
              <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--color-success)" }}>✓</span>
            )}
          </div>
        </FieldGroup>
        <FieldGroup
          label={t.clients.vatNumber}
          htmlFor="client-btw"
          error={fieldErrors.btw ?? undefined}
          hint={
            viesStatus === "valid"
              ? `BTW-nummer geldig via VIES${viesName ? ` — ${viesName}` : ""}`
              : viesStatus === "invalid"
              ? "BTW-nummer niet gevonden in VIES"
              : undefined
          }
        >
          <div style={{ position: "relative" }}>
            <input
              id="client-btw"
              type="text"
              value={btwNumber}
              onChange={(e) => setBtwNumber(e.target.value)}
              onBlur={handleBtwBlur}
              placeholder="NL123456789B01"
              className="form-input"
              style={{
                paddingRight: 32,
                ...(fieldErrors.btw ? { borderColor: "var(--color-accent)" } : {}),
              }}
            />
            {viesStatus === "loading" && (
              <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "rgba(0,0,0,0.4)" }}>...</span>
            )}
            {viesStatus === "valid" && (
              <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--color-success)" }}>✓</span>
            )}
            {viesStatus === "invalid" && (
              <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--color-accent)" }}>✗</span>
            )}
          </div>
        </FieldGroup>
      </div>

      <div
        style={{
          marginTop: 32,
          paddingTop: 24,
          borderTop: "0.5px solid rgba(13,13,11,0.15)",
        }}
      >
        {/* Validatie-echo bij de knop: het foutveld kan buiten beeld staan. */}
        {validationHint && (
          <FieldError style={{ margin: "0 0 12px" }}>{validationHint}</FieldError>
        )}
        <div style={{ display: "flex", gap: 12 }}>
          <ButtonSecondary onClick={() => router.back()} disabled={saving}>
            {t.common.cancel}
          </ButtonSecondary>
          <ButtonPrimary onClick={handleSubmit} loading={saving}>
            {client ? t.clients.update : t.clients.createClient}
          </ButtonPrimary>
        </div>
      </div>
    </div>
  );
}
