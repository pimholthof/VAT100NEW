"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { getPlans, startSubscription } from "@/features/subscriptions/actions";
import type { Plan } from "@/lib/types";

function PlanSelection() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get("plan") ?? "studio";
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<string>(preselected);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlans().then(setPlans);
  }, []);

  async function handleSelect(planId: string) {
    setError(null);
    setPending(true);

    const result = await startSubscription(planId);
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }

    if (result.data?.checkoutUrl) {
      window.location.href = result.data.checkoutUrl;
    }
  }

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
      <div style={{ width: "100%", maxWidth: 720 }}>
        <div style={{ marginBottom: 64 }}>
          <p
            className="label"
            style={{ opacity: 0.3, margin: "0 0 16px" }}
          >
            VAT100
          </p>
          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 2.8rem)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 0.95,
              margin: 0,
              color: "var(--foreground)",
            }}
          >
            Kies je abonnement
          </h1>
          <p
            className="label"
            style={{ marginTop: 16, opacity: 0.4, maxWidth: 520, lineHeight: 1.6 }}
          >
            Kies hoeveel gemak, inzicht en automatisering je nu nodig hebt. Je kunt later altijd wisselen.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 24,
          }}
        >
          {plans.map((plan) => {
            const isSelected = selected === plan.id;
            const features: string[] = Array.isArray(plan.features)
              ? plan.features
              : [];

            return (
              <button
                key={plan.id}
                onClick={() => setSelected(plan.id)}
                disabled={pending}
                style={{
                  padding: 32,
                  background: isSelected
                    ? "var(--foreground)"
                    : "transparent",
                  color: isSelected
                    ? "var(--background)"
                    : "var(--foreground)",
                  border: `0.5px solid ${isSelected ? "var(--foreground)" : "rgba(0,0,0,0.1)"}`,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: 24,
                }}
              >
                <div>
                  {plan.id === "studio" && (
                    <p
                      className="label-strong"
                      style={{ margin: "0 0 10px", fontSize: 10, opacity: isSelected ? 0.7 : 0.4 }}
                    >
                      AANBEVOLEN
                    </p>
                  )}
                  <p
                    className="label"
                    style={{
                      margin: 0,
                      opacity: 0.5,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    {plan.name}
                  </p>
                  <p
                    style={{
                      fontSize: "clamp(2rem, 3vw, 2.5rem)",
                      fontWeight: 700,
                      letterSpacing: "-0.03em",
                      margin: "8px 0 0",
                      lineHeight: 1,
                    }}
                  >
                    &euro;{plan.price_cents / 100}
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 400,
                        opacity: 0.5,
                        marginLeft: 4,
                      }}
                    >
                      /mnd
                    </span>
                  </p>
                </div>

                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    flex: 1,
                  }}
                >
                  {features.map((feature) => (
                    <li
                      key={feature}
                      style={{
                        fontSize: "13px",
                        opacity: 0.7,
                        lineHeight: 1.5,
                      }}
                    >
                      {feature}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {error && (
          <p
            role="alert"
            style={{
              marginTop: 16,
              fontSize: "12px",
              color: "var(--color-accent)",
            }}
          >
            {error}
          </p>
        )}

        <button
          onClick={() => handleSelect(selected)}
          disabled={pending || !selected}
          style={{
            marginTop: 32,
            width: "100%",
            padding: 20,
            border: "none",
            background: "var(--foreground)",
            color: "var(--background)",
            fontSize: "var(--text-label)",
            fontWeight: 500,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "opacity 0.15s ease",
            opacity: pending ? 0.5 : 1,
          }}
        >
          {pending ? "Even wachten..." : "Doorgaan naar betaling"}
        </button>
        <p
          className="label"
          style={{ marginTop: 16, opacity: 0.35, maxWidth: 520 }}
        >
          Je ziet in VAT100 realtime wat je moet reserveren voor BTW en belasting, zodat je weet wat je vrij kunt besteden.
        </p>
      </div>
    </div>
  );
}

export default function AbonnementKiesPage() {
  return (
    <Suspense>
      <PlanSelection />
    </Suspense>
  );
}
