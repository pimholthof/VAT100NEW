"use client";

import { useState } from "react";
import Link from "next/link";
import { m as motion, AnimatePresence } from "framer-motion";
import { useLocale } from "@/lib/i18n/context";
import { markOnboardingDismissed } from "../actions";

export interface OnboardingStep {
  key: string;
  done: boolean;
  label: string;
  href: string;
}

interface OnboardingChecklistProps {
  hasProfile: boolean;
  hasFiscalProfile: boolean;
  hasClient: boolean;
  hasInvoice: boolean;
  hasReceipt: boolean;
  hasBankConnection: boolean;
  onboardingDismissed?: boolean;
}

export function OnboardingChecklist({
  hasProfile,
  hasFiscalProfile,
  hasClient,
  hasInvoice,
  hasReceipt,
  hasBankConnection,
  onboardingDismissed = false,
}: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(onboardingDismissed);
  const { t } = useLocale();

  const steps: OnboardingStep[] = [
    { key: "profile", done: hasProfile, label: t.onboarding.stepProfile, href: "/dashboard/settings" },
    { key: "fiscal", done: hasFiscalProfile, label: t.onboarding.stepFiscal, href: "/dashboard/settings" },
    { key: "client", done: hasClient, label: t.onboarding.stepClient, href: "/dashboard/clients/new" },
    { key: "invoice", done: hasInvoice, label: t.onboarding.stepInvoice, href: "/dashboard/invoices/new" },
    { key: "bank", done: hasBankConnection, label: t.onboarding.stepBank, href: "/dashboard/bank" },
    { key: "receipt", done: hasReceipt, label: t.onboarding.stepReceipt, href: "/dashboard/receipts/new" },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const totalSteps = steps.length;
  const allDone = completedCount === totalSteps;
  const remainingSteps = steps.filter((s) => !s.done);
  const nextStep = remainingSteps[0];

  // Checklist start ingeklapt zodra je je eerste stap hebt gezet — je ziet
  // je cijfers, niet je huiswerk. Deterministisch (server == client), dus
  // geen hydration-mismatch. Binnen de sessie kun je 'm zelf uit-/inklappen.
  const [minimized, setMinimized] = useState(completedCount > 0);

  if (dismissed || allDone) return null;

  async function handleDismiss() {
    setDismissed(true);
    await markOnboardingDismissed();
  }

  function toggleMinimized() {
    setMinimized((m) => !m);
  }

  if (minimized) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="glass"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 14px 10px 18px",
          borderRadius: 999,
          marginBottom: 24,
          width: "fit-content",
        }}
      >
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            opacity: 0.55,
            fontWeight: 500,
          }}
        >
          Onboarding {completedCount}/{totalSteps}
        </span>
        {nextStep && (
          <>
            <span style={{ opacity: 0.2 }}>·</span>
            <Link
              href={nextStep.href}
              style={{
                fontSize: 12,
                color: "var(--foreground)",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              {nextStep.label} →
            </Link>
          </>
        )}
        <button
          type="button"
          onClick={toggleMinimized}
          aria-label="Uitklappen"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 14,
            opacity: 0.4,
            padding: "4px 6px",
            color: "var(--foreground)",
            lineHeight: 1,
          }}
        >
          ▾
        </button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="glass"
        style={{
          padding: "28px 32px",
          borderRadius: "var(--radius)",
          marginBottom: 32,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            display: "flex",
            gap: 4,
          }}
        >
          <button
            type="button"
            onClick={toggleMinimized}
            aria-label="Minimaliseren"
            title="Minimaliseren"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              opacity: 0.35,
              color: "var(--foreground)",
              padding: "4px 8px",
              lineHeight: 1,
              fontWeight: 300,
            }}
          >
            –
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label={t.onboarding.dismiss}
            title={t.onboarding.dismiss}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              opacity: 0.35,
              color: "var(--foreground)",
              padding: "4px 8px",
              lineHeight: 1,
              fontWeight: 300,
            }}
          >
            ×
          </button>
        </div>

        <p className="label" style={{ margin: "0 0 4px", opacity: 0.4 }}>
          {t.onboarding.title}
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            margin: "0 0 20px",
          }}
        >
          <p
            style={{
              fontSize: "var(--text-display-sm)",
              fontWeight: 600,
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {completedCount} {t.onboarding.of} {totalSteps}
          </p>
        </div>

        <div
          style={{
            height: 2,
            background: "rgba(0,0,0,0.06)",
            borderRadius: 1,
            overflow: "hidden",
            marginBottom: 20,
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / totalSteps) * 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              height: "100%",
              background: "var(--foreground)",
              borderRadius: 1,
            }}
          />
        </div>

        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {/* Alle stappen tonen — voltooid mét vinkje. Alleen de open items
              tonen leest als selecteerbare radio's en klopt niet met de
              "4 van 6"-teller erboven. */}
          <AnimatePresence initial={false}>
            {steps.map((step) => (
              <motion.li
                key={step.key}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: step.done ? "none" : "1px solid rgba(0,0,0,0.15)",
                    background: step.done ? "var(--color-success)" : "transparent",
                    color: "var(--background)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  {step.done ? "✓" : ""}
                </span>
                {step.done ? (
                  <span
                    style={{
                      fontSize: "var(--text-body-md)",
                      opacity: 0.35,
                    }}
                  >
                    {step.label}
                    <span className="sr-only"> — voltooid</span>
                  </span>
                ) : (
                  <Link
                    href={step.href}
                    style={{
                      fontSize: "var(--text-body-md)",
                      color: "var(--foreground)",
                      textDecoration: "none",
                      fontWeight: step.key === nextStep?.key ? 500 : 400,
                      opacity: step.key === nextStep?.key ? 0.85 : 0.55,
                    }}
                  >
                    {step.label} {step.key === nextStep?.key && "→"}
                  </Link>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {nextStep && (
          <Link
            href={nextStep.href}
            style={{
              display: "block",
              marginTop: 24,
              padding: "14px 0",
              textAlign: "center",
              background: "var(--foreground)",
              color: "var(--background)",
              textDecoration: "none",
              fontSize: "var(--text-label)",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              borderRadius: "var(--radius)",
            }}
          >
            {t.onboarding.nextAction}: {nextStep.label}
          </Link>
        )}

        {!hasClient && (
          <Link
            href="/dashboard/import"
            style={{
              display: "block",
              marginTop: 16,
              textAlign: "center",
              fontSize: 12,
              opacity: 0.5,
              color: "var(--foreground)",
              textDecoration: "none",
            }}
          >
            Kom je van Moneybird? Importeer je klanten →
          </Link>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
