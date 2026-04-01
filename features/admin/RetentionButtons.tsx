"use client";

import { useTransition, useState } from "react";
import { manualNudgeLead, manualBillingAlert } from "./retention-actions";

export function NudgeLeadButton({ leadId }: { leadId: string }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleNudge = () => {
    setStatus("idle");
    startTransition(async () => {
      const result = await manualNudgeLead(leadId);
      setStatus(result.error ? "error" : "success");
    });
  };

  return (
    <button
      onClick={handleNudge}
      disabled={isPending || status === "success"}
      className="btn-secondary"
      style={{
        width: "100%",
        marginTop: 12,
        fontSize: 9,
        padding: "8px 12px",
        opacity: isPending ? 0.5 : 1,
        cursor: isPending ? "wait" : "pointer",
        borderColor: status === "success" ? "var(--color-success)" : status === "error" ? "var(--color-accent)" : undefined,
        color: status === "success" ? "var(--color-success)" : status === "error" ? "var(--color-accent)" : undefined,
      }}
    >
      {isPending ? "Verzenden..." : status === "success" ? "Verzonden" : "Herinnering sturen"}
    </button>
  );
}

export function BillingAlertButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleAlert = () => {
    setStatus("idle");
    startTransition(async () => {
      const result = await manualBillingAlert(userId);
      setStatus(result.error ? "error" : "success");
    });
  };

  return (
    <button
      onClick={handleAlert}
      disabled={isPending || status === "success"}
      className="btn-secondary"
      style={{
        width: "100%",
        marginTop: 12,
        fontSize: 9,
        padding: "8px 12px",
        opacity: isPending ? 0.5 : 1,
        cursor: isPending ? "wait" : "pointer",
        borderColor: status === "success" ? "var(--color-success)" : "var(--color-accent)",
        color: status === "success" ? "var(--color-success)" : "var(--color-accent)",
      }}
    >
      {isPending ? "Verzenden..." : status === "success" ? "Melding verzonden" : "Melding sturen"}
    </button>
  );
}
