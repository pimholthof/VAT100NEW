import Link from "next/link";

/**
 * Vriendelijke foutstaat in de taal van de 404-pagina: uitleg, geruststelling
 * en minstens één herstelactie — nooit alleen een kale rode regel.
 */
export function ErrorState({
  title,
  description,
  detail,
  actionLabel,
  actionHref,
}: {
  title: string;
  description?: string;
  /** Technische foutmelding, gedempt onder de uitleg. */
  detail?: string | null;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "96px 24px",
      }}
    >
      <p
        aria-hidden="true"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 40,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          margin: "0 0 16px",
          opacity: 0.12,
        }}
      >
        ⌀
      </p>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          margin: "0 0 10px",
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontSize: 14,
          opacity: 0.55,
          lineHeight: 1.6,
          maxWidth: 380,
          margin: "0 0 8px",
        }}
      >
        {description ??
          "Geen zorgen — je administratie staat er nog. Mogelijk is de link verouderd of het item verwijderd."}
      </p>
      {detail && (
        <p
          style={{
            fontSize: 12,
            opacity: 0.35,
            fontFamily: "var(--font-mono)",
            margin: "0 0 28px",
          }}
        >
          {detail}
        </p>
      )}
      <Link href={actionHref} className="btn-primary" style={{ marginTop: detail ? 0 : 20 }}>
        {actionLabel}
      </Link>
    </div>
  );
}
