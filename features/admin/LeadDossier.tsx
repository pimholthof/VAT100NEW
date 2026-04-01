"use client";

import { Lead, LeadLifecycle, Plan } from "@/lib/types";
import { useState } from "react";
import { toggleLeadTask, updateLeadStage, updateLeadPlan, autoProvisionAccount } from "./actions";
import { Select } from "@/components/ui/Input";
import { ButtonPrimary } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface LeadTask {
  id: string;
  title: string;
  completed: boolean;
  completed_at: string | null;
  [key: string]: unknown;
}

interface LeadActivity {
  id: string;
  created_at: string;
  activity_type: string;
  description: string;
  [key: string]: unknown;
}

interface LeadDossierProps {
  lead: Lead;
  activities: LeadActivity[];
  tasks: LeadTask[];
  plans: Plan[];
}

export function LeadDossier({ lead, activities, tasks: initialTasks, plans }: LeadDossierProps) {
  const [tasks, setTasks] = useState(initialTasks as LeadTask[]);
  const [currentStage, setCurrentStage] = useState(lead.lifecycle_stage);
  const [targetPlanId, setTargetPlanId] = useState(lead.target_plan_id);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [showProvisionConfirm, setShowProvisionConfirm] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    const result = await toggleLeadTask(taskId, completed);
    if (!result.error) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null } : t));
    }
  };

  const handleStageChange = async (newStage: string) => {
    const result = await updateLeadStage(lead.id, newStage as LeadLifecycle);
    if (!result.error) {
      setCurrentStage(newStage as LeadLifecycle);
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
      setProvisionError("Selecteer eerst een pakket voor deze lead.");
      return;
    }
    setShowProvisionConfirm(true);
  };

  const confirmProvision = async () => {
    setShowProvisionConfirm(false);
    setIsProvisioning(true);
    const result = await autoProvisionAccount(lead.id);
    if (result.error) {
      setProvisionError(result.error);
      setIsProvisioning(false);
    } else {
      window.location.reload();
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr", gap: 16 }}>
      <ConfirmDialog
        open={showProvisionConfirm}
        title="Lead activeren als klant"
        message={`Weet je zeker dat je deze lead wilt omzetten naar een klant op het ${plans.find(p => p.id === targetPlanId)?.name} pakket?`}
        confirmLabel="Activeren"
        cancelLabel="Annuleren"
        onConfirm={confirmProvision}
        onCancel={() => setShowProvisionConfirm(false)}
      />

      {/* Kolom 1: Profiel & Scores */}
      <div className="brutalist-panel brutalist-panel-padded">
        <span className="label" style={{ display: "block", marginBottom: 8 }}>Prospect profiel</span>
        <h2 style={{ fontSize: "var(--text-display-sm)", fontWeight: 700, marginBottom: 32, lineHeight: 1, letterSpacing: "-0.02em" }}>
          {lead.first_name} {lead.last_name}
        </h2>

        {/* Scores */}
        <div style={{ marginBottom: 32 }}>
          <span className="label" style={{ display: "block", marginBottom: 12 }}>Scores</span>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, border: "0.5px solid rgba(0,0,0,0.08)", borderRadius: "var(--radius)", padding: 16 }}>
              <span className="label" style={{ fontSize: 9 }}>Fit score</span>
              <div className="mono-amount-lg" style={{ fontSize: "1.5rem", fontWeight: 400, marginTop: 4 }}>
                {Math.round(lead.score_fit * 100)}%
              </div>
            </div>
            <div style={{ flex: 1, border: "0.5px solid rgba(0,0,0,0.08)", borderRadius: "var(--radius)", padding: 16 }}>
              <span className="label" style={{ fontSize: 9 }}>Betrokkenheid</span>
              <div className="mono-amount-lg" style={{ fontSize: "1.5rem", fontWeight: 400, marginTop: 4 }}>
                {Math.round(lead.score_engagement * 100)}%
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div style={{ marginBottom: 32 }}>
          <span className="label" style={{ display: "block", marginBottom: 12 }}>Contactgegevens</span>
          <div style={{ fontSize: "var(--text-body-md)", marginBottom: 4 }}>{lead.email}</div>
          {lead.company_name && <div style={{ fontSize: "var(--text-body-md)", fontWeight: 600 }}>{lead.company_name}</div>}
        </div>

        {/* Fase */}
        <div style={{ marginBottom: 24 }}>
          <span className="label" style={{ display: "block", marginBottom: 8 }}>Levenscyclusfase</span>
          <Select
            value={currentStage}
            onChange={(e) => handleStageChange(e.target.value)}
          >
            {["Nieuw", "Link Verstuurd", "Plan Gekozen", "Klant", "On hold"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>

        {/* Pakket */}
        <div style={{ marginBottom: 24 }}>
          <span className="label" style={{ display: "block", marginBottom: 8 }}>Pakketkeuze</span>
          <Select
            value={targetPlanId || ""}
            onChange={(e) => handlePlanChange(e.target.value)}
            style={{ marginBottom: 16 }}
          >
            <option value="">Geen pakket geselecteerd</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({"\u20AC"}{p.price_cents / 100})</option>
            ))}
          </Select>

          {provisionError && (
            <div style={{ color: "var(--color-accent)", fontSize: "var(--text-body-sm)", marginBottom: 12 }}>
              {provisionError}
            </div>
          )}

          {currentStage !== "Klant" ? (
            <ButtonPrimary
              onClick={handleAutoProvision}
              disabled={isProvisioning || !targetPlanId}
              style={{ width: "100%" }}
            >
              {isProvisioning ? "Account activeren..." : "Activeer als klant"}
            </ButtonPrimary>
          ) : (
            <div style={{
              padding: 16,
              border: "0.5px solid rgba(0,0,0,0.08)",
              borderRadius: "var(--radius)",
              textAlign: "center",
              background: "rgba(0,0,0,0.02)",
            }}>
              <span className="label" style={{ color: "var(--color-success)" }}>Geactiveerd</span>
            </div>
          )}
        </div>
      </div>

      {/* Kolom 2: Workflow checklist */}
      <div className="brutalist-panel brutalist-panel-padded">
        <span className="label" style={{ display: "block", marginBottom: 24 }}>Workflow checklist</span>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {tasks.length > 0 ? tasks.map((task, idx) => (
            <div
              key={task.id}
              style={{
                padding: 16,
                display: "flex",
                alignItems: "center",
                gap: 16,
                opacity: task.completed ? 0.35 : 1,
                borderBottom: "0.5px solid rgba(0,0,0,0.06)",
                transition: "opacity 0.2s ease",
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.2, width: 24, fontVariantNumeric: "tabular-nums" }}>
                {(idx + 1).toString().padStart(2, "0")}
              </span>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={(e) => handleToggleTask(task.id, e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "var(--color-black)", cursor: "pointer" }}
              />
              <span style={{
                flex: 1,
                fontSize: "var(--text-body-md)",
                fontWeight: 500,
                textDecoration: task.completed ? "line-through" : "none",
              }}>
                {task.title}
              </span>
              {task.completed_at && (
                <span className="label" style={{ fontSize: 9 }}>
                  {new Date(task.completed_at).toLocaleDateString("nl-NL")}
                </span>
              )}
            </div>
          )) : (
            <p className="empty-state" style={{ padding: 40 }}>
              Geen taken voor deze lead
            </p>
          )}
        </div>
      </div>

      {/* Kolom 3: Activiteitenlog */}
      <div className="brutalist-panel brutalist-panel-padded">
        <span className="label" style={{ display: "block", marginBottom: 24 }}>Dossierhistorie</span>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {activities.length > 0 ? activities.map(activity => (
            <div
              key={activity.id}
              style={{
                borderLeft: "2px solid rgba(0,0,0,0.08)",
                paddingLeft: 16,
              }}
            >
              <span className="label" style={{ display: "block", marginBottom: 2, fontSize: 9 }}>
                {new Date(activity.created_at).toLocaleString("nl-NL")}
              </span>
              <span style={{ fontSize: "var(--text-body-sm)", fontWeight: 600, display: "block", marginBottom: 2 }}>
                {activity.activity_type}
              </span>
              <span style={{ fontSize: "var(--text-body-sm)", opacity: 0.5 }}>
                {activity.description}
              </span>
            </div>
          )) : (
            <p className="label">Nog geen activiteiten</p>
          )}
        </div>
      </div>
    </div>
  );
}
