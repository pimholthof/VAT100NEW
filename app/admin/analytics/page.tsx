import { requireAdmin } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const FUNNEL: { event: string; label: string }[] = [
  { event: "user.registered", label: "Geregistreerd" },
  { event: "user.onboarding_completed", label: "Onboarding voltooid" },
  { event: "user.invoice_created", label: "Eerste factuur" },
  { event: "user.vat_viewed", label: "BTW bekeken" },
];

interface EventRow {
  event_type: string;
  payload: { user_id?: string } | null;
}

/**
 * Activatie-funnel: unieke gebruikers per stap, op basis van de user.*-events
 * in system_events. Cruciaal om te zien wáár bèta-gebruikers afhaken.
 */
export default async function AdminAnalyticsPage() {
  const admin = await requireAdmin();
  if (admin.error !== null) redirect("/dashboard");

  const { data } = await admin.supabase
    .from("system_events")
    .select("event_type, payload")
    .in("event_type", FUNNEL.map((f) => f.event))
    .limit(5000);

  const rows = (data ?? []) as unknown as EventRow[];

  const usersByEvent = new Map<string, Set<string>>();
  for (const r of rows) {
    const uid = r.payload?.user_id;
    if (!uid) continue;
    if (!usersByEvent.has(r.event_type)) usersByEvent.set(r.event_type, new Set());
    usersByEvent.get(r.event_type)!.add(uid);
  }

  const counts = FUNNEL.map((f) => ({ ...f, count: usersByEvent.get(f.event)?.size ?? 0 }));
  const top = counts[0].count || 1;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
        Activatie-funnel
      </h1>
      <p className="label" style={{ opacity: 0.5, margin: "0 0 32px" }}>
        Unieke gebruikers per stap
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {counts.map((c, i) => {
          const pct = Math.round((c.count / top) * 100);
          const conv =
            i === 0 ? 100 : counts[0].count ? Math.round((c.count / counts[0].count) * 100) : 0;
          return (
            <div key={c.event}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span>{c.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", opacity: 0.7 }}>
                  {c.count} · {conv}%
                </span>
              </div>
              <div style={{ height: 8, background: "rgba(0,0,0,0.05)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "var(--foreground)" }} />
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 11, opacity: 0.4, marginTop: 32, lineHeight: 1.6 }}>
        Telt unieke gebruikers per event uit system_events (laatste 5.000 events).
        Conversie is t.o.v. de eerste stap.
      </p>
    </div>
  );
}
