"use client";

import { Lead, Plan } from "@/lib/types";
import { useState } from "react";
import { toggleLeadTask, updateLeadStage, updateLeadPlan, autoProvisionAccount } from "./actions";

interface LeadDossierProps {
  lead: Lead;
  activities: any[];
  tasks: any[];
  plans: Plan[];
}

export function LeadDossier({ lead, activities, tasks: initialTasks, plans }: LeadDossierProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [currentStage, setCurrentStage] = useState(lead.lifecycle_stage);
  const [targetPlanId, setTargetPlanId] = useState(lead.target_plan_id);
  const [isProvisioning, setIsProvisioning] = useState(false);

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    const result = await toggleLeadTask(taskId, completed);
    if (!result.error) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null } : t));
    }
  };

  const handleStageChange = async (newStage: any) => {
    const result = await updateLeadStage(lead.id, newStage);
    if (!result.error) {
      setCurrentStage(newStage);
    }
  };

  const handlePlanChange = async (newPlanId: string) => {
    const result = await updateLeadPlan(lead.id, newPlanId);
    if (!result.error) {
      setTargetPlanId(newPlanId);
    }
  };

  const handleAutoProvision = async () => {
    if (!targetPlanId) {
      alert("Selecteer eerst een pakket voor deze lead.");
      return;
    }

    if (!confirm(`Weet je zeker dat je deze lead wilt omzetten naar een KLANT op het ${plans.find(p => p.id === targetPlanId)?.name} pakket?`)) {
      return;
    }

    setIsProvisioning(true);
    const result = await autoProvisionAccount(lead.id);
    if (result.error) {
      alert(result.error);
      setIsProvisioning(false);
    } else {
      window.location.reload(); // Refresh to show customer status
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "350px 1fr 350px", gap: "1px", backgroundColor: "var(--color-black)", borderBottom: "1px solid var(--color-black)" }}>
      
      {/* COLUMN 1: PROFILE & SCORES */}
      <div style={{ backgroundColor: "white", padding: "40px 24px" }}>
        <div className="label" style={{ opacity: 0.4, marginBottom: "8px" }}>PROSPECT PROFIEL</div>
        <h2 className="display-hero" style={{ fontSize: "2.5rem", marginBottom: "32px", lineHeight: 1 }}>
          {lead.first_name} {lead.last_name}
        </h2>

        <div style={{ marginBottom: "48px" }}>
          <div className="label" style={{ opacity: 0.4, marginBottom: "16px" }}>INTELLIGENCE</div>
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1, border: "1px solid var(--color-black)", padding: "16px" }}>
              <div className="label" style={{ fontSize: "9px" }}>FIT SCORE</div>
              <div style={{ fontSize: "2rem", fontWeight: 700 }}>{Math.round(lead.score_fit * 100)}%</div>
            </div>
            <div style={{ flex: 1, border: "1px solid var(--color-black)", padding: "16px" }}>
              <div className="label" style={{ fontSize: "9px" }}>ENGAGEMENT</div>
              <div style={{ fontSize: "2rem", fontWeight: 700 }}>{Math.round(lead.score_engagement * 100)}%</div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "48px" }}>
          <div className="label" style={{ opacity: 0.4, marginBottom: "16px" }}>CONTACT INFO</div>
          <div style={{ fontSize: "14px", marginBottom: "8px" }}>{lead.email}</div>
          {lead.company_name && <div style={{ fontSize: "14px", fontWeight: 700 }}>{lead.company_name}</div>}
        </div>

        <div style={{ marginBottom: "32px" }}>
          <div className="label" style={{ opacity: 0.4, marginBottom: "16px" }}>LIFECYCLE STAGE</div>
          <select 
            value={currentStage}
            onChange={(e) => handleStageChange(e.target.value)}
            style={{ 
              width: "100%", 
              padding: "12px", 
              border: "1px solid var(--color-black)",
              fontFamily: "var(--font-geist)",
              fontWeight: 700,
              fontSize: "12px",
              appearance: "none",
              borderRadius: 0
            }}
          >
            {["Nieuw", "Link Verstuurd", "Plan Gekozen", "Klant", "On hold"].map(s => (
              <option key={s} value={s}>{s.toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: "48px" }}>
          <div className="label" style={{ opacity: 0.4, marginBottom: "16px" }}>PAKKET KEUZE (FIXED PRICE)</div>
          <select 
            value={targetPlanId || ""}
            onChange={(e) => handlePlanChange(e.target.value)}
            style={{ 
              width: "100%", 
              padding: "12px", 
              border: "1px solid var(--color-black)",
              fontFamily: "var(--font-geist)",
              fontWeight: 700,
              fontSize: "12px",
              appearance: "none",
              borderRadius: 0,
              marginBottom: "16px"
            }}
          >
            <option value="">GEEN PAKKET GESELECTEERD</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.name.toUpperCase()} (&euro;{p.price_cents / 100})</option>
            ))}
          </select>

          {currentStage !== "Klant" && (
            <button 
              onClick={handleAutoProvision}
              disabled={isProvisioning || !targetPlanId}
              className="btn-primary"
              style={{ width: "100%", padding: "16px" }}
            >
              {isProvisioning ? "ACCOUNT ACTIVEREN..." : "ACTIVEER ALS KLANT"}
            </button>
          )}

          {currentStage === "Klant" && (
            <div style={{ padding: "16px", border: "1px solid var(--color-black)", textAlign: "center", backgroundColor: "rgba(0,0,0,0.03)" }}>
               <div className="label" style={{ fontSize: "10px", color: "green", fontWeight: 800 }}>GEACTIVEERD</div>
            </div>
          )}
        </div>
      </div>

      {/* COLUMN 2: NAHV SOP CHECKLIST */}
      <div style={{ backgroundColor: "white", padding: "40px 48px", borderLeft: "1px solid var(--color-black)", borderRight: "1px solid var(--color-black)" }}>
        <div className="label" style={{ opacity: 0.4, marginBottom: "32px" }}>VAT100 AUTO-PILOT WORKFLOW</div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", backgroundColor: "rgba(0,0,0,0.05)" }}>
          {tasks.length > 0 ? tasks.map((task, idx) => (
            <div 
              key={task.id} 
              style={{ 
                backgroundColor: "white", 
                padding: "16px", 
                display: "flex", 
                alignItems: "center", 
                gap: "16px",
                opacity: task.completed ? 0.3 : 1
              }}
            >
              <div style={{ fontSize: "10px", fontWeight: 700, opacity: 0.2, width: "24px" }}>
                {(idx + 1).toString().padStart(2, '0')}
              </div>
              <input 
                type="checkbox" 
                checked={task.completed}
                onChange={(e) => handleToggleTask(task.id, e.target.checked)}
                style={{ width: "20px", height: "20px", accentColor: "var(--color-black)" }}
              />
              <div style={{ flex: 1, fontSize: "14px", fontWeight: 500, textDecoration: task.completed ? "line-through" : "none" }}>
                {task.title}
              </div>
              {task.completed_at && (
                <div style={{ fontSize: "10px", opacity: 0.4 }}>
                  {new Date(task.completed_at).toLocaleDateString()}
                </div>
              )}
            </div>
          )) : (
            <div style={{ padding: "40px", textAlign: "center", border: "1px dashed rgba(0,0,0,0.1)" }}>
              Geen taken gegenereerd voor deze lead.
            </div>
          )}
        </div>
      </div>

      {/* COLUMN 3: ACTIVITY TIMELINE */}
      <div style={{ backgroundColor: "white", padding: "40px 24px" }}>
        <div className="label" style={{ opacity: 0.4, marginBottom: "32px" }}>DOSSIER HISTORIE</div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {activities.map(activity => (
            <div key={activity.id} style={{ borderLeft: "2px solid var(--color-black)", paddingLeft: "16px" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.05em", opacity: 0.3 }}>
                {new Date(activity.created_at).toLocaleString()}
              </div>
              <div style={{ fontSize: "12px", fontWeight: 700, margin: "4px 0" }}>
                {activity.activity_type.toUpperCase()}
              </div>
              <div style={{ fontSize: "12px", opacity: 0.6 }}>
                {activity.description}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
