"use client";

import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/i18n/context";

export default function DocumentsPage() {
  const { t } = useLocale();
  const now = new Date();

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: "var(--space-xl)" }}>
        <div>
          <h1 className="display-title">{t.documents.title}</h1>
          <p style={{ fontSize: "var(--text-body-md)", fontWeight: 400, margin: "12px 0 0", opacity: 0.4 }}>
            {t.documents.subtitle}
          </p>
        </div>
      </div>

      {/* Jaarrekening */}
      <h2 className="section-header" style={{ margin: "0 0 8px" }}>
        {t.documents.annualReport}
      </h2>
      <p style={{ fontSize: "var(--text-body-md)", fontWeight: 300, opacity: 0.6, margin: "0 0 24px" }}>
        {t.documents.annualReportDesc}
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: "var(--space-section)" }}>
        {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => (
          <a
            key={y}
            href={`/api/jaarrekening/${y}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            {t.documents.downloadYear.replace("{year}", String(y))}
          </a>
        ))}
      </div>

      {/* IB Aangifte Export */}
      <h2 className="section-header" style={{ margin: "0 0 8px" }}>
        {t.documents.ibExport}
      </h2>
      <p style={{ fontSize: "var(--text-body-sm)", fontWeight: 300, opacity: 0.5, margin: "0 0 24px" }}>
        {t.documents.ibExportDesc}
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[now.getFullYear() - 1, now.getFullYear() - 2].map((y) => (
          <a
            key={y}
            href={`/api/export/ib-aangifte?year=${y}`}
            download
            className="btn-secondary"
          >
            {t.documents.ibYear.replace("{year}", String(y))}
          </a>
        ))}
      </div>
    </div>
  );
}
