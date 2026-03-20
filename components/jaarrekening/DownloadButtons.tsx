"use client";

import { useState } from "react";
import { getAnnualAccountPdfUrl } from "@/lib/actions/annual-account";

interface DownloadButtonsProps {
  fiscalYear: number;
  hasNlPdf: boolean;
  hasEnPdf: boolean;
}

export function DownloadButtons({ fiscalYear, hasNlPdf, hasEnPdf }: DownloadButtonsProps) {
  const [downloading, setDownloading] = useState<"nl" | "en" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(lang: "nl" | "en") {
    setDownloading(lang);
    setError(null);

    const result = await getAnnualAccountPdfUrl(fiscalYear, lang);

    if (result.error) {
      setError(result.error);
      setDownloading(null);
      return;
    }

    if (result.data) {
      window.open(result.data, "_blank");
    }

    setDownloading(null);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 12 }}>
        <button
          className="action-button"
          onClick={() => handleDownload("nl")}
          disabled={!hasNlPdf || downloading !== null}
          style={{ flex: 1 }}
        >
          {downloading === "nl" ? "..." : "DOWNLOAD NL"}
        </button>
        <button
          className="action-button-secondary"
          onClick={() => handleDownload("en")}
          disabled={!hasEnPdf || downloading !== null}
          style={{ flex: 1 }}
        >
          {downloading === "en" ? "..." : "DOWNLOAD EN"}
        </button>
      </div>
      {error && (
        <p
          style={{
            fontSize: 11,
            color: "var(--color-reserved)",
            marginTop: 8,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
