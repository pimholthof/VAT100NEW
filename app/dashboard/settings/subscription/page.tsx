import { requireAuth } from "@/lib/supabase/server";
import { getActiveSubscription } from "@/features/subscriptions/actions";
import { createServiceClient } from "@/lib/supabase/service";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import Link from "next/link";

export default async function SubscriptionPage() {
  const auth = await requireAuth();
  if (auth.error !== null) return null;

  const subscription = await getActiveSubscription();
  const supabase = createServiceClient();

  // Fetch Payment History
  const { data: payments } = await supabase
    .from("subscription_payments")
    .select("*")
    .eq("subscription_id", subscription?.id)
    .order("paid_at", { ascending: false });

  return (
    <div style={{ maxWidth: 880 }}>
      <div className="page-header">
        <div>
          <h1 className="display-title">Abonnement</h1>
          <p style={{ fontSize: "var(--text-body-lg)", fontWeight: 300, margin: "16px 0 0", opacity: 0.5, maxWidth: "32rem" }}>
            Beheer je VAT100-abonnement en bekijk je betaalhistorie.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, alignItems: "start" }}>
        {/* Huidig pakket */}
        <div style={{ border: "var(--border-light)", borderRadius: "var(--radius)", padding: 28, background: "rgba(255,255,255,0.6)" }}>
          <p className="label" style={{ margin: "0 0 20px" }}>Huidig pakket</p>

          {subscription ? (
            <>
              <p style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>
                {subscription.plan.name}
              </p>
              <p style={{ margin: "8px 0 24px" }}>
                <span className="mono-amount" style={{ fontSize: "var(--text-body-lg)" }}>€{(subscription.plan.price_cents / 100).toFixed(2)}</span>
                <span style={{ opacity: 0.4, fontSize: "var(--text-body-sm)" }}> / maand</span>
              </p>

              <div style={{ borderTop: "var(--border-light)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-body-sm)" }}>
                  <span style={{ opacity: 0.5 }}>Status</span>
                  <span
                    style={{
                      fontWeight: 600,
                      color:
                        subscription.status === 'past_due'
                          ? 'var(--color-accent)'
                          : subscription.status === 'active'
                          ? 'var(--color-success)'
                          : 'var(--foreground)',
                    }}
                  >
                    {subscription.status === 'active' ? 'Actief' : subscription.status === 'past_due' ? 'Betaling mislukt' : subscription.status}
                  </span>
                </div>
                {subscription.current_period_end && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-body-sm)" }}>
                    <span style={{ opacity: 0.5 }}>Volgende incasso</span>
                    <span style={{ fontWeight: 500 }}>
                      {format(new Date(subscription.current_period_end), "d MMMM yyyy", { locale: nl })}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ padding: "32px 0", textAlign: "center", opacity: 0.6, fontSize: "var(--text-body-sm)" }}>
              Geen actief abonnement.
              <div style={{ marginTop: 16 }}>
                <Link href="/dashboard/settings/abonnement" className="btn-primary">Bekijk plannen</Link>
              </div>
            </div>
          )}
        </div>

        {/* Betaalhistorie */}
        <div>
          <p className="label" style={{ margin: "0 0 16px" }}>Betaalhistorie</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {payments?.map((payment) => (
              <div
                key={payment.id}
                style={{ border: "var(--border-light)", borderRadius: "var(--radius-md)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.6)" }}
              >
                <div>
                  <div className="mono-amount" style={{ fontWeight: 500 }}>€{(payment.amount_cents / 100).toFixed(2)}</div>
                  <div style={{ fontSize: 11, opacity: 0.4 }}>
                    {payment.paid_at ? format(new Date(payment.paid_at), "d MMM yyyy", { locale: nl }) : "In afwachting"}
                  </div>
                </div>
                <span className="label" style={{ opacity: 0.5 }}>
                  {payment.status === 'paid' ? 'Voldaan' : payment.status}
                </span>
              </div>
            ))}
            {(!payments || payments.length === 0) && (
              <p style={{ fontSize: "var(--text-body-sm)", opacity: 0.4, margin: 0 }}>Nog geen betalingen verwerkt.</p>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 48, paddingTop: 24, borderTop: "var(--border-light)", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 24 }}>
        <p style={{ fontSize: 12, opacity: 0.4, maxWidth: "32rem", margin: 0, lineHeight: 1.6 }}>
          Abonnementen verlengen maandelijks automatisch via Mollie. Wisselen of opzeggen doe je via Beheer abonnement. Vragen over je factuur? Neem contact op.
        </p>
        <div style={{ display: "flex", gap: 20 }}>
          <Link href="/dashboard/settings/abonnement" className="table-action" style={{ textDecoration: "none" }}>Beheer abonnement</Link>
          <a href="mailto:support@vat100.nl" className="table-action" style={{ textDecoration: "none" }}>Contact support</a>
        </div>
      </div>
    </div>
  );
}
