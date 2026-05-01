"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(165, 28, 48, 0.08)" }}
          >
            <svg
              className="w-8 h-8"
              style={{ color: "var(--color-accent)" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Er ging iets mis</h1>
          <p className="mb-6" style={{ opacity: "var(--opacity-secondary)" }}>
            Er is een onverwachte fout opgetreden. Probeer het opnieuw of neem contact op als het probleem aanhoudt.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={reset} variant="primary">
            Opnieuw proberen
          </Button>
          <Link href="/login">
            <Button variant="secondary">Terug naar inloggen</Button>
          </Link>
        </div>

        {error.digest && (
          <p className="mt-6 text-sm" style={{ opacity: "var(--opacity-tertiary)" }}>
            Foutcode: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
