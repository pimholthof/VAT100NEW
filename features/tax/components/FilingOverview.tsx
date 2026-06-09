"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFilingOverview } from "@/features/tax/filing-overview";
import {
  generateVatReturn,
  lockVatReturn,
  submitVatReturn,
} from "@/features/tax/vat-returns-actions";
import { formatCurrency } from "@/lib/format";
import { SkeletonCard } from "@/components/ui";
import type {
  FilingReadiness,
  FilingStatus,
  FilingBlocker,
} from "@/lib/tax/filing-readiness";

const STATUS_LABEL: Record<FilingStatus, string> = {
  niet_van_toepassing: "Niet nodig",
  onvolledig: "Onvolledig",
  klaar: "Klaar",
  concept: "Concept",
  vergrendeld: "Vergrendeld",
  ingediend: "Ingediend",
};

const STATUS_COLOR: Record<FilingStatus, string> = {
  niet_van_toepassing: "rgba(0,0,0,0.35)",
  onvolledig: "var(--color-warning)",
  klaar: "var(--color-info)",
  concept: "var(--color-info)",
  vergrendeld: "var(--foreground)",
  ingediend: "var(--color-success)",
};

function blockerLabel(b: FilingBlocker): string {
  switch (b.code) {
    case "period_open":
      return "Periode loopt nog";
    case "receipt_incomplete":
      return `${b.count ?? 0} bon${(b.count ?? 0) === 1 ? "" : "nen"} onvolledig`;
    case "profile_incomplete":
      return "Profiel onvolledig (KVK/BTW)";
    case "balance_mismatch":
      return "Balans sluit niet";
    case "no_activity":
      return "Geen activiteit";
  }
}

export function FilingOverview() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["filing-overview"],
    queryFn: () => getFilingOverview(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["filing-overview"] });
    queryClient.invalidateQueries({ queryKey: ["vat-returns"] });
    queryClient.invalidateQueries({ queryKey: ["btw-overview"] });
  };

  const generate = useMutation({
    mutationFn: ({ year, quarter }: { year: number; quarter: number }) =>
      generateVatReturn(year, quarter),
    onSuccess: invalidate,
  });
  const lock = useMutation({
    mutationFn: (id: string) => lockVatReturn(id),
    onSuccess: invalidate,
  });
  const submit = useMutation({
    mutationFn: (id: string) => submitVatReturn(id),
    onSuccess: invalidate,
  });

  const busy = generate.isPending || lock.isPending || submit.isPending;

  if (isLoading) {
    return <SkeletonCard />;
  }

  const overview = data?.data;
  if (!overview) return null;

  const { btw, ib, jaarrekening } = overview;

  return (
    <section style={{ marginBottom: "var(--space-xl)" }}>
      <p className="label" style={{ margin: "0 0 16px" }}>Aangiftes &amp; afsluiting</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: 16,
        }}
      >
        {/* ── BTW ── */}
        {btw && (
          <FilingCard
            title="BTW-aangifte"
            period={btw.readiness.period}
            readiness={btw.readiness}
            action={
              <BtwAction
                readiness={btw.readiness}
                busy={busy}
                onPrepare={() => generate.mutate({ year: btw.year, quarter: btw.quarter })}
                onLock={() => btw.returnId && lock.mutate(btw.returnId)}
                onSubmit={() => btw.returnId && submit.mutate(btw.returnId)}
              />
            }
          />
        )}

        {/* ── Inkomstenbelasting ── */}
        {ib && (
          <FilingCard
            title="Inkomstenbelasting"
            period={ib.readiness.period}
            readiness={ib.readiness}
            action={
              ib.readiness.status === "ingediend" ? null : (
                <LinkAction href={`/api/export/ib-aangifte?year=${ib.year}`} label="Bekijk cijfers" />
              )
            }
          />
        )}

        {/* ── Jaarrekening ── */}
        {jaarrekening && (
          <FilingCard
            title="Jaarrekening"
            period={jaarrekening.readiness.period}
            readiness={jaarrekening.readiness}
            action={
              <LinkAction href={`/api/jaarrekening/${jaarrekening.year}`} label="Genereer PDF" />
            }
          />
        )}
      </div>
    </section>
  );
}

function FilingCard({
  title,
  period,
  readiness,
  action,
}: {
  title: string;
  period: string;
  readiness: FilingReadiness;
  action: React.ReactNode;
}) {
  const showAmount =
    readiness.kind !== "jaarrekening" &&
    readiness.amount != null &&
    readiness.status !== "niet_van_toepassing";

  return (
    <div
      className="glass"
      style={{
        borderRadius: "var(--radius-lg)",
        padding: "22px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        minHeight: 168,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: "var(--text-body-md)", fontWeight: 600, letterSpacing: "-0.01em" }}>{title}</p>
          <p className="mono-amount" style={{ margin: "2px 0 0", fontSize: 12, opacity: 0.45 }}>{period}</p>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: STATUS_COLOR[readiness.status],
            whiteSpace: "nowrap",
          }}
        >
          {STATUS_LABEL[readiness.status]}
        </span>
      </div>

      {showAmount && (
        <p
          className="mono-amount"
          style={{ margin: 0, fontSize: "1.75rem", fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1 }}
        >
          {formatCurrency(readiness.amount ?? 0)}
        </p>
      )}

      {readiness.blockers.length > 0 && (
        <p style={{ margin: 0, fontSize: 11, opacity: 0.5, lineHeight: 1.5 }}>
          {readiness.blockers.map(blockerLabel).join(" · ")}
        </p>
      )}

      <div style={{ marginTop: "auto" }}>{action}</div>
    </div>
  );
}

function BtwAction({
  readiness,
  busy,
  onPrepare,
  onLock,
  onSubmit,
}: {
  readiness: FilingReadiness;
  busy: boolean;
  onPrepare: () => void;
  onLock: () => void;
  onSubmit: () => void;
}) {
  switch (readiness.nextAction) {
    case "voorbereiden":
      return <ActionButton label="Voorbereiden" onClick={onPrepare} busy={busy} />;
    case "vergrendelen":
      return <ActionButton label="Vergrendelen" onClick={onLock} busy={busy} />;
    case "indienen":
      return <ActionButton label="Markeer ingediend" onClick={onSubmit} busy={busy} />;
    case "controleren":
      return <LinkAction href="#btw-zone" label="Controleren" />;
    case "betalen":
      return <LinkAction href="#btw-zone" label="Betalen" />;
    case "wachten":
      return <span style={{ fontSize: 12, opacity: 0.4 }}>Nog niet af te ronden</span>;
    default:
      return null;
  }
}

function ActionButton({ label, onClick, busy }: { label: string; onClick: () => void; busy: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="btn-primary"
      style={{ opacity: busy ? 0.5 : 1 }}
    >
      {busy ? "Bezig…" : label}
    </button>
  );
}

function LinkAction({ href, label }: { href: string; label: string }) {
  const external = href.startsWith("/api/");
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="btn-secondary"
      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
    >
      {label} →
    </a>
  );
}
