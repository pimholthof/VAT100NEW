"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { checkSubscriptionStatus } from "@/features/subscriptions/actions";

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const subscriptionId = searchParams.get("subscription_id");
  const [status, setStatus] = useState<string>("checking");

  useEffect(() => {
    if (!subscriptionId) {
      setStatus("error");
      return;
    }

    let attempts = 0;
    const maxAttempts = 20;

    const poll = async () => {
      const result = await checkSubscriptionStatus(subscriptionId);

      if (result.status === "active") {
        setStatus("active");
        setTimeout(() => router.push("/dashboard"), 1500);
        return;
      }

      if (result.status === "cancelled" || result.status === "expired") {
        setStatus("failed");
        return;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        // After 60 seconds, redirect to dashboard anyway
        // The webhook might still be processing
        router.push("/dashboard");
        return;
      }

      setTimeout(poll, 3000);
    };

    poll();
  }, [subscriptionId, router]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        alignItems: "center",
        justifyItems: "center",
        padding: "24px 16px",
        background: "var(--background)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <p className="label" style={{ opacity: 0.3, margin: "0 0 16px" }}>
          VAT100
        </p>

        {status === "checking" && (
          <>
            <h1
              style={{
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Betaling verwerken...
            </h1>
            <p className="label" style={{ marginTop: 16, opacity: 0.4 }}>
              Even geduld, je abonnement wordt geactiveerd
            </p>
          </>
        )}

        {status === "active" && (
          <>
            <h1
              style={{
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Welkom bij VAT100
            </h1>
            <p className="label" style={{ marginTop: 16, opacity: 0.4 }}>
              Je abonnement is actief. Je wordt doorgestuurd...
            </p>
          </>
        )}

        {status === "failed" && (
          <>
            <h1
              style={{
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Betaling mislukt
            </h1>
            <p className="label" style={{ marginTop: 16, opacity: 0.4 }}>
              De betaling is niet gelukt. Probeer het opnieuw.
            </p>
            <button
              onClick={() => window.location.href = "/abonnement/kies"}
              style={{
                marginTop: 32,
                padding: "16px 32px",
                border: "none",
                background: "var(--foreground)",
                color: "var(--background)",
                fontSize: "var(--text-label)",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Opnieuw proberen
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <h1
              style={{
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Er ging iets mis
            </h1>
            <button
              onClick={() => window.location.href = "/abonnement/kies"}
              style={{
                marginTop: 32,
                padding: "16px 32px",
                border: "none",
                background: "var(--foreground)",
                color: "var(--background)",
                fontSize: "var(--text-label)",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Terug naar abonnementen
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AbonnementCallbackPage() {
  return (
    <Suspense>
      <CallbackContent />
    </Suspense>
  );
}
