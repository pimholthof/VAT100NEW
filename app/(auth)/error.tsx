"use client";

import { useEffect } from "react";
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
    // Log to error monitoring service
    console.error("Auth error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
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
          <p className="text-gray-600 mb-6">
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
          <p className="mt-6 text-sm text-gray-400">
            Foutcode: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
