"use client";

import { Lead, LeadLifecycle } from "@/lib/types";
import { LeadColumn } from "./LeadColumn";
import { useState, useEffect } from "react";
import { getRevenueMetrics, type RevenueMetrics } from "./actions";

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

  // Grouping logic for the 5 visual columns (Monitoring View)
  const columns: { title: string, stages: LeadLifecycle[] }[] = [
    { title: "Nieuw", stages: ["Nieuw"] },
    { title: "Link Verstuurd", stages: ["Link Verstuurd"] },
    { title: "Plan Gekozen", stages: ["Plan Gekozen"] },
    { title: "Closing", stages: ["On hold"] },
    { title: "Klant", stages: ["Klant"] },
  ];

  const handleLeadClick = (leadId: string) => {
    window.location.href = `/admin/leads/${leadId}`;
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
      {/* Revenue Radar Bar */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
        gap: "24px" 
      }}>
        <div style={{ border: "2px solid black", padding: "24px", background: "white" }}>
          <div style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", opacity: 0.4, marginBottom: 8 }}>Monthly Recurring Revenue</div>
          <div style={{ fontSize: "28px", fontWeight: 900, fontStyle: "italic", letterSpacing: "-0.04em" }}>
            {metrics ? formatCurrency(metrics.mrr_cents) : "€ --"}
          </div>
        </div>
        <div style={{ border: "2px solid black", padding: "24px", background: "white" }}>
          <div style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", opacity: 0.4, marginBottom: 8 }}>Conversion Rate</div>
          <div style={{ fontSize: "28px", fontWeight: 900, fontStyle: "italic", letterSpacing: "-0.04em" }}>
            {metrics ? `${metrics.conversion_rate}%` : "--%"}
          </div>
        </div>
        <div style={{ border: "2px solid black", padding: "24px", background: "white" }}>
          <div style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", opacity: 0.4, marginBottom: 8 }}>Pipeline Projection</div>
          <div style={{ fontSize: "28px", fontWeight: 900, fontStyle: "italic", letterSpacing: "-0.04em", opacity: 0.5 }}>
            {metrics ? formatCurrency(metrics.pipeline_value_cents) : "€ --"}
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
