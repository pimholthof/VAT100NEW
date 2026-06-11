"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";
import { useState } from "react";
import { LocaleProvider } from "@/lib/i18n/context";
import { ToastProvider } from "@/components/ui/Toast";
import type { Locale } from "@/lib/i18n";

export function Providers({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale?: Locale;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={domAnimation} strict>
        {/* CSS dekt prefers-reduced-motion al; dit dekt de framer-animaties */}
        <MotionConfig reducedMotion="user">
          <LocaleProvider initialLocale={locale ?? "nl"}>
            <ToastProvider>
              {children}
            </ToastProvider>
          </LocaleProvider>
        </MotionConfig>
      </LazyMotion>
    </QueryClientProvider>
  );
}
