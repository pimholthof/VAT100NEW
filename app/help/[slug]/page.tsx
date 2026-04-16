import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HELP_ARTICLES, CATEGORY_LABELS, getArticle } from "../articles";

export async function generateStaticParams() {
  return HELP_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Niet gevonden — VAT100" };
  return {
    title: `${article.title} — VAT100 Helpcentrum`,
    description: article.description,
  };
}

/**
 * Eenvoudige markdown-lite renderer: ondersteunt ### headers,
 * #### subheaders, paragraafsplit op lege regels, ordered en
 * unordered lijsten, en **bold** binnen tekst. Voldoende voor
 * onze interne help-artikelen zonder MDX-runtime.
 */
function renderMarkdown(body: string): React.ReactNode {
  const lines = body.split("\n");
  const blocks: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let paraBuffer: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    const items = listBuffer.map((item, i) => (
      <li key={i} style={{ marginBottom: 6 }}>
        {renderInline(item)}
      </li>
    ));
    blocks.push(
      listType === "ol" ? (
        <ol
          key={`l-${key++}`}
          style={{
            paddingLeft: 20,
            margin: "0 0 20px",
            lineHeight: 1.7,
            opacity: 0.8,
          }}
        >
          {items}
        </ol>
      ) : (
        <ul
          key={`l-${key++}`}
          style={{
            paddingLeft: 20,
            margin: "0 0 20px",
            lineHeight: 1.7,
            opacity: 0.8,
          }}
        >
          {items}
        </ul>
      )
    );
    listBuffer = [];
    listType = null;
  };

  const flushPara = () => {
    if (paraBuffer.length === 0) return;
    const text = paraBuffer.join(" ");
    blocks.push(
      <p
        key={`p-${key++}`}
        style={{
          fontSize: 14,
          lineHeight: 1.75,
          opacity: 0.75,
          margin: "0 0 20px",
        }}
      >
        {renderInline(text)}
      </p>
    );
    paraBuffer = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("### ")) {
      flushList();
      flushPara();
      blocks.push(
        <h2
          key={`h2-${key++}`}
          style={{
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            margin: "32px 0 12px",
          }}
        >
          {line.slice(4)}
        </h2>
      );
    } else if (line.startsWith("#### ")) {
      flushList();
      flushPara();
      blocks.push(
        <h3
          key={`h3-${key++}`}
          style={{
            fontSize: 15,
            fontWeight: 600,
            margin: "20px 0 8px",
          }}
        >
          {line.slice(5)}
        </h3>
      );
    } else if (/^\d+\.\s/.test(line)) {
      flushPara();
      if (listType !== "ol") flushList();
      listType = "ol";
      listBuffer.push(line.replace(/^\d+\.\s/, ""));
    } else if (line.startsWith("- ")) {
      flushPara();
      if (listType !== "ul") flushList();
      listType = "ul";
      listBuffer.push(line.slice(2));
    } else if (line.trim() === "") {
      flushList();
      flushPara();
    } else {
      flushList();
      paraBuffer.push(line);
    }
  }
  flushList();
  flushPara();
  return blocks;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const match = remaining.match(/\*\*([^*]+)\*\*/);
    if (!match) {
      parts.push(remaining);
      break;
    }
    const [full, bold] = match;
    const idx = match.index ?? 0;
    if (idx > 0) parts.push(remaining.slice(0, idx));
    parts.push(
      <strong key={`b-${key++}`} style={{ fontWeight: 600 }}>
        {bold}
      </strong>
    );
    remaining = remaining.slice(idx + full.length);
  }
  return parts;
}

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "clamp(48px, 6vw, 96px) clamp(24px, 4vw, 64px)",
      }}
    >
      <Link
        href="/help"
        className="label"
        style={{
          opacity: 0.3,
          textDecoration: "none",
          color: "var(--color-black)",
        }}
      >
        &larr; Helpcentrum
      </Link>

      <p
        className="label"
        style={{
          fontSize: 10,
          letterSpacing: "0.12em",
          opacity: 0.5,
          margin: "32px 0 8px",
        }}
      >
        {CATEGORY_LABELS[article.category]}
      </p>

      <h1
        style={{
          fontSize: "clamp(2rem, 3.5vw, 2.5rem)",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          margin: "0 0 16px",
          lineHeight: 1.15,
        }}
      >
        {article.title}
      </h1>
      <p
        style={{
          fontSize: 15,
          lineHeight: 1.6,
          opacity: 0.6,
          marginBottom: 12,
        }}
      >
        {article.description}
      </p>
      <p className="label" style={{ opacity: 0.35, marginBottom: 48 }}>
        Laatst bijgewerkt: {article.updated}
      </p>

      <article>{renderMarkdown(article.body)}</article>

      <p
        style={{
          marginTop: 48,
          fontSize: 13,
          lineHeight: 1.6,
          opacity: 0.5,
          borderTop: "0.5px solid rgba(13,13,11,0.08)",
          paddingTop: 24,
        }}
      >
        Dit artikel is informatief en geen fiscaal advies. Zie onze{" "}
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
