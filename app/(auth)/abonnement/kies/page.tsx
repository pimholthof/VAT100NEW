"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense, useMemo } from "react";
import { getPlans, startSubscription } from "@/features/subscriptions/actions";
import type { Plan } from "@/lib/types";

type BillingInterval = "monthly" | "yearly";

function PlanSelection() {
  const searchParams = useSearchParams();
  const preselected = (searchParams.get("plan") ?? "studio").replace(/_yearly$/, "");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  // We bewaren alleen de "basis" plan-id (zonder _yearly). Effectieve plan-id
  // wordt afgeleid van de gekozen interval — geen dubbele state, geen cascading
  // setState in effects.
  const [selectedBase, setSelectedBase] = useState<string>(preselected);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlans().then(setPlans);
  }, []);

  const visiblePlans = useMemo(
    () =>
      plans
        .filter((p) => (p.billing_interval ?? "monthly") === interval)
        .sort((a, b) => a.sort_order - b.sort_order),
    [plans, interval],
  );

  const selected = useMemo(() => {
    const target = interval === "yearly" ? `${selectedBase}_yearly` : selectedBase;
    if (visiblePlans.some((p) => p.id === target)) return target;
    return visiblePlans[0]?.id ?? selectedBase;
  }, [interval, selectedBase, visiblePlans]);

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
      <div style={{ width: "100%", maxWidth: 960 }}>
        <div style={{ marginBottom: 40 }}>
          <p className="label" style={{ opacity: 0.3, margin: "0 0 16px" }}>
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

        {/* Maand/Jaar toggle */}
        <div
          role="tablist"
          aria-label="Facturatie-interval"
          style={{
            display: "inline-flex",
            border: "0.5px solid rgba(0,0,0,0.1)",
            padding: 4,
            marginBottom: 32,
            gap: 4,
          }}
        >
          <button
            role="tab"
            aria-selected={interval === "monthly"}
            onClick={() => setInterval("monthly")}
            style={toggleBtn(interval === "monthly")}
          >
            Maandelijks
          </button>
          <button
            role="tab"
            aria-selected={interval === "yearly"}
            onClick={() => setInterval("yearly")}
            style={toggleBtn(interval === "yearly")}
          >
            Jaarlijks
            <span style={{ marginLeft: 8, fontSize: 10, opacity: 0.6 }}>
              2 maanden gratis
            </span>
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          {visiblePlans.map((plan) => {
            const isSelected = selected === plan.id;
            const isRecommended = plan.id === "studio" || plan.id === "studio_yearly";
            const features: string[] = Array.isArray(plan.features) ? plan.features : [];
            const displayPrice =
              interval === "yearly"
                ? Math.round(plan.price_cents / 12) / 100
                : plan.price_cents / 100;
            const suffix = interval === "yearly" ? "/mnd (jaarlijks)" : "/mnd";

            return (
              <button
                key={plan.id}
                onClick={() => setSelectedBase(plan.id.replace(/_yearly$/, ""))}
                disabled={pending}
                style={{
                  padding: 28,
                  background: isSelected ? "var(--foreground)" : "transparent",
                  color: isSelected ? "var(--background)" : "var(--foreground)",
                  border: `0.5px solid ${isSelected ? "var(--foreground)" : "rgba(0,0,0,0.1)"}`,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
                <div>
                  {isRecommended && (
                    <p
                      className="label-strong"
                      style={{
                        margin: "0 0 10px",
                        fontSize: 10,
                        opacity: isSelected ? 0.7 : 0.4,
                      }}
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
                    {plan.name.replace(/ jaarlijks$/, "")}
                  </p>
                  <p
                    style={{
                      fontSize: "clamp(1.7rem, 2.5vw, 2.2rem)",
                      fontWeight: 700,
                      letterSpacing: "-0.03em",
                      margin: "8px 0 0",
                      lineHeight: 1,
                    }}
                  >
                    &euro;{displayPrice}
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 400,
                        opacity: 0.5,
                        marginLeft: 4,
                      }}
                    >
                      {suffix}
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
                    gap: 6,
                    flex: 1,
                  }}
                >
                  {features.map((feature) => (
                    <li
                      key={feature}
                      style={{
                        fontSize: "12.5px",
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
        <p className="label" style={{ marginTop: 16, opacity: 0.35, maxWidth: 520 }}>
          Je ziet in VAT100 realtime wat je moet reserveren voor BTW en belasting, zodat je weet wat je vrij kunt besteden.
        </p>
      </div>
    </div>
  );
}

function toggleBtn(active: boolean): React.CSSProperties {
  return {
    padding: "10px 20px",
    background: active ? "var(--foreground)" : "transparent",
    color: active ? "var(--background)" : "var(--foreground)",
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    fontWeight: 500,
    transition: "all 0.15s ease",
  };
}

export default function AbonnementKiesPage() {
  return (
    <Suspense>
      <PlanSelection />
    </Suspense>
  );
}
