"use client";

import { useState, useRef } from "react";
import { useClickOutside } from "@/hooks/useClickOutside";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/Button";
import { createCustomerAccount } from "./actions";

interface CreateCustomerDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function generatePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let pw = "";
  for (let i = 0; i < 12; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  return pw;
}

export function CreateCustomerDialog({ open, onClose, onCreated }: CreateCustomerDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useClickOutside(panelRef, open, onClose);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(() => generatePassword());
  const [fullName, setFullName] = useState("");
  const [studioName, setStudioName] = useState("");
  const [planId, setPlanId] = useState("basis");
  const [sendEmail, setSendEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; tempPassword: string; emailSent: boolean; emailError: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setEmail("");
    setPassword(generatePassword());
    setFullName("");
    setStudioName("");
    setPlanId("basis");
    setSendEmail(true);
    setError(null);
    setCreated(null);
    setIsSubmitting(false);
    setCopied(false);
  };

  const handleClose = () => {
    if (created) onCreated();
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    const result = await createCustomerAccount({
      email: email.trim(),
      password,
      full_name: fullName.trim(),
      studio_name: studioName.trim() || undefined,
      plan_id: planId,
      send_welcome_email: sendEmail,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.data) {
      setCreated({
        email: result.data.email,
        tempPassword: result.data.tempPassword,
        emailSent: result.data.emailSent,
        emailError: result.data.emailError,
      });
    }
  };

  const handleCopy = async () => {
    if (!created) return;
    const text = `E-mail: ${created.email}\nWachtwoord: ${created.tempPassword}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-customer-title"
      className="dialog-overlay"
    >
      <div ref={panelRef} className="dialog-panel" style={{ maxWidth: 480 }}>
        {created ? (
          <>
            <p id="create-customer-title" className="dialog-panel__title">
              Klant aangemaakt
            </p>
            <p className="dialog-panel__message" style={{ marginBottom: 16 }}>
              De klant kan nu inloggen met onderstaande gegevens.
            </p>
            {created.emailSent && (
              <div style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#15803d" }}>
                Welkomstmail verstuurd naar {created.email}
              </div>
            )}
            {created.emailError && (
              <div style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#b91c1c" }}>
                Welkomstmail mislukt: {created.emailError}
              </div>
            )}
            <div
              style={{
                background: "#F5F5F5",
                padding: 20,
                borderLeft: "4px solid #000",
                marginBottom: 24,
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                lineHeight: 1.8,
              }}
            >
              <div>
                <span style={{ opacity: 0.5 }}>E-mail:</span>{" "}
                <strong>{created.email}</strong>
              </div>
              <div>
                <span style={{ opacity: 0.5 }}>Wachtwoord:</span>{" "}
                <strong>{created.tempPassword}</strong>
              </div>
            </div>
            <div className="dialog-panel__actions">
              <ButtonSecondary onClick={handleCopy}>
                {copied ? "Gekopieerd" : "Kopieer gegevens"}
              </ButtonSecondary>
              <ButtonPrimary onClick={handleClose}>Sluiten</ButtonPrimary>
            </div>
          </>
        ) : (
          <>
            <p id="create-customer-title" className="dialog-panel__title">
              Nieuwe klant aanmaken
            </p>
            <p className="dialog-panel__message">
              Maak een account aan en geef de klant direct inloggegevens.
            </p>

            {error && (
              <div
                style={{
                  background: "rgba(220,38,38,0.06)",
                  border: "1px solid rgba(220,38,38,0.15)",
                  padding: "10px 14px",
                  marginBottom: 16,
                  fontSize: 13,
                  color: "#b91c1c",
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              <div>
                <label className="label" style={{ display: "block", marginBottom: 4 }}>
                  Naam *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Volledige naam"
                  className="admin-field"
                  style={{ width: "100%" }}
                  autoFocus
                />
              </div>

              <div>
                <label className="label" style={{ display: "block", marginBottom: 4 }}>
                  Studionaam
                </label>
                <input
                  type="text"
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  placeholder="Bedrijfsnaam (optioneel)"
                  className="admin-field"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label className="label" style={{ display: "block", marginBottom: 4 }}>
                  E-mailadres *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="klant@voorbeeld.nl"
                  className="admin-field"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label className="label" style={{ display: "block", marginBottom: 4 }}>
                  Wachtwoord *
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="admin-field mono-amount"
                    style={{ width: "100%" }}
                  />
                  <ButtonSecondary
                    onClick={() => setPassword(generatePassword())}
                    style={{ whiteSpace: "nowrap", flexShrink: 0 }}
                  >
                    Genereer
                  </ButtonSecondary>
                </div>
              </div>

              <div>
                <label className="label" style={{ display: "block", marginBottom: 4 }}>
                  Abonnement *
                </label>
                <select
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="admin-select"
                  style={{ width: "100%" }}
                >
                  <option value="basis">Start — €29/mnd</option>
                  <option value="studio">Studio — €39/mnd</option>
                  <option value="compleet">Complete — €59/mnd</option>
                </select>
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  cursor: "pointer",
                  marginTop: 4,
                }}
              >
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                />
                Welkomstmail met inloggegevens versturen
              </label>
            </div>

            <div className="dialog-panel__actions">
              <ButtonSecondary onClick={handleClose} disabled={isSubmitting}>
                Annuleer
              </ButtonSecondary>
              <ButtonPrimary
                onClick={handleSubmit}
                disabled={isSubmitting || !email.trim() || !fullName.trim() || !password}
              >
                {isSubmitting ? "Aanmaken..." : "Klant aanmaken"}
              </ButtonPrimary>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
