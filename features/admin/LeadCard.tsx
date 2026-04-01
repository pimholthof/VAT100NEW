"use client";

import { Lead } from "@/lib/types";

interface LeadCardProps {
  lead: Lead;
  onClick?: (id: string) => void;
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  // Determine if high score
  const isHighFit = lead.score_fit >= 0.7;
  
  return (
    <div 
      className="lead-card"
      onClick={() => onClick?.(lead.id)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div 
          className={`score-badge ${isHighFit ? "high" : ""}`}
          title="AI Score: Fit for VAT100"
        >
          FIT: {Math.round(lead.score_fit * 100)}%
        </div>
        <div style={{ fontSize: "10px", opacity: 0.3, letterSpacing: "0.05em" }}>
          {lead.source.toUpperCase()}
        </div>
      </div>

      <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, letterSpacing: "-0.01em" }}>
        {lead.first_name || "Naamloze Lead"} {lead.last_name || ""}
      </h4>
      <div className="lead-email">
        {lead.email}
      </div>

      {lead.company_name && (
        <div style={{ 
          marginTop: "12px", 
          fontSize: "11px", 
          fontStyle: "italic", 
          color: "rgba(0,0,0,0.6)",
          borderTop: "0.5px solid rgba(0,0,0,0.05)",
          paddingTop: "8px"
        }}>
          {lead.company_name}
        </div>
      )}
    </div>
  );
}
