import type { Metadata } from "next";
import Link from "next/link";
import { HELP_ARTICLES, CATEGORY_LABELS, type HelpArticle } from "./articles";

export const metadata: Metadata = {
  title: "Helpcentrum — VAT100",
  description:
    "Antwoorden op veelgestelde vragen over BTW, inkomstenbelasting en factureren voor Nederlandse ZZP'ers.",
};

function groupByCategory(): Record<string, HelpArticle[]> {
  const groups: Record<string, HelpArticle[]> = {};
  for (const article of HELP_ARTICLES) {
    const label = CATEGORY_LABELS[article.category];
    if (!groups[label]) groups[label] = [];
    groups[label].push(article);
  }
  return groups;
}

export default function HelpIndexPage() {
  const groups = groupByCategory();

  return (
    <div
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "clamp(48px, 6vw, 96px) clamp(24px, 4vw, 64px)",
      }}
    >
      <Link
        href="/"
        className="label"
        style={{
          opacity: 0.3,
          textDecoration: "none",
          color: "var(--color-black)",
        }}
      >
        &larr; Terug
      </Link>

      <h1
        style={{
          fontSize: "clamp(2rem, 4vw, 3rem)",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          marginTop: 32,
          marginBottom: 12,
        }}
      >
        Helpcentrum
      </h1>
      <p
        style={{
          fontSize: 15,
          lineHeight: 1.6,
          opacity: 0.6,
          marginBottom: 56,
          maxWidth: 520,
        }}
      >
        Korte, praktische uitleg over Nederlandse fiscaliteit voor ZZP&apos;ers.
        Gespecificeerd voor creatieve freelancers. Actueel voor boekjaar 2026.
      </p>

      {Object.entries(groups).map(([category, articles]) => (
        <section key={category} style={{ marginBottom: 40 }}>
          <h2
            className="label"
            style={{
              fontSize: 10,
              letterSpacing: "0.12em",
              opacity: 0.5,
              marginBottom: 16,
            }}
          >
            {category}
          </h2>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              borderTop: "0.5px solid rgba(13,13,11,0.08)",
            }}
          >
            {articles.map((article) => (
              <li
                key={article.slug}
                style={{
                  borderBottom: "0.5px solid rgba(13,13,11,0.08)",
                }}
              >
                <Link
                  href={`/help/${article.slug}`}
                  style={{
                    display: "block",
                    padding: "20px 0",
                    textDecoration: "none",
                    color: "var(--color-black)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    {article.title}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.5,
                      opacity: 0.55,
                    }}
                  >
                    {article.description}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p
        style={{
          marginTop: 56,
          fontSize: 13,
          lineHeight: 1.6,
          opacity: 0.5,
          borderTop: "0.5px solid rgba(13,13,11,0.08)",
          paddingTop: 24,
        }}
      >
        Mis je een onderwerp? Mail ons op{" "}
        <a
          href="mailto:hello@vat100.nl"
          style={{ color: "inherit", fontWeight: 600 }}
        >
          hello@vat100.nl
        </a>
        . Deze artikelen zijn informatief en geen fiscaal advies — zie ook onze{" "}
        <Link
          href="/disclaimer"
          style={{ color: "inherit", fontWeight: 600 }}
        >
          Fiscaal Disclaimer
        </Link>
        .
      </p>
    </div>
  );
}
