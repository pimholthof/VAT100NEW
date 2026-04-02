"use client";

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { Locale } from "./types";
import { getDictionary, type Dictionary } from "./index";

interface LocaleContextValue {
  locale: Locale;
  t: Dictionary;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLocale = "nl",
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const [locale] = useState<Locale>(initialLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    document.cookie = `locale=${newLocale};path=/;max-age=${365 * 24 * 60 * 60};samesite=lax`;
    // Full reload so server components also pick up the new locale
    window.location.reload();
  }, []);

  const t = useMemo(() => getDictionary(locale), [locale]);

  const value = useMemo(
    () => ({ locale, t, setLocale }),
    [locale, t, setLocale]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
