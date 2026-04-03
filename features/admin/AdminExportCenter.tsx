"use client";

import { useState } from "react";
import { exportAllCustomersCSV } from "@/features/admin/actions/customers";
import { exportAllLeads, exportSubscriptions, exportAuditLog } from "@/features/admin/actions/bulk";

function downloadCSV(csv: string, filename: string) {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const EXPORTS = [
  {
    id: "customers",
    title: "Alle klanten",
    description: "Profielen, e-mail, plan, KVK en BTW-nummers",
    filename: "vat100-klanten.csv",
  },
  {
    id: "leads",
    title: "Alle leads",
    description: "Pipeline leads met scores, bron en fase",
    filename: "vat100-leads.csv",
  },
  {
    id: "subscriptions",
    title: "Abonnementen",
    description: "Alle subscriptions met plan en status",
    filename: "vat100-abonnementen.csv",
  },
  {
    id: "audit",
    title: "Audit log",
    description: "Admin acties en wijzigingshistorie",
    filename: "vat100-audit-log.csv",
  },
] as const;

type ExportId = typeof EXPORTS[number]["id"];

export function AdminExportCenter() {
  const [loading, setLoading] = useState<ExportId | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  async function handleExport(id: ExportId) {
    setLoading(id);
    try {
      let result: { error: string | null; data?: string };
      const exportConfig = EXPORTS.find((e) => e.id === id)!;

      switch (id) {
        case "customers":
          result = await exportAllCustomersCSV();
          break;
        case "leads":
          result = await exportAllLeads();
          break;
        case "subscriptions":
          result = await exportSubscriptions();
          break;
        case "audit":
          result = await exportAuditLog();
          break;
      }

      if (!result.error && result.data) {
        downloadCSV(result.data, exportConfig.filename);
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="admin-panel admin-section">
      <div className="admin-panel-header">
        <div>
          <p className="label">Data</p>
          <h2 className="admin-panel-title">Export Center</h2>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="admin-button-link admin-button-link-secondary"
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          {isExpanded ? "Inklappen" : "Uitklappen"}
        </button>
      </div>

      {isExpanded && (
        <div className="admin-export-grid">
          {EXPORTS.map((exp) => (
            <div key={exp.id} className="admin-export-card">
              <div className="admin-export-card-title">{exp.title}</div>
              <div className="admin-export-card-desc">{exp.description}</div>
              <button
                className="admin-export-card-button"
                onClick={() => handleExport(exp.id)}
                disabled={loading !== null}
              >
                {loading === exp.id ? "Exporteren..." : "Download CSV"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
