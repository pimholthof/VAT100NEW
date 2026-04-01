"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { completeOnboardingTask } from "@/features/onboarding/actions";
import type { OnboardingTask } from "@/lib/types";

const TASK_LINKS: Record<string, string> = {
  profile: "/dashboard/settings",
  logo: "/dashboard/settings",
  first_client: "/dashboard/clients",
  bank: "/dashboard/settings",
  first_invoice: "/dashboard/invoices/new",
  vat_settings: "/dashboard/tax",
  first_receipt: "/dashboard/receipts/new",
};

function TaskCard({ task, onComplete }: { task: OnboardingTask; onComplete: (id: string) => void }) {
  const [isPending, startTransition] = useTransition();
  const href = TASK_LINKS[task.task_key] ?? "/dashboard";

  const handleCheck = () => {
    if (task.completed) return;
    startTransition(async () => {
      await completeOnboardingTask(task.id);
      onComplete(task.id);
    });
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        padding: 20,
        border: "0.5px solid rgba(0,0,0,0.08)",
        borderRadius: "var(--radius)",
        opacity: task.completed ? 0.4 : 1,
        transition: "opacity 0.3s ease",
      }}
    >
      <input
        type="checkbox"
        checked={task.completed}
        onChange={handleCheck}
        disabled={isPending || task.completed}
        style={{ width: 18, height: 18, marginTop: 2, accentColor: "var(--color-black)", cursor: task.completed ? "default" : "pointer" }}
      />
      <div style={{ flex: 1 }}>
        <Link
          href={href}
          style={{
            fontSize: "var(--text-body-lg)",
            fontWeight: 500,
            textDecoration: task.completed ? "line-through" : "none",
            color: "var(--foreground)",
            display: "block",
            marginBottom: 4,
          }}
        >
          {task.title}
        </Link>
        {task.description && (
          <span style={{ fontSize: "var(--text-body-sm)", opacity: 0.5 }}>
            {task.description}
          </span>
        )}
      </div>
      {task.completed && (
        <span className="label" style={{ color: "var(--color-success)", whiteSpace: "nowrap" }}>
          Voltooid
        </span>
      )}
    </div>
  );
}

export function OnboardingChecklist({ tasks: initialTasks }: { tasks: OnboardingTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);

  const handleComplete = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: true, completed_at: new Date().toISOString() } : t))
    );
  };

  const allDone = tasks.every((t) => t.completed);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} onComplete={handleComplete} />
      ))}

      {allDone && (
        <div
          style={{
            marginTop: 32,
            padding: 24,
            border: "0.5px solid rgba(26,122,58,0.2)",
            borderRadius: "var(--radius)",
            background: "rgba(26,122,58,0.03)",
            textAlign: "center",
          }}
        >
          <p style={{ fontWeight: 600, fontSize: "var(--text-body-lg)", marginBottom: 8 }}>
            Je bent helemaal klaar!
          </p>
          <Link
            href="/dashboard"
            className="btn-primary"
            style={{ display: "inline-flex", marginTop: 8 }}
          >
            Naar het dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
