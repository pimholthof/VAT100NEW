"use client";

import { m as motion } from "framer-motion";
import { ClientQuickCreate } from "./ClientQuickCreate";
import { inputStyle } from "@/components/ui";
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
}: {
  clientId: string;
  setClientId: (id: string) => void;
  clients: Array<{ id: string; name: string }>;
  clientsLoading: boolean;
  hasClientError: boolean;
  clientErrorMessage: string;
  showNewClient: boolean;
  setShowNewClient: (show: boolean) => void;
}) {
  return (
    <div style={{ marginBottom: 48 }}>
      <p className="label" style={{ opacity: 0.2, marginBottom: 8 }}>
        ONTVANGER
      </p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
        <select
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
            playSound("tink");
          }}
          style={{
            ...inputStyle,
            fontSize: 14,
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
              ? "Laden..."
              : hasClientError
                ? clientErrorMessage
                : "Selecteer klant"}
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setShowNewClient(!showNewClient);
            playSound("glass-ping");
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            opacity: 0.3,
          }}
        >
          {showNewClient ? "[-] CLOSE" : "[+] NEW"}
        </button>
      </div>
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
