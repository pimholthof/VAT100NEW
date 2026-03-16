import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Moodboard — VAT100",
  description: "Visuele richting voor de VAT100 restyling",
};

const images = [
  {
    src: "/moodboard/01-lc3-corbusier.jpg",
    index: "01",
    label: "MATERIALITEIT",
    title: "LC3 Le Corbusier",
    description:
      "Modernistische materialiteit. Luxe door terughoudendheid, structurele eerlijkheid.",
  },
  {
    src: "/moodboard/02-aawum-museum.jpg",
    index: "02",
    label: "TYPOGRAFIE",
    title: "AAWU(M) Museum",
    description:
      "Data-gedreven typografie. Massieve cijfers, radicaal zwart-wit contrast.",
  },
  {
    src: "/moodboard/03-vernisage-poster.jpg",
    index: "03",
    label: "SCHAAL",
    title: "Vernisage",
    description:
      "Editorial brutalisme. Gecondenseerde typografie als visueel element, extreme schaalcontrasten.",
  },
  {
    src: "/moodboard/04-brand-guidelines.jpg",
    index: "04",
    label: "SYSTEEM",
    title: "Brand Guidelines",
    description:
      "Typografisch systeem. Gestructureerd grid, systematische hiërarchie.",
  },
  {
    src: "/moodboard/05-danish-design.jpg",
    index: "05",
    label: "EENVOUD",
    title: "Danish Design",
    description:
      "Radicale eenvoud. Extreme whitespace, lijst-navigatie, dunne lijnen.",
  },
];

const principles = [
  { index: "01", title: "STRUCTUREEL EERLIJK" },
  { index: "02", title: "TYPOGRAFISCH GEDREVEN" },
  { index: "03", title: "EXTREME SCHAAL" },
  { index: "04", title: "SYSTEMATISCH" },
  { index: "05", title: "RADICALE EENVOUD" },
];

export default function MoodboardPage() {
  return (
    <main
      style={{
        background:
          "linear-gradient(180deg, #0a0f0a 0%, #111610 30%, #1a1f18 60%, #2a2820 100%)",
        color: "#FAFAF8",
        minHeight: "100vh",
      }}
    >
      {/* ── HERO ── */}
      <header style={{ padding: "120px 80px 80px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <p
              style={{
                fontSize: "14px",
                fontWeight: 300,
                letterSpacing: "0.08em",
                opacity: 0.4,
                margin: "0 0 24px 0",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              00
            </p>
            <h1
              style={{
                fontSize: "clamp(4rem, 12vw, 14rem)",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                lineHeight: 0.85,
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              Mood
              <br />
              board
            </h1>
          </div>
          <p
            style={{
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              opacity: 0.4,
              margin: 0,
              textAlign: "right",
              lineHeight: 1.8,
            }}
          >
            VAT100
            <br />
            Visuele richting
            <br />
            2026
          </p>
        </div>
        <div
          style={{
            borderTop: "0.5px solid rgba(250, 250, 248, 0.12)",
            marginTop: "48px",
          }}
        />
      </header>

      {/* ── IMAGE GRID ── */}
      <section style={{ padding: "0 80px" }}>
        {/* Row 1: LC3 (large) + AAWUM (smaller) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "7fr 5fr",
            gap: "24px",
            marginBottom: "24px",
          }}
        >
          <MoodboardCard {...images[0]} aspect="4/3" />
          <MoodboardCard {...images[1]} aspect="4/3" />
        </div>

        {/* Row 2: Vernisage (full width) */}
        <div style={{ marginBottom: "24px" }}>
          <MoodboardCard {...images[2]} aspect="16/9" />
        </div>

        {/* Row 3: Brand Guidelines + Danish Design */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
          }}
        >
          <MoodboardCard {...images[3]} aspect="3/4" />
          <MoodboardCard {...images[4]} aspect="3/4" />
        </div>
      </section>

      {/* ── DESIGN PRINCIPLES ── */}
      <section style={{ padding: "120px 80px 160px" }}>
        <div
          style={{
            borderTop: "0.5px solid rgba(250, 250, 248, 0.12)",
            paddingTop: "48px",
          }}
        >
          <p
            style={{
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              opacity: 0.4,
              margin: "0 0 64px 0",
            }}
          >
            Kernprincipes
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "48px",
            }}
          >
            {principles.map((p) => (
              <div key={p.index}>
                <p
                  style={{
                    fontSize: "48px",
                    fontWeight: 300,
                    lineHeight: 1,
                    margin: "0 0 16px 0",
                    opacity: 0.15,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {p.index}
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                    lineHeight: 1.2,
                    margin: 0,
                  }}
                >
                  {p.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function MoodboardCard({
  src,
  index,
  label,
  title,
  description,
  aspect,
}: {
  src: string;
  index: string;
  label: string;
  title: string;
  description: string;
  aspect: string;
}) {
  return (
    <article>
      <div
        style={{
          position: "relative",
          aspectRatio: aspect,
          overflow: "hidden",
          background: "rgba(250, 250, 248, 0.03)",
        }}
      >
        <Image
          src={src}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          style={{ objectFit: "cover" }}
        />
      </div>
      <div style={{ paddingTop: "16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "16px",
            marginBottom: "8px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 300,
              opacity: 0.3,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {index}
          </span>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              opacity: 0.5,
            }}
          >
            {label}
          </span>
        </div>
        <h3
          style={{
            fontSize: "20px",
            fontWeight: 800,
            letterSpacing: "0.01em",
            textTransform: "uppercase",
            lineHeight: 1.1,
            margin: "0 0 6px 0",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: "12px",
            fontWeight: 300,
            lineHeight: 1.5,
            opacity: 0.5,
            margin: 0,
            maxWidth: "360px",
          }}
        >
          {description}
        </p>
      </div>
    </article>
  );
}
