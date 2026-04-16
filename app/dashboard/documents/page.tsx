"use client";

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

      {/* Boekhouder-export */}
      <h2
        className="section-header"
        style={{ margin: "var(--space-section) 0 8px" }}
      >
        Boekhouder-export
      </h2>
      <p
        style={{
          fontSize: "var(--text-body-sm)",
          fontWeight: 300,
          opacity: 0.5,
          margin: "0 0 24px",
          maxWidth: 640,
        }}
      >
        CSV in memoriaalboeking-formaat met grootboekrekeningen en BTW-codes.
        Compatibel met Twinfield, Exact Online en Snelstart. Deel deze bestanden
        direct met je accountant.
      </p>

      <p
        className="label"
        style={{ margin: "0 0 8px", opacity: 0.5 }}
      >
        Uitgaande facturen
      </p>
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map(
          (y) => (
            <a
              key={`inv-${y}`}
              href={`/api/export/accountant?type=invoices&year=${y}`}
              download
              className="btn-secondary"
            >
              Facturen {y}
            </a>
          )
        )}
      </div>

      <p
        className="label"
        style={{ margin: "0 0 8px", opacity: 0.5 }}
      >
        Bonnen & kosten
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map(
          (y) => (
            <a
              key={`rcpt-${y}`}
              href={`/api/export/accountant?type=receipts&year=${y}`}
              download
              className="btn-secondary"
            >
              Bonnen {y}
            </a>
          )
        )}
      </div>
    </div>
  );
}
