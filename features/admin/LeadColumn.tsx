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
            height: "80px",
            border: "0.5px dashed rgba(0,0,0,0.08)",
            borderRadius: "var(--radius)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <span className="label">Leeg</span>
          </div>
        )}
      </div>
    </div>
  );
}
