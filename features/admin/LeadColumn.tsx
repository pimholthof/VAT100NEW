"use client";

import { Lead } from "@/lib/types";
import { LeadCard } from "./LeadCard";

interface LeadColumnProps {
  title: string;
  leads: Lead[];
  onLeadClick?: (id: string) => void;
}

export function LeadColumn({ title, leads, onLeadClick }: LeadColumnProps) {
  const count = leads.length;

  return (
    <div className="pipeline-column">
      <div className="pipeline-column-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h3 className="pipeline-column-title">
            {title}
          </h3>
          <span style={{ fontSize: "12px", opacity: 0.3, fontWeight: 700 }}>
            {count}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {leads.length > 0 ? (
          leads.map((lead) => (
            <LeadCard 
              key={lead.id} 
              lead={lead} 
              onClick={onLeadClick} 
            />
          ))
        ) : (
          <div style={{ 
            height: "100px", 
            border: "1px dashed rgba(0,0,0,0.05)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            fontSize: "10px",
            opacity: 0.4,
            textTransform: "uppercase",
            letterSpacing: "0.1em"
          }}>
            Leeg
          </div>
        )}
      </div>
    </div>
  );
}
