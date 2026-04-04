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
  hasClient: boolean;
  hasInvoice: boolean;
  hasReceipt: boolean;
  hasBankConnection: boolean;
}

export function OnboardingChecklist({
  hasProfile,
  hasClient,
  hasInvoice,
  hasReceipt,
  hasBankConnection,
}: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(false);
  const { t } = useLocale();

  const steps: OnboardingStep[] = [
    {
      key: "profile",
      done: hasProfile,
      label: t.onboarding.stepProfile,
      href: "/dashboard/settings",
    },
    {
      key: "client",
      done: hasClient,
      label: t.onboarding.stepClient,
      href: "/dashboard/clients/new",
    },
    {
      key: "invoice",
      done: hasInvoice,
      label: t.onboarding.stepInvoice,
      href: "/dashboard/invoices/new",
    },
    {
      key: "bank",
      done: hasBankConnection,
      label: t.onboarding.stepBank,
      href: "/dashboard/bank",
    },
    {
      key: "receipt",
      done: hasReceipt,
      label: t.onboarding.stepReceipt,
      href: "/dashboard/receipts/new",
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const totalSteps = steps.length;
  const allDone = completedCount === totalSteps;
  const nextStep = steps.find((s) => !s.done);

  // Don't show if all done or dismissed
  if (dismissed || allDone) return null;

  // Allow dismissing after completing at least 3 steps
  const canDismiss = completedCount >= 3;

  async function handleDismiss() {
    setDismissed(true);
    await markOnboardingDismissed();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        style={{
          padding: "28px 32px",
          border: "0.5px solid rgba(0,0,0,0.08)",
          borderRadius: "var(--radius)",
          marginBottom: 32,
          position: "relative",
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
        }}
      >
        {/* Dismiss button */}
        {canDismiss && (
          <button
            onClick={handleDismiss}
            aria-label={t.onboarding.dismiss}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              opacity: 0.25,
              color: "var(--foreground)",
            }}
          >
            ×
          </button>
        )}

        {/* Header */}
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

        {/* Progress bar */}
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

        {/* Steps */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {steps.map((step) => (
            <div
              key={step.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  border: step.done ? "none" : "1px solid rgba(0,0,0,0.15)",
                  background: step.done ? "var(--foreground)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  color: "var(--background)",
                  flexShrink: 0,
                  transition: "all 0.3s ease",
                }}
              >
                {step.done && "✓"}
              </span>
              {step.done ? (
                <span
                  style={{
                    fontSize: "var(--text-body-md)",
                    opacity: 0.3,
                    textDecoration: "line-through",
                  }}
                >
                  {step.label}
                </span>
              ) : (
                <Link
                  href={step.href}
                  style={{
                    fontSize: "var(--text-body-md)",
                    color: "var(--foreground)",
                    textDecoration: "none",
                    fontWeight: step.key === nextStep?.key ? 500 : 400,
                    opacity: step.key === nextStep?.key ? 0.8 : 0.5,
                  }}
                >
                  {step.label} {step.key === nextStep?.key && "→"}
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Next action CTA */}
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
      </motion.div>
    </AnimatePresence>
  );
}
