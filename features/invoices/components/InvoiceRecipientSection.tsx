"use client";

import { m as motion } from "framer-motion";
import { useLocale } from "@/lib/i18n/context";
import { FieldError } from "@/components/ui";
import { ClientQuickCreate } from "./ClientQuickCreate";
import { playSound } from "@/lib/utils/sound";

export function InvoiceRecipientSection({
  clientId,
  setClientId,
  clients,
  clientsLoading,
  hasClientError,
  clientErrorMessage,
  showNewClient,
  setShowNewClient,
  error,
}: {
  clientId: string;
  setClientId: (id: string) => void;
  clients: Array<{ id: string; name: string }>;
  clientsLoading: boolean;
  hasClientError: boolean;
  clientErrorMessage: string;
  showNewClient: boolean;
  setShowNewClient: (show: boolean) => void;
  error?: string | null;
}) {
  const { t } = useLocale();
  return (
    <div style={{ marginBottom: 48 }}>
      <p className="label" style={{ marginBottom: 8 }}>
        {t.invoices.recipientLabel}
      </p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
        <select
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
            playSound("tink");
          }}
          autoFocus={!clientId}
          required
          aria-label={t.invoices.recipientLabel}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "invoice-client-error" : undefined}
          className="form-input"
          style={{
            fontSize: 16,
            fontWeight: 400,
            letterSpacing: "-0.01em",
            border: "none",
            padding: 0,
            width: "auto",
            minWidth: 160,
            background: "transparent",
          }}
        >
          <option value="">
            {clientsLoading
              ? t.common.loading
              : hasClientError
                ? clientErrorMessage
                : t.invoices.selectClientPlaceholder}
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            setShowNewClient(!showNewClient);
            playSound("glass-ping");
          }}
        >
          {showNewClient ? t.invoices.closeQuickCreate : t.invoices.openQuickCreate}
        </button>
      </div>
      {error && <FieldError id="invoice-client-error">{error}</FieldError>}
      {showNewClient && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          style={{ overflow: "hidden", marginTop: 24 }}
        >
          <ClientQuickCreate onClose={() => setShowNewClient(false)} />
        </motion.div>
      )}
    </div>
  );
}
