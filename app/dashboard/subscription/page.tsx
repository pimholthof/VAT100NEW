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
    <div className="max-w-4xl mx-auto py-12 px-6">
      <header className="mb-16">
        <h1 className="text-6xl font-black italic tracking-tighter mb-4">BILLING & PLANS</h1>
        <p className="text-xl opacity-60">Beheer je abonnement en bekijk je betaalhistorie.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        {/* Active Plan Card */}
        <div className="border-4 border-black p-8 bg-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 bg-black text-white px-4 py-1 text-[10px] font-black uppercase tracking-widest translate-x-2 translate-y-2 rotate-45 group-hover:rotate-0 transition-transform">
            {subscription?.status || "Geen actief plan"}
          </div>
          
          <h2 className="text-xs font-black uppercase tracking-[0.2em] mb-8 opacity-40">HUIDIG PAKKET</h2>
          
          {subscription ? (
            <>
              <div className="text-4xl font-black mb-4 uppercase tracking-tighter italic">
                {subscription.plan.name}
              </div>
              <div className="text-2xl font-bold mb-8">
                €{(subscription.plan.price_cents / 100).toFixed(2)} <span className="text-base font-normal opacity-40">/ maand</span>
              </div>

              <div className="space-y-4 border-t-2 border-black pt-8">
                <div className="flex justify-between text-sm">
                  <span className="opacity-40">Status:</span>
                  <span className={`font-bold uppercase ${subscription.status === 'past_due' ? 'text-red-600' : 'text-green-600'}`}>
                    {subscription.status === 'active' ? 'Actief' : subscription.status === 'past_due' ? 'Betaling mislukt' : subscription.status}
                  </span>
                </div>
                {subscription.current_period_end && (
                  <div className="flex justify-between text-sm">
                    <span className="opacity-40">Volgende incasso:</span>
                    <span className="font-bold">
                      {format(new Date(subscription.current_period_end), "d MMMM yyyy", { locale: nl })}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-12 text-center italic opacity-40 border-2 border-dashed border-black">
              Geen actief abonnement gevonden.
              <div className="mt-4">
                <Link href="/abonnementen" className="btn-primary inline-block">Bekijk Plannen</Link>
              </div>
            </div>
          )}
        </div>

        {/* Payment History */}
        <div className="space-y-8">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] opacity-40">BETAALHISTORIE</h2>
          
          <div className="space-y-2">
            {payments?.map((payment) => (
              <div key={payment.id} className="border-2 border-black p-4 flex justify-between items-center bg-white hover:bg-neutral-50 transition-colors">
                <div>
                  <div className="font-bold">€{(payment.amount_cents / 100).toFixed(2)}</div>
                  <div className="text-[10px] opacity-40">
                    {payment.paid_at ? format(new Date(payment.paid_at), "d MMM yyyy", { locale: nl }) : "In afwachting"}
                  </div>
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest opacity-40">
                  {payment.status === 'paid' ? 'Voldaan' : payment.status}
                </div>
              </div>
            ))}
            {(!payments || payments.length === 0) && (
              <div className="text-xs italic opacity-40">Nog geen betalingen verwerkt.</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-16 pt-8 border-t-4 border-black flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-xs opacity-40 max-w-md">
          Wil je je abonnement aanpassen of opzeggen? Dit kan op elk moment en gaat in per de volgende facturatieperiode.
        </div>
        <div className="flex gap-4">
          <Link href="/dashboard" className="text-sm font-bold border-b-2 border-black hover:border-transparent transition-all">Terug naar Dashboard</Link>
          <button className="text-sm font-bold text-red-600 border-b-2 border-red-600 hover:border-transparent transition-all">Support Contact</button>
        </div>
      </div>
    </div>
  );
}
