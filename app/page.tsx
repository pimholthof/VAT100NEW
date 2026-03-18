import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div style={{ background: "var(--background)", color: "var(--foreground)", minHeight: "100vh" }}>
      {/* ── Navigation ── */}
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        height: 72,
        padding: "0 80px",
        borderBottom: "0.5px solid rgba(13, 13, 11, 0.08)",
      }}>
        <span className="label-strong" style={{ fontSize: 12, letterSpacing: "0.05em" }}>
          VAT100
        </span>
        <Link
          href="/login"
          className="label-strong"
          style={{ textDecoration: "none", color: "var(--foreground)" }}
        >
          INLOGGEN
        </Link>
      </header>

      {/* ── Hero ── */}
      <section style={{
        padding: "var(--space-hero) 80px",
        maxWidth: 1200,
        margin: "0 auto",
      }}>
        <h1
          className="display-hero"
          style={{ marginBottom: "var(--space-block)" }}
        >
          VAT100
        </h1>
        <p
          className="display-title"
          style={{ opacity: 0.4, marginBottom: "var(--space-section)" }}
        >
          Fiscale helderheid<br />
          voor creatieve<br />
          freelancers.
        </p>
        <Link
          href="/register"
          style={{
            display: "inline-block",
            background: "var(--foreground)",
            color: "var(--background)",
            padding: "16px 32px",
            fontFamily: "Inter, sans-serif",
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: "0.10em",
            textTransform: "uppercase" as const,
            textDecoration: "none",
          }}
        >
          BEGINNEN
        </Link>
      </section>

      {/* ── Rule ── */}
      <div style={{ borderTop: "0.5px solid rgba(13, 13, 11, 0.15)", margin: "0 80px" }} />

      {/* ── Features ── */}
      <section style={{
        padding: "var(--space-section) 80px",
        maxWidth: 1200,
        margin: "0 auto",
      }}>
        <p className="label" style={{ marginBottom: "var(--space-block)" }}>
          Eén systeem
        </p>
        <p className="display-title" style={{ opacity: 0.6, marginBottom: "var(--space-hero)" }}>
          Facturen. BTW. Bonnetjes.<br />
          Alles in één rust.
        </p>

        {/* Feature Grid — Asymmetric 3+9 */}
        {[
          { num: "01", title: "FACTUREREN", desc: "Bedrag + ontvanger = klaar. Eén klik, verzonden." },
          { num: "02", title: "BELASTING", desc: "BTW automatisch berekend. Nooit meer verrast in april." },
          { num: "03", title: "ADMINISTRATIE", desc: "AI leest je bonnetjes, jij bevestigt. 10 seconden per dag." },
        ].map((feature, i) => (
          <div key={feature.num}>
            {i > 0 && (
              <div style={{
                borderTop: "0.5px solid rgba(13, 13, 11, 0.08)",
                margin: "var(--space-block) 0",
              }} />
            )}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 3fr",
              gap: "var(--space-element)",
              alignItems: "baseline",
            }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span
                  className="mono-amount"
                  style={{ opacity: 0.3, fontSize: 11 }}
                >
                  {feature.num}
                </span>
                <span className="section-header">
                  {feature.title}
                </span>
              </div>
              <p style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                fontWeight: 300,
                lineHeight: 1.5,
                opacity: 0.5,
                margin: 0,
              }}>
                {feature.desc}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* ── Rule ── */}
      <div style={{ borderTop: "0.5px solid rgba(13, 13, 11, 0.15)", margin: "0 80px" }} />

      {/* ── CTA ── */}
      <section style={{
        padding: "var(--space-hero) 80px",
        maxWidth: 1200,
        margin: "0 auto",
      }}>
        <h2 className="display-title" style={{ marginBottom: "var(--space-element)" }}>
          Begin vandaag.
        </h2>
        <p style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 13,
          fontWeight: 300,
          opacity: 0.4,
          marginBottom: "var(--space-block)",
        }}>
          Geen creditcard nodig.
        </p>
        <Link
          href="/register"
          style={{
            display: "inline-block",
            background: "var(--foreground)",
            color: "var(--background)",
            padding: "16px 32px",
            fontFamily: "Inter, sans-serif",
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: "0.10em",
            textTransform: "uppercase" as const,
            textDecoration: "none",
          }}
        >
          GRATIS STARTEN
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        padding: "var(--space-block) 80px",
        borderTop: "0.5px solid rgba(13, 13, 11, 0.08)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span className="label" style={{ opacity: 0.3 }}>VAT100</span>
        <span className="label" style={{ opacity: 0.3 }}>&copy;2026</span>
        <span className="label" style={{ opacity: 0.3 }}>AMSTERDAM</span>
      </footer>
    </div>
  );
}
