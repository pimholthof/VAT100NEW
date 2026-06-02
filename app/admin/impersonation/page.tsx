import { requireAdmin } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const TIMEOUT_MIN = 30; // moet matchen met IMPERSONATE_TIMEOUT in lib/admin/impersonate.ts

interface SessionRow {
  id: string;
  admin_id: string;
  impersonated_user_id: string;
  started_at: string;
  ended_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  reason: string | null;
}

function fmt(d: string) {
  return new Date(d).toLocaleString("nl-NL");
}

/**
 * Read-only auditspoor van admin-impersonatie: wie, wie, wanneer, hoe lang,
 * vanaf welk IP. Tamper-proof via de DB-trigger op impersonation_sessions.
 */
export default async function AdminImpersonationPage() {
  const admin = await requireAdmin();
  if (admin.error !== null) redirect("/dashboard");

  const { data } = await admin.supabase
    .from("impersonation_sessions")
    .select("id, admin_id, impersonated_user_id, started_at, ended_at, ip_address, user_agent, reason")
    .order("started_at", { ascending: false })
    .limit(200);

  const sessions = (data ?? []) as unknown as SessionRow[];

  const ids = Array.from(
    new Set(sessions.flatMap((s) => [s.admin_id, s.impersonated_user_id])),
  );
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profiles } = await admin.supabase
      .from("profiles")
      .select("id, full_name, studio_name")
      .in("id", ids);
    for (const p of (profiles ?? []) as { id: string; full_name: string | null; studio_name: string | null }[]) {
      names.set(p.id, p.studio_name || p.full_name || p.id.slice(0, 8));
    }
  }
  const nameOf = (id: string) => names.get(id) ?? id.slice(0, 8);

  // Server-component: één klok-meting per request is correct en stabiel.
  // eslint-disable-next-line react-hooks/purity
  const renderedAt = Date.now();

  function describe(s: SessionRow): { status: string; duur: string } {
    const start = new Date(s.started_at).getTime();
    if (s.ended_at) {
      const mins = Math.max(0, Math.round((new Date(s.ended_at).getTime() - start) / 60000));
      return { status: "Beëindigd", duur: `${mins} min` };
    }
    const autoEnd = start + TIMEOUT_MIN * 60000;
    if (autoEnd < renderedAt) {
      return { status: "Verlopen", duur: `± ${TIMEOUT_MIN} min` };
    }
    const mins = Math.max(0, Math.round((renderedAt - start) / 60000));
    return { status: "Actief", duur: `${mins} min — lopend` };
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
        Impersonatie-auditspoor
      </h1>
      <p className="label" style={{ opacity: 0.5, margin: "0 0 32px" }}>
        {sessions.length} sessie{sessions.length === 1 ? "" : "s"} · tamper-proof
      </p>

      {sessions.length === 0 ? (
        <p style={{ opacity: 0.5 }}>Nog geen impersonatie-sessies.</p>
      ) : (
        <div>
          {sessions.map((s) => {
            const { status, duur } = describe(s);
            return (
              <div
                key={s.id}
                style={{ padding: "16px 0", borderBottom: "0.5px solid rgba(0,0,0,0.08)" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {nameOf(s.admin_id)} → {nameOf(s.impersonated_user_id)}
                  </span>
                  <span className="label" style={{ opacity: 0.5, fontSize: 11 }}>{status} · {duur}</span>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11, opacity: 0.5 }}>
                  <span>{fmt(s.started_at)}{s.ended_at ? ` → ${fmt(s.ended_at)}` : ""}</span>
                  {s.ip_address && <span>IP {s.ip_address}</span>}
                  {s.reason && <span>Reden: {s.reason}</span>}
                </div>
                {s.user_agent && (
                  <div style={{ fontSize: 10, opacity: 0.3, marginTop: 4, wordBreak: "break-all" }}>
                    {s.user_agent}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
