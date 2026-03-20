"use client";

import Link from "next/link";
import type { AnnualAccount } from "@/lib/annual-account/types";

interface Props {
  accounts: AnnualAccount[];
  currentYear: number;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "concept beschikbaar",
  reviewed: "beoordeeld",
  final: "definitief",
};

export function AnnualAccountCard({ accounts, currentYear }: Props) {
  // Show current year (might not have an account yet) + existing accounts
  const years = new Set<number>();
  years.add(currentYear);
  years.add(currentYear - 1);
  for (const a of accounts) {
    years.add(a.fiscal_year);
  }

  const sortedYears = Array.from(years).sort((a, b) => b - a).slice(0, 4);
  const accountMap = new Map(accounts.map((a) => [a.fiscal_year, a]));

  return (
    <div className="stat-card" style={{ padding: 0 }}>
      <div style={{ padding: "16px 20px 8px" }}>
        <span className="label" style={{ margin: 0 }}>Jaarrekening</span>
      </div>

      {sortedYears.map((year) => {
        const account = accountMap.get(year);
        return (
          <Link
            key={year}
            href={`/dashboard/jaarrekening/${year}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 20px",
              textDecoration: "none",
              color: "var(--foreground)",
              borderTop: "var(--border-content)",
            }}
          >
            <span
              className="mono-amount"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              {year}
            </span>
            <span
              className="label"
              style={{
                margin: 0,
                opacity: account ? 1 : 0.3,
                color:
                  account?.status === "final"
                    ? "var(--vat-olive)"
                    : "inherit",
              }}
            >
              {account
                ? STATUS_LABELS[account.status] ?? account.status
                : "niet gegenereerd"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
