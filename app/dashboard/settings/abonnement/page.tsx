"use client";

import { useEffect, useState } from "react";
import {
  getActiveSubscription,
  getPlans,
  cancelSubscription,
  changeSubscription,
} from "@/features/subscriptions/actions";
import type { Plan, SubscriptionWithPlan } from "@/lib/types";

const statusLabels: Record<string, string> = {
  active: "Actief",
  pending: "In afwachting",
  past_due: "Achterstallig",
  cancelled: "Opgezegd",
  expired: "Verlopen",
};

export default function AbonnementSettingsPage() {
  const [subscription, setSubscription] = useState<SubscriptionWithPlan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getActiveSubscription(), getPlans()]).then(([sub, p]) => {
      setSubscription(sub);
      setPlans(p);
      setLoading(false);
    });
  }, []);

  async function handleCancel() {
    setActionPending(true);
    setError(null);
    const result = await cancelSubscription();
    if (result.error) {
      setError(result.error);
      setActionPending(false);
      return;
    }
    window.location.assign(window.location.pathname);
  }

  async function handleChange(newPlanId: string) {
    setActionPending(true);
    setError(null);
    const result = await changeSubscription(newPlanId);
    if (result.error) {
      setError(result.error);
      setActionPending(false);
      return;
    }
    if (result.data?.checkoutUrl) {
      window.location.assign(result.data.checkoutUrl);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 48 }}>
        <p className="label" style={{ opacity: 0.4 }}>Laden...</p>
      </div>
    );
  }

  const otherPlans = plans.filter((p) => p.id !== subscription?.plan_id);

  return (
    <div style={{ maxWidth: 600, padding: "48px 0" }}>
      <h2
        style={{
          fontSize: "clamp(1.5rem, 3vw, 2rem)",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          margin: 0,
        }}
      >
        Abonnement
      </h2>

      {subscription ? (
        <div style={{ marginTop: 40 }}>
          {/* Current plan */}
          <div
            style={{
              padding: 32,
              border: "0.5px solid rgba(0,0,0,0.1)",
              marginBottom: 24,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div>
                <p className="label" style={{ margin: 0, opacity: 0.5, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  {subscription.plan.name}
                </p>
                <p style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.03em", margin: "8px 0 0", lineHeight: 1 }}>
                  &euro;{subscription.plan.price_cents / 100}
                  <span style={{ fontSize: "14px", fontWeight: 400, opacity: 0.5, marginLeft: 4 }}>/mnd</span>
                </p>
              </div>
              <span
                className="label"
                style={{
                  padding: "4px 12px",
                  background: subscription.status === "active" ? "rgba(0,0,0,0.05)" : "rgba(255,0,0,0.05)",
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {statusLabels[subscription.status] ?? subscription.status}
              </span>
            </div>

            {subscription.current_period_end && (
              <p className="label" style={{ marginTop: 16, opacity: 0.4 }}>
                Volgende betaling: {new Date(subscription.current_period_end).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </div>

          {/* Change plan */}
          {otherPlans.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p className="label-strong" style={{ margin: "0 0 16px", paddingTop: 8, borderTop: "0.5px solid rgba(0,0,0,0.1)" }}>
                Wijzig abonnement
              </p>
              {otherPlans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => handleChange(plan.id)}
                  disabled={actionPending}
                  style={{
                    width: "100%",
                    padding: "16px 24px",
                    border: "0.5px solid rgba(0,0,0,0.1)",
                    background: "transparent",
                    color: "var(--foreground)",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                    transition: "background 0.15s ease",
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{plan.name}</span>
                  <span style={{ opacity: 0.5 }}>&euro;{plan.price_cents / 100}/mnd</span>
                </button>
              ))}
            </div>
          )}

          {error && (
            <p role="alert" style={{ fontSize: "12px", color: "var(--color-accent)", marginBottom: 16 }}>
              {error}
            </p>
          )}

          {/* Cancel */}
          <div style={{ paddingTop: 8, borderTop: "0.5px solid rgba(0,0,0,0.1)" }}>
            {!showCancel ? (
              <button
                onClick={() => setShowCancel(true)}
                className="label"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  opacity: 0.3,
                  padding: 0,
                  color: "var(--foreground)",
                }}
              >
                Abonnement opzeggen
              </button>
            ) : (
              <div>
                <p style={{ fontSize: "13px", margin: "0 0 12px" }}>
                  Weet je zeker dat je je abonnement wilt opzeggen? Je verliest toegang tot het dashboard.
                </p>
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={handleCancel}
                    disabled={actionPending}
                    style={{
                      padding: "10px 20px",
                      border: "none",
                      background: "var(--foreground)",
                      color: "var(--background)",
                      cursor: "pointer",
                      fontSize: "var(--text-label)",
                      fontWeight: 500,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                    }}
                  >
                    {actionPending ? "Bezig..." : "Ja, opzeggen"}
                  </button>
                  <button
                    onClick={() => setShowCancel(false)}
                    style={{
                      padding: "10px 20px",
                      border: "0.5px solid rgba(0,0,0,0.1)",
                      background: "transparent",
                      color: "var(--foreground)",
                      cursor: "pointer",
                      fontSize: "var(--text-label)",
                      fontWeight: 500,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                    }}
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 40 }}>
          <p style={{ fontSize: "14px", opacity: 0.6 }}>
            Je hebt geen actief abonnement.
          </p>
          <a
            href="/abonnement/kies"
            style={{
              display: "inline-block",
              marginTop: 16,
              padding: "14px 28px",
              background: "var(--foreground)",
              color: "var(--background)",
              textDecoration: "none",
              fontSize: "var(--text-label)",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
            }}
          >
            Abonnement kiezen
          </a>
        </div>
      )}
    </div>
  );
}
