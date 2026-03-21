import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div
      style={{
        background: "var(--vat-paper)",
        color: "var(--vat-obsidian)",
        minHeight: "100vh",
      }}
    >
      {/* Navigation */}
      <nav className="landing-nav">
        <span className="landing-nav-logo">VAT100</span>
        <Link href="/login" className="landing-nav-link">
          Toegang
        </Link>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <h1 className="landing-hero-title">
          Hoeveel van
          <br />
          het geld op je
          <br />
          rekening is echt
          <br />
          van jou?
        </h1>
        <p className="landing-hero-sub">
          VAT100 beantwoordt die vraag. Elke dag.
        </p>
      </section>

      <hr className="landing-divider" />

      {/* Features */}
      <section className="landing-section">
        <p className="landing-section-label">Wat VAT100 doet</p>
        <div className="landing-feature-grid">
          <div className="landing-feature-card">
            <h2 className="landing-feature-title">Facturen</h2>
            <p className="landing-feature-desc">
              Maak professionele facturen, verstuur ze direct en houd
              betaalstatus bij. PDF-export en automatische herinneringen
              inbegrepen.
            </p>
          </div>
          <div className="landing-feature-card">
            <h2 className="landing-feature-title">Belasting</h2>
            <p className="landing-feature-desc">
              Automatische BTW-berekening en IB-reservering. Elk kwartaal
              weet je precies wat je moet afdragen. Geen verrassingen.
            </p>
          </div>
          <div className="landing-feature-card">
            <h2 className="landing-feature-title">Inzicht</h2>
            <p className="landing-feature-desc">
              Eén getal dat ertoe doet: hoeveel je vrij kunt besteden. Na
              BTW, na belastingreservering. Het echte antwoord.
            </p>
          </div>
        </div>
      </section>

      <hr className="landing-divider" />

      {/* How it works */}
      <section className="landing-section">
        <p className="landing-section-label">Hoe het werkt</p>
        <div>
          <div className="landing-step">
            <span className="landing-step-number">01</span>
            <div>
              <h3 className="landing-step-title">Koppel je bankrekening</h3>
              <p className="landing-step-desc">
                Via Open Banking importeert VAT100 je transacties
                automatisch. Veilig en direct.
              </p>
            </div>
          </div>
          <div className="landing-step">
            <span className="landing-step-number">02</span>
            <div>
              <h3 className="landing-step-title">
                Verstuur facturen &amp; upload bonnen
              </h3>
              <p className="landing-step-desc">
                Maak facturen in seconden. Upload bonnen — AI herkent de
                gegevens automatisch.
              </p>
            </div>
          </div>
          <div className="landing-step">
            <span className="landing-step-number">03</span>
            <div>
              <h3 className="landing-step-title">
                Weet wat écht van jou is
              </h3>
              <p className="landing-step-desc">
                VAT100 berekent continu je belastingverplichtingen en toont
                wat je vrij kunt besteden.
              </p>
            </div>
          </div>
        </div>
      </section>

      <hr className="landing-divider" />

      {/* Waitlist */}
      <section className="landing-waitlist">
        <h2 className="landing-waitlist-title">Early Access</h2>
        <p className="landing-waitlist-sub">
          Boekhouding zonder ruis — binnenkort beschikbaar
        </p>
        <form className="landing-waitlist-form" action="/register">
          <input
            type="email"
            name="email"
            placeholder="je@email.nl"
            required
            className="landing-waitlist-input"
          />
          <button type="submit" className="landing-waitlist-submit">
            Schrijf je in
          </button>
        </form>
        <p className="landing-waitlist-counter">
          Voor ZZP&apos;ers met een eenmanszaak
        </p>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <span className="landing-footer-logo">VAT100</span>
        <span className="landing-footer-tagline">
          Boekhouding zonder ruis
        </span>
      </footer>
    </div>
  );
}
