"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  getDashboardStats,
  getRecentInvoices,
  type RecentInvoice,
} from "@/lib/actions/dashboard";

const statusLabels: Record<string, string> = {
  draft: "Concept",
  sent: "Verzonden",
  paid: "Betaald",
  overdue: "Verlopen",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const { data: statsResult, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => getDashboardStats(),
  });

  const { data: invoicesResult, isLoading: invoicesLoading } = useQuery({
    queryKey: ["dashboard-recent-invoices"],
    queryFn: () => getRecentInvoices(),
  });

  const stats = statsResult?.data;
  const invoices = invoicesResult?.data;

  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "var(--text-display-md)",
          fontWeight: 900,
          letterSpacing: "var(--tracking-display)",
          lineHeight: 1,
          margin: "0 0 32px",
        }}
      >
        Dashboard
      </h1>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 24,
          marginBottom: 48,
        }}
        className="stat-cards-grid"
      >
        {statsLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : stats ? (
          <>
            <StatCard
              label="Omzet deze maand"
              value={formatCurrency(stats.revenueThisMonth)}
            />
            <StatCard
              label="Open facturen"
              value={String(stats.openInvoiceCount)}
              sub={formatCurrency(stats.openInvoiceAmount)}
            />
            <StatCard
              label="BTW te betalen"
              value={formatCurrency(stats.vatToPay)}
            />
            <StatCard
              label="Bonnen deze maand"
              value={String(stats.receiptsThisMonth)}
            />
          </>
        ) : null}
      </div>

      {/* Recent invoices table */}
      <h2
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "1.25rem",
          fontWeight: 900,
          letterSpacing: "var(--tracking-display)",
          lineHeight: 1,
          margin: "0 0 16px",
        }}
      >
        Laatste facturen
      </h2>

      {invoicesLoading ? (
        <SkeletonTable />
      ) : invoices && invoices.length > 0 ? (
        <InvoiceTable invoices={invoices} />
      ) : (
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-lg)",
            opacity: 0.5,
          }}
        >
          Nog geen facturen aangemaakt.
        </p>
      )}
    </div>
  );
}

/* ── Stat Card ── */

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        border: "none",
        borderTop: "var(--border-rule)",
        padding: "24px 0",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "9px",
          fontWeight: 500,
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          margin: "0 0 8px",
          opacity: 0.6,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "2.5rem",
          fontWeight: 900,
          lineHeight: 1,
          margin: 0,
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-sm)",
            fontWeight: 400,
            margin: "8px 0 0",
            opacity: 0.5,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

/* ── Skeleton Card ── */

function SkeletonCard() {
  return (
    <div
      style={{
        border: "none",
        borderTop: "var(--border-rule)",
        padding: "24px 0",
        opacity: 0.12,
      }}
    >
      <div className="skeleton" style={{ width: "60%", height: 9, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: "80%", height: 32 }} />
    </div>
  );
}

/* ── Invoice Table ── */

function InvoiceTable({ invoices }: { invoices: RecentInvoice[] }) {
  const cellStyle: React.CSSProperties = {
    padding: "10px 12px",
    fontFamily: "var(--font-body), sans-serif",
    fontSize: "var(--text-body-lg)",
    fontWeight: 400,
    letterSpacing: "0.05em",
    borderBottom: "1px solid rgba(13, 13, 11, 0.08)",
    textAlign: "left",
  };

  const headerStyle: React.CSSProperties = {
    ...cellStyle,
    fontSize: "9px",
    fontWeight: 500,
    letterSpacing: "0.25em",
    textTransform: "uppercase",
    opacity: 0.5,
    borderBottom: "1px solid var(--foreground)",
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          borderSpacing: 0,
        }}
      >
        <thead>
          <tr>
            <th style={headerStyle}>Status</th>
            <th style={headerStyle}>Klant</th>
            <th style={headerStyle}>Datum</th>
            <th style={{ ...headerStyle, textAlign: "right" }}>Bedrag</th>
            <th style={{ ...headerStyle, width: 80 }}>Actie</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td style={cellStyle}>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 500,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                  }}
                >
                  {statusLabels[inv.status] ?? inv.status}
                </span>
              </td>
              <td style={cellStyle}>{inv.client_name}</td>
              <td style={cellStyle}>{formatDate(inv.issue_date)}</td>
              <td style={{ ...cellStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {formatCurrency(inv.total_inc_vat)}
              </td>
              <td style={cellStyle}>
                <Link
                  href={`/dashboard/invoices/${inv.id}`}
                  style={{
                    fontFamily: "var(--font-body), sans-serif",
                    fontSize: "var(--text-body-sm)",
                    fontWeight: 500,
                    letterSpacing: "0.05em",
                    color: "var(--foreground)",
                    textDecoration: "underline",
                  }}
                >
                  Bekijk
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Skeleton Table ── */

function SkeletonTable() {
  return (
    <div style={{ opacity: 0.12 }}>
      {/* Header row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr 1fr 1fr 80px",
          gap: 12,
          padding: "10px 12px",
          borderBottom: "1px solid var(--foreground)",
        }}
      >
        {[60, 80, 70, 60, 40].map((w, i) => (
          <div key={i} className="skeleton" style={{ width: `${w}%`, height: 9 }} />
        ))}
      </div>
      {/* Body rows */}
      {Array.from({ length: 5 }).map((_, row) => (
        <div
          key={row}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr 1fr 1fr 80px",
            gap: 12,
            padding: "12px 12px",
            borderBottom: "1px solid rgba(13, 13, 11, 0.08)",
          }}
        >
          {[50, 70, 60, 50, 30].map((w, i) => (
            <div key={i} className="skeleton" style={{ width: `${w}%`, height: 13 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
