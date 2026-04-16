import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Status — VAT100",
  description:
    "Live status van VAT100 en alle verbonden diensten. Volledig transparant.",
};

// Never cache — always reflect live status
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ServiceStatus = "healthy" | "degraded" | "down" | "unknown";

interface ServiceCheck {
  name: string;
  label: string;
  status: ServiceStatus;
  latency_ms?: number;
}

interface HealthResponse {
  status: ServiceStatus;
  timestamp: string;
  checks?: Record<
    string,
    { name: string; status: ServiceStatus; latency_ms: number; error?: string }
  >;
}

const SERVICE_LABELS: Record<string, string> = {
  database: "Database (Supabase)",
  auth: "Authenticatie",
  mollie: "Betalingen (Mollie)",
  resend: "E-mail (Resend)",
};

async function fetchHealth(): Promise<HealthResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vat100.nl";
  const secret = process.env.CRON_SECRET;

  try {
    const res = await fetch(`${baseUrl}/api/health`, {
      cache: "no-store",
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
    });
    if (!res.ok && res.status !== 503) return null;
    return (await res.json()) as HealthResponse;
  } catch {
    return null;
  }
}

function statusColor(status: ServiceStatus): string {
  switch (status) {
    case "healthy":
      return "#10b981"; // green
    case "degraded":
      return "#f59e0b"; // amber
    case "down":
      return "#ef4444"; // red
    default:
      return "#9ca3af"; // gray
  }
}

function statusLabel(status: ServiceStatus): string {
  switch (status) {
    case "healthy":
      return "Operationeel";
    case "degraded":
      return "Verminderde prestaties";
    case "down":
      return "Storing";
    default:
      return "Onbekend";
  }
}

function overallMessage(status: ServiceStatus): string {
  switch (status) {
    case "healthy":
      return "Alle systemen werken normaal.";
    case "degraded":
      return "Een of meer systemen hebben last van vertraging. VAT100 blijft bruikbaar, maar bepaalde acties kunnen langer duren.";
    case "down":
      return "Er is een storing op een kritiek onderdeel. We werken eraan — volg deze pagina voor updates.";
    default:
      return "Statusinformatie is momenteel niet beschikbaar.";
  }
}

export default async function StatusPage() {
  const health = await fetchHealth();
  const overall: ServiceStatus = health?.status ?? "unknown";

  const services: ServiceCheck[] =
    health?.checks != null
      ? Object.entries(health.checks).map(([key, c]) => ({
          name: c.name,
          label: SERVICE_LABELS[key] ?? key,
          status: c.status,
          latency_ms: c.latency_ms,
        }))
      : // Zonder detail-auth tonen we alleen het hoofdoordeel + aanname
        [
          { name: "app", label: "Webapp", status: overall },
        ];

  const timestamp = health?.timestamp
    ? new Date(health.timestamp).toLocaleString("nl-NL", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "Europe/Amsterdam",
      })
    : null;

  return (
    <div
      style={{
        maxWidth: 720,
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
        Status
      </h1>

      {/* Overall */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "20px 24px",
          border: "0.5px solid rgba(13,13,11,0.08)",
          marginBottom: 32,
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: statusColor(overall),
            boxShadow: `0 0 0 4px ${statusColor(overall)}22`,
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {overallMessage(overall)}
          </div>
          {timestamp ? (
            <div
              className="label"
              style={{ fontSize: 10, opacity: 0.45, marginTop: 4 }}
            >
              Laatst ververst: {timestamp}
            </div>
          ) : null}
        </div>
      </div>

      {/* Per service */}
      <section>
        <h2
          className="label"
          style={{
            fontSize: 10,
            letterSpacing: "0.12em",
            opacity: 0.5,
            marginBottom: 16,
          }}
        >
          Onderdelen
        </h2>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            borderTop: "0.5px solid rgba(13,13,11,0.08)",
          }}
        >
          {services.map((s) => (
            <li
              key={s.name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "16px 0",
                borderBottom: "0.5px solid rgba(13,13,11,0.08)",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: statusColor(s.status),
                  }}
                />
                {s.label}
              </span>
              <span
                style={{
                  fontSize: 12,
                  opacity: 0.55,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {statusLabel(s.status)}
                {s.latency_ms != null ? ` · ${s.latency_ms}ms` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p
        style={{
          marginTop: 40,
          fontSize: 13,
          lineHeight: 1.6,
          opacity: 0.5,
        }}
      >
        Melding van een storing?{" "}
        <a
          href="mailto:support@vat100.nl"
          style={{ color: "inherit", fontWeight: 600 }}
        >
          support@vat100.nl
        </a>
        . Deze pagina wordt bij elke request server-side ververst; er draait
        geen polling in je browser.
      </p>
    </div>
  );
}
