"use client";

import { Lead, LeadLifecycle } from "@/lib/types";
import { LeadColumn } from "./LeadColumn";
import { useState, useEffect } from "react";
import { getRevenueMetrics } from "./actions";
import type { RevenueMetrics } from "./actions";
import { formatCurrency } from "@/lib/format";

interface LeadPipelineProps {
  initialLeads: Lead[];
}

export function LeadPipeline({ initialLeads }: LeadPipelineProps) {
  const [leads] = useState<Lead[]>(initialLeads);
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);

  useEffect(() => {
    async function loadMetrics() {
      const result = await getRevenueMetrics();
      if (result.data) {
        setMetrics(result.data);
      }
    }
    loadMetrics();
  }, []);

  const columns: { title: string; stages: LeadLifecycle[] }[] = [
    { title: "Nieuw", stages: ["Nieuw"] },
    { title: "Link Verstuurd", stages: ["Link Verstuurd"] },
    { title: "Plan Gekozen", stages: ["Plan Gekozen"] },
    { title: "Closing", stages: ["On hold"] },
    { title: "Klant", stages: ["Klant"] },
  ];

  const handleLeadClick = (leadId: string) => {
    window.location.href = `/admin/leads/${leadId}`;
  };

  const formatMetricCurrency = (cents: number) => {
    return formatCurrency(cents / 100);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Omzet metriek kaarten */}
      <div className="stat-cards-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div className="admin-metric-card">
          <span className="label">Maandelijkse terugkerende omzet</span>
          <div
            className="mono-amount-lg"
            style={{ fontSize: "1.75rem", fontWeight: 400, marginTop: "12px" }}
          >
            {metrics ? formatMetricCurrency(metrics.mrr_cents) : "\u2014"}
          </div>
        </div>
        <div className="admin-metric-card">
          <span className="label">Conversiepercentage</span>
          <div
            className="mono-amount-lg"
            style={{ fontSize: "1.75rem", fontWeight: 400, marginTop: "12px" }}
          >
            {metrics ? `${metrics.conversion_rate}%` : "\u2014"}
          </div>
        </div>
        <div className="admin-metric-card">
          <span className="label">Pijplijnprognose</span>
          <div
            className="mono-amount-lg"
            style={{
              fontSize: "1.75rem",
              fontWeight: 400,
              marginTop: "12px",
              opacity: 0.5,
            }}
          >
            {metrics ? formatMetricCurrency(metrics.pipeline_value_cents) : "\u2014"}
          </div>
        </div>
      </div>

      <div className="pipeline-grid">
        {columns.map((col) => {
          const filteredLeads = leads.filter((lead) =>
            col.stages.includes(lead.lifecycle_stage)
          );

          return (
            <LeadColumn
              key={col.title}
              title={col.title}
              leads={filteredLeads}
              onLeadClick={handleLeadClick}
            />
          );
        })}
      </div>
    </div>
  );
}
