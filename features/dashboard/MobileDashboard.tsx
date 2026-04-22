"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { m as motion, AnimatePresence } from "framer-motion";
import { Bot, Camera, FileText, Clock } from "lucide-react";

import { getDashboardData, type DashboardData, type UpcomingInvoice } from "@/features/dashboard/actions";
import { updateInvoiceStatus, sendReminder } from "@/features/invoices/actions";
import { uploadReceiptImage, scanReceiptWithAI, createReceipt, updateReceipt, markReceiptAiProcessed } from "@/features/receipts/actions";
import { createHoursEntry } from "@/features/hours/actions";
import { createTrip } from "@/features/trips/actions";
import type { ActionResult } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/i18n/context";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useToast } from "@/components/ui/Toast";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import TaxAgentChat from "@/components/ai/TaxAgentChat";

type SheetType = "scan" | "invoice" | "hours" | "ai" | null;

export default function MobileDashboard({
  initialResult,
}: {
  initialResult?: ActionResult<DashboardData>;
}) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);

  const { data: dashboardResult, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
    initialData: initialResult,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const { pullDistance, isRefreshing, progress, triggered } = usePullToRefresh({
    onRefresh: async () => {
      await refetch();
    },
  });

  const data = dashboardResult?.data;
  const stats = data?.stats;
  const openInvoices = data?.openInvoices ?? [];
  const safeToSpend = data?.safeToSpend;
  const vatDeadline = data?.vatDeadline;
  const upcomingInvoices = data?.upcomingInvoices ?? [];

  const urgentCount = upcomingInvoices.filter((inv) => inv.days_overdue > 0).length;
  const outstandingAmount = upcomingInvoices.reduce((sum, inv) => sum + inv.total_inc_vat, 0);

  const dateLocale = locale === "en" ? "en-GB" : "nl-NL";

  return (
    <div className="mobile-dashboard" style={{ paddingBottom: 80 }}>
      <PullToRefreshIndicator
        distance={pullDistance}
        progress={progress}
        triggered={triggered}
        refreshing={isRefreshing}
      />

      {/* Hero: Vrij besteedbaar + BTW deadline */}
      <section className="mobile-dashboard-hero">
        <p className="label" style={{ margin: 0, opacity: 0.35 }}>
          {t.dashboard.freeToSpend}
        </p>
        <p
          style={{
            fontSize: "clamp(2.5rem, 10vw, 3.5rem)",
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            margin: "6px 0 0",
          }}
        >
          {safeToSpend ? formatCurrency(safeToSpend.safeToSpend) : "—"}
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 12, opacity: 0.5 }}>
          {t.dashboard.balance}{" "}
          {safeToSpend ? formatCurrency(safeToSpend.currentBalance) : t.dashboard.balanceNotAvailable}
        </p>

        {vatDeadline && (
          <div
            style={{
              marginTop: 20,
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 16,
              paddingTop: 16,
              borderTop: "0.5px solid rgba(0,0,0,0.08)",
            }}
          >
            <div>
              <p className="label" style={{ margin: 0, opacity: 0.35 }}>
                {t.dashboard.vatDeadline}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>
                {vatDeadline.daysRemaining} {t.dashboard.days}
              </p>
            </div>
            <p style={{ margin: 0, fontSize: 11, opacity: 0.45, textAlign: "right" }}>
              {vatDeadline.quarter} ·{" "}
              {new Date(vatDeadline.deadline).toLocaleDateString(dateLocale, {
                day: "numeric",
                month: "short",
              })}
            </p>
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className="mobile-dashboard-actions">
        <QuickActionButton
          icon={<Camera size={22} strokeWidth={1.5} />}
          label="Bon scannen"
          onClick={() => setActiveSheet("scan")}
        />
        <QuickActionButton
          icon={<FileText size={22} strokeWidth={1.5} />}
          label="Nieuwe factuur"
          href="/dashboard/invoices/new"
        />
        <QuickActionButton
          icon={<Clock size={22} strokeWidth={1.5} />}
          label="Uren / km"
          onClick={() => setActiveSheet("hours")}
        />
      </section>

      {/* Stats strip */}
      {stats && (
        <section className="mobile-dashboard-stats">
          <MobileStatCard
            label={t.dashboard.revenueThisMonth}
            value={formatCurrency(stats.revenueThisMonth)}
          />
          <MobileStatCard
            label={t.dashboard.outstandingAmount}
            value={formatCurrency(outstandingAmount)}
            sub={urgentCount > 0 ? `${urgentCount} ${t.dashboard.overdue}` : undefined}
            accent={urgentCount > 0}
          />
          <MobileStatCard
            label={t.dashboard.vatReserve}
            value={formatCurrency(stats.vatToPay)}
            hint={stats.vatToPay > 0 ? t.dashboard.vatReserveHint : undefined}
          />
          <MobileStatCard
            label={t.dashboard.receiptsProcessed}
            value={String(stats.receiptsThisMonth)}
            sub={t.dashboard.thisMonth}
          />
        </section>
      )}

      {/* Openstaande facturen als swipeable cards */}
      <section style={{ marginTop: 32 }}>
        <h2
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            opacity: 0.45,
            margin: "0 0 12px",
            padding: "0 20px",
          }}
        >
          {t.dashboard.openInvoicesTitle}
        </h2>
        {openInvoices.length === 0 ? (
          <div style={{ padding: "12px 20px" }}>
            <p style={{ margin: 0, fontSize: 14, opacity: 0.45, lineHeight: 1.5 }}>
              {t.dashboard.noOpenInvoices}
            </p>
            <Link
              href="/dashboard/invoices/new"
              className="btn-primary"
              style={{ marginTop: 16, display: "inline-block" }}
            >
              Nieuwe factuur
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 20px" }}>
            {openInvoices.slice(0, 6).map((invoice) => (
              <SwipeableInvoiceCard
                key={invoice.id}
                invoice={invoice}
                onPaid={async () => {
                  const res = await updateInvoiceStatus(invoice.id, "paid");
                  if (res.error) {
                    toast(res.error, "error");
                  } else {
                    toast("Factuur gemarkeerd als betaald", "success");
                    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
                  }
                }}
                onRemind={async () => {
                  const res = await sendReminder(invoice.id);
                  if (res.error) {
                    toast(res.error, "error");
                  } else {
                    toast("Herinnering verstuurd", "success");
                  }
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* AI Floating Action Button */}
      <button
        type="button"
        onClick={() => setActiveSheet("ai")}
        aria-label="Open AI assistent"
        className="mobile-dashboard-fab"
      >
        <Bot size={22} strokeWidth={1.5} />
      </button>

      {/* Bottom Sheets */}
      <BottomSheet
        open={activeSheet === "scan"}
        onClose={() => setActiveSheet(null)}
        title="Bon scannen"
      >
        <ScanReceiptSheet onDone={() => setActiveSheet(null)} />
      </BottomSheet>

      <BottomSheet
        open={activeSheet === "hours"}
        onClose={() => setActiveSheet(null)}
        title="Snel registreren"
      >
        <QuickLogSheet onDone={() => setActiveSheet(null)} />
      </BottomSheet>

      <BottomSheet
        open={activeSheet === "ai"}
        onClose={() => setActiveSheet(null)}
        title="AI fiscale assistent"
        maxHeight="90dvh"
      >
        <TaxAgentChat />
      </BottomSheet>
    </div>
  );
}

function PullToRefreshIndicator({
  distance,
  progress,
  triggered,
  refreshing,
}: {
  distance: number;
  progress: number;
  triggered: boolean;
  refreshing: boolean;
}) {
  if (distance === 0 && !refreshing) return null;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: Math.max(distance, refreshing ? 48 : 0),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: `${Math.max(24, progress * 72)}px`,
          height: 1,
          background: triggered || refreshing ? "var(--color-black)" : "rgba(0,0,0,0.2)",
          transition: "background 0.2s ease",
        }}
      />
    </div>
  );
}

function QuickActionButton({
  icon,
  label,
  onClick,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
}) {
  const content = (
    <>
      <span
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "var(--color-grey-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        {icon}
      </span>
      <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.02em" }}>{label}</span>
    </>
  );

  const style: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px 8px",
    background: "transparent",
    border: "0.5px solid rgba(0,0,0,0.08)",
    borderRadius: 14,
    color: "var(--foreground)",
    textDecoration: "none",
    cursor: "pointer",
    minHeight: 88,
  };

  if (href) {
    return (
      <Link href={href} style={style}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} style={style}>
      {content}
    </button>
  );
}

function MobileStatCard({
  label,
  value,
  sub,
  hint,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        padding: 16,
        border: "0.5px solid rgba(0,0,0,0.08)",
        borderRadius: 12,
        background: "var(--background)",
      }}
    >
      <p
        className="label"
        style={{
          margin: 0,
          fontSize: 9,
          opacity: 0.45,
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: "6px 0 0",
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: accent ? "var(--color-overdue)" : "var(--foreground)",
        }}
      >
        {value}
      </p>
      {sub && (
        <p style={{ margin: "2px 0 0", fontSize: 10, opacity: 0.5 }}>{sub}</p>
      )}
      {hint && (
        <p
          style={{
            margin: "2px 0 0",
            fontSize: 10,
            opacity: 0.45,
            fontStyle: "italic",
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

function SwipeableInvoiceCard({
  invoice,
  onPaid,
  onRemind,
}: {
  invoice: UpcomingInvoice;
  onPaid: () => void;
  onRemind: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const [acted, setActed] = useState(false);
  const startX = useRef<number | null>(null);

  const bindings = useSwipeGesture({
    onSwipeRight: () => {
      if (acted) return;
      setActed(true);
      setOffset(120);
      setTimeout(() => {
        onPaid();
      }, 200);
    },
    onSwipeLeft: () => {
      if (acted) return;
      setActed(true);
      setOffset(-120);
      setTimeout(() => {
        onRemind();
        setOffset(0);
        setActed(false);
      }, 200);
    },
    threshold: 70,
  });

  const isOverdue = invoice.days_overdue > 0;

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 10 }}>
      {/* Actie achtergronden */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 20px",
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--color-success)",
            opacity: offset > 20 ? 1 : 0,
            transition: "opacity 0.15s ease",
          }}
        >
          Markeer betaald
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--color-warning)",
            opacity: offset < -20 ? 1 : 0,
            transition: "opacity 0.15s ease",
          }}
        >
          Herinnering
        </span>
      </div>

      <motion.div
        {...bindings}
        animate={{ x: offset }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
        onTouchStartCapture={(e) => {
          startX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchMoveCapture={(e) => {
          if (startX.current === null || acted) return;
          const delta = (e.touches[0]?.clientX ?? 0) - startX.current;
          setOffset(Math.max(-120, Math.min(120, delta)));
        }}
        onTouchEndCapture={() => {
          startX.current = null;
          if (!acted) setOffset(0);
        }}
        style={{
          position: "relative",
          padding: "14px 16px",
          background: "var(--background)",
          border: "0.5px solid rgba(0,0,0,0.08)",
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          touchAction: "pan-y",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {invoice.client_name}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 11, opacity: 0.5 }}>
            {invoice.invoice_number}
            {isOverdue && ` · ${invoice.days_overdue}d achterstallig`}
          </p>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: isOverdue ? "var(--color-overdue)" : "var(--foreground)",
          }}
        >
          {formatCurrency(invoice.total_inc_vat)}
        </p>
      </motion.div>
    </div>
  );
}

function ScanReceiptSheet({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState<"idle" | "uploading" | "scanning">("idle");
  const fileRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      setProcessing("uploading");
      const receiptResult = await createReceipt({
        vendor_name: null,
        amount_ex_vat: 0,
        vat_rate: 21,
        category: "Overig",
        cost_code: null,
        receipt_date: new Date().toISOString().split("T")[0],
      });
      if (receiptResult.error || !receiptResult.data) {
        throw new Error(receiptResult.error ?? "Kon geen bon aanmaken");
      }
      const receiptId = receiptResult.data.id;

      const formData = new FormData();
      formData.append("file", file);
      const uploadResult = await uploadReceiptImage(receiptId, formData);
      if (uploadResult.error) throw new Error(uploadResult.error);

      setProcessing("scanning");
      const scanResult = await scanReceiptWithAI(receiptId);
      if (scanResult.data) {
        await updateReceipt(receiptId, {
          vendor_name: scanResult.data.vendor_name ?? null,
          amount_ex_vat: scanResult.data.amount_ex_vat ?? null,
          vat_rate: scanResult.data.vat_rate ?? null,
          category: null,
          cost_code: scanResult.data.cost_code ?? null,
          receipt_date: scanResult.data.receipt_date ?? null,
        });
        await markReceiptAiProcessed(receiptId);
      }
      return scanResult.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      toast(
        data?.vendor_name
          ? `${data.vendor_name} — ${data.amount_ex_vat ? formatCurrency(data.amount_ex_vat) : ""}`
          : "Bon opgeslagen",
        "success"
      );
      setProcessing("idle");
      onDone();
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : "Onbekende fout", "error");
      setProcessing("idle");
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) mutation.mutate(file);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={processing !== "idle"}
        style={{
          padding: "20px 16px",
          border: "0.5px dashed rgba(0,0,0,0.2)",
          borderRadius: 12,
          background: "transparent",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          cursor: processing === "idle" ? "pointer" : "default",
          minHeight: 160,
          justifyContent: "center",
        }}
      >
        <AnimatePresence mode="wait">
          {processing === "idle" ? (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
            >
              <Camera size={32} strokeWidth={1.2} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>Maak foto of kies bestand</span>
              <span style={{ fontSize: 11, opacity: 0.5 }}>AI verwerkt de bon automatisch</span>
            </motion.div>
          ) : (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
            >
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                {processing === "uploading" ? "Uploaden..." : "Bon wordt herkend..."}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}

function QuickLogSheet({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  async function logHours(hours: number) {
    setBusy(true);
    const res = await createHoursEntry({ date: today, hours, category: "Werk" });
    setBusy(false);
    if (res.error) {
      toast(res.error, "error");
    } else {
      toast(`${hours} uur geregistreerd`, "success");
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onDone();
    }
  }

  async function logTrip(km: number) {
    setBusy(true);
    const res = await createTrip({
      date: today,
      distance_km: km,
      is_return_trip: false,
      purpose: "Zakelijke rit",
    });
    setBusy(false);
    if (res.error) {
      toast(res.error, "error");
    } else {
      toast(`${km} km geregistreerd`, "success");
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onDone();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <p
          className="label"
          style={{ margin: "0 0 10px", fontSize: 10, opacity: 0.45 }}
        >
          Uren vandaag
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {[4, 8, 10].map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => logHours(h)}
              disabled={busy}
              style={{
                padding: "14px 12px",
                border: "0.5px solid rgba(0,0,0,0.12)",
                borderRadius: 10,
                background: "var(--background)",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                minHeight: 48,
              }}
            >
              +{h} uur
            </button>
          ))}
        </div>
      </div>

      <div>
        <p
          className="label"
          style={{ margin: "0 0 10px", fontSize: 10, opacity: 0.45 }}
        >
          Zakelijke kilometers
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {[25, 50, 100].map((km) => (
            <button
              key={km}
              type="button"
              onClick={() => logTrip(km)}
              disabled={busy}
              style={{
                padding: "14px 12px",
                border: "0.5px solid rgba(0,0,0,0.12)",
                borderRadius: 10,
                background: "var(--background)",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                minHeight: 48,
              }}
            >
              +{km} km
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
