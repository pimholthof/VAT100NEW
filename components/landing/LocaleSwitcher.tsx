"use client";

import { useLocale } from "@/lib/i18n/context";

export default function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <button
      onClick={() => setLocale(locale === "nl" ? "en" : "nl")}
      className="label-strong"
      style={{
        textDecoration: "none",
        color: "var(--color-black)",
        padding: "6px 10px",
        border: "0.5px solid rgba(0,0,0,0.12)",
        borderRadius: "var(--radius-sm)",
        background: "transparent",
        cursor: "pointer",
        fontSize: "11px",
        letterSpacing: "0.1em",
        opacity: 0.5,
      }}
    >
      {locale === "nl" ? "EN" : "NL"}
    </button>
  );
}
