"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { checkLeadActivation } from "@/features/admin/actions";
import { motion, AnimatePresence } from "framer-motion";

export default function RegisterCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const leadId = searchParams.get("lead_id");
  
  const [status, setStatus] = useState<"verifying" | "provisioning" | "ready" | "error">("verifying");
  const [dots, setDots] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Polling dots effect
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? "" : d + ".");
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Polling for activation
  useEffect(() => {
    if (!leadId) {
      setError("Geen lead ID gevonden in de URL.");
      setStatus("error");
      return;
    }

    let pollCount = 0;
    const maxPolls = 30; // 60 seconds total

    const poll = async () => {
      if (pollCount >= maxPolls) {
        setError("De activatie duurt wat langer dan normaal. Neem contact op als het niet lukt.");
        setStatus("error");
        return;
      }

      const result = await checkLeadActivation(leadId);
      
      if (result.error) {
        setError(result.error);
        setStatus("error");
        return;
      }

      if (result.data?.activated) {
        setStatus("ready");
        // Wait a bit to show the "Ready" state before redirecting
        setTimeout(() => {
          const emailParam = result.data?.email
            ? `&email=${encodeURIComponent(result.data.email)}`
            : "";
          router.push(`/login?new_account=true${emailParam}`);
        }, 2000);
      } else {
        pollCount++;
        // If still "provisioning", we stay in this state
        if (pollCount > 2) setStatus("provisioning");
        setTimeout(poll, 2000);
      }
    };

    poll();
  }, [leadId, router]);

  const stages = {
    verifying: { title: "Betaling controleren", subtitle: "We wachten op de bevestiging van Mollie." },
    provisioning: { title: "Account klaarzetten", subtitle: "Nog een paar seconden." },
    ready: { title: "Klaar", subtitle: "Je account staat klaar — we sturen je door naar inloggen." },
    error: { title: "Er ging iets mis", subtitle: error || "We konden je account niet activeren. Probeer het opnieuw of neem contact op." },
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <div
        className="glass"
        style={{ maxWidth: 460, width: "100%", padding: "48px 40px", borderRadius: "var(--radius)" }}
      >
        <p className="label" style={{ margin: "0 0 16px" }}>VAT100</p>

        <AnimatePresence mode="wait">
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {status === "ready" && (
              <div
                aria-hidden="true"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  margin: "0 auto 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--color-success)",
                  color: "var(--color-success)",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}

            <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.05, margin: 0 }}>
              {stages[status].title}
              {status !== "ready" && status !== "error" && <span style={{ opacity: 0.4 }}>{dots}</span>}
            </h1>

            <p style={{ fontSize: "var(--text-body-md)", lineHeight: 1.6, opacity: 0.55, margin: "12px 0 0" }}>
              {stages[status].subtitle}
            </p>

            {status === "error" && (
              <button onClick={() => window.location.reload()} className="btn-primary" style={{ marginTop: 24 }}>
                Opnieuw proberen
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
