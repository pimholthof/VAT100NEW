"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  getDashboardData,
  type UpcomingInvoice,
  type DashboardData,
} from "@/lib/actions/dashboard";
import type { ActionResult } from "@/lib/types";
import { sendReminder } from "@/lib/actions/invoices";
import { listAnnualAccounts } from "@/lib/actions/annual-account";
import { formatCurrency } from "@/lib/format";

import {
  StatCard,
  SkeletonTable,
  ErrorMessage,
} from "@/components/ui";
import { QuickReceiptUpload } from "@/components/dashboard/QuickReceiptUpload";
import { NotificationBar, type Notification } from "@/components/dashboard/NotificationBar";
import { AnnualAccountCard } from "@/components/jaarrekening/AnnualAccountCard";

export default function DashboardClient({
  initialResult,
}: {
  initialResult?: ActionResult<DashboardData>;
}) {
  const { data: dashboardResult, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
    initialData: initialResult,
    staleTime: 5 * 60 * 1000,
  });

  const { data: accountsResult } = useQuery({
    queryKey: ["annual-accounts"],
    queryFn: () => listAnnualAccounts(),
    staleTime: 5 * 60 * 1000,
  });

  const data = dashboardResult?.data;
  const stats = data?.stats;
  const upcomingInvoices = data?.upcomingInvoices;
  const safeToSpend = data?.safeToSpend;
  const annualAccounts = accountsResult?.data ?? [];

  // Build notifications from dashboard data
  const notifications: Notification[] = [];

  if (data?.vatDeadline && data.vatDeadline.daysRemaining <= 14) {
    const vd = data.vatDeadline;
    notifications.push({
      id: `vat-deadline-${vd.quarter}`,
      type: "urgent",
      message: `BTW-aangifte ${vd.quarter} is over ${vd.daysRemaining} dagen — ${formatCurrency(vd.estimatedAmount)} te betalen`,
    });
  }

  const overdueCount =
    upcomingInvoices?.filter((inv) => inv.days_overdue > 0).length ?? 0;
  if (overdueCount > 0) {
    notifications.push({
      id: "overdue-invoices",
      type: "warning",
      message: `Je hebt ${overdueCount} openstaande ${overdueCount === 1 ? "factuur" : "facturen"} die over de betaaltermijn ${overdueCount === 1 ? "is" : "zijn"}`,
    });
  }

  return (
    <div className="flex flex-col gap-8 md:gap-12 pb-12 md:pb-20">
      <h1 className="sr-only">Dashboard</h1>

      {!isLoading && notifications.length > 0 && (
        <NotificationBar notifications={notifications} />
      )}

      {safeToSpend && !isLoading && (
        <section aria-label="Vrij te besteden">
          <div className="pt-4 pb-12 border-b border-b-[var(--border-light)]">
          <p className="hero-label mb-4">
            Vrij te besteden
          </p>
          <p className="hero-amount">
            {formatCurrency(safeToSpend.safeToSpend)}
          </p>
          </div>
        </section>
      )}

      {!isLoading && stats && (
        <section>
          <h2 className="section-header section-divider opacity-40">
            Kerngetallen
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              label="Openstaand"
              value={String(stats.openInvoiceCount)}
              sub={formatCurrency(stats.openInvoiceAmount)}
            />
            <StatCard
              label="BTW-reserve"
              value={formatCurrency(stats.vatToPay)}
              sub="Kwartaalprognose"
            />
            <QuickReceiptUpload />
          </div>
        </section>
      )}

      {!isLoading && (
        <section>
          <h2 className="section-header section-divider opacity-40">
            Jaarrekening
          </h2>
          <AnnualAccountCard
            accounts={annualAccounts}
            currentYear={new Date().getFullYear() - 1}
          />
        </section>
      )}

      <section>
        <h2 className="section-header section-divider opacity-40">
          Openstaande facturen
        </h2>
        {isLoading ? (
          <SkeletonTable />
        ) : upcomingInvoices && upcomingInvoices.length > 0 ? (
          <UpcomingInvoiceTable invoices={upcomingInvoices} />
        ) : (
          <p className="empty-state">Geen openstaande facturen</p>
        )}
      </section>
    </div>
  );
}

function UpcomingInvoiceTable({ invoices }: { invoices: UpcomingInvoice[] }) {
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleSendReminder = async (invoiceId: string) => {
    setSendingId(invoiceId);
    setStatusMsg(null);
    const res = await sendReminder(invoiceId);
    if (res.error) {
      setStatusMsg(res.error);
    } else {
      setStatusMsg("Herinnering verzonden.");
    }
    setSendingId(null);
  };

  return (
    <div className="overflow-x-auto">
    <div className="data-table min-w-[600px]">
      {statusMsg && <ErrorMessage>{statusMsg}</ErrorMessage>}

      <div className="data-table-header grid-cols-[120px_1fr_140px_100px_120px]">
        <span>Factuur</span>
        <span>Klant</span>
        <span className="text-right">Bedrag</span>
        <span className="text-center">Status</span>
        <span className="text-right">Actie</span>
      </div>

      {invoices.map((inv) => {
        const isOverdue = inv.days_overdue > 0;

        return (
          <div
            key={inv.id}
            className="data-table-row grid-cols-[120px_1fr_140px_100px_120px]"
          >
            <span className="mono-amount text-xs opacity-50">
              {inv.invoice_number}
            </span>

            <Link
              href={`/dashboard/invoices/${inv.id}`}
              className="font-semibold text-sm no-underline text-foreground tracking-[-0.01em] uppercase"
            >
              {inv.client_name}
            </Link>

            <span className="mono-amount text-[13px] font-medium text-right">
              {formatCurrency(inv.total_inc_vat)}
            </span>

            <span
              className={`label text-center m-0 ${isOverdue ? "text-[var(--color-reserved)] opacity-100" : "opacity-40"}`}
            >
              {isOverdue ? (
                <>
                  <span className="status-dot" data-status="overdue" />
                  {inv.days_overdue}D
                </>
              ) : (
                <>
                  <span className="status-dot" data-status="active" />
                  ACTIEF
                </>
              )}
            </span>

            <div className="text-right">
              {inv.client_email ? (
                <button
                  onClick={() => handleSendReminder(inv.id)}
                  disabled={sendingId === inv.id}
                  className={`table-action bg-transparent border-none border-b border-b-foreground cursor-pointer px-0 pt-0 pb-0.5 ${sendingId === inv.id ? "opacity-20" : "opacity-60"}`}
                >
                  {sendingId === inv.id ? "..." : "HERINNERING"}
                </button>
              ) : (
                <span className="label opacity-50">—</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
}
