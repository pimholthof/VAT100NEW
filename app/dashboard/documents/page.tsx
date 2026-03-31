"use client";

import { formatCurrency } from "@/lib/format";

export default function DocumentsPage() {
  const now = new Date();

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: "var(--space-xl)" }}>
        <div>
          <h1 className="display-title">Documenten</h1>
          <p style={{ fontSize: "var(--text-body-md)", fontWeight: 400, margin: "12px 0 0", opacity: 0.4 }}>
            Jaarrekeningen en fiscale exports
          </p>
        </div>
      </div>

      {/* Jaarrekening */}
      <h2 className="section-header" style={{ margin: "0 0 8px" }}>
        Jaarrekening
      </h2>
      <p style={{ fontSize: "var(--text-body-md)", fontWeight: 300, opacity: 0.6, margin: "0 0 24px" }}>
        Volledig overzicht van winst & verlies, balans en fiscale samenvatting.
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
            Download {y}
          </a>
        ))}
      </div>

      {/* IB Aangifte Export */}
      <h2 className="section-header" style={{ margin: "0 0 8px" }}>
        IB Aangifte Export
      </h2>
      <p style={{ fontSize: "var(--text-body-sm)", fontWeight: 300, opacity: 0.5, margin: "0 0 24px" }}>
        Exporteer je jaarrekening als IB-aangifte overzicht voor de Belastingdienst.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[now.getFullYear() - 1, now.getFullYear() - 2].map((y) => (
          <a
            key={y}
            href={`/api/export/ib-aangifte?year=${y}`}
            download
            className="btn-secondary"
          >
            IB Aangifte {y}
          </a>
        ))}
      </div>
    </div>
  );
}
