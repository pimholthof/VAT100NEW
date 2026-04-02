"use client";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

export function StepIndicator({ currentStep, totalSteps, labels }: StepIndicatorProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 48 }}>
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;

        return (
          <div key={step} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {i > 0 && (
              <div
                style={{
                  width: 24,
                  height: "0.5px",
                  background: isCompleted ? "var(--foreground)" : "rgba(0,0,0,0.1)",
                  transition: "background 0.3s ease",
                }}
              />
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: isActive || isCompleted ? "var(--foreground)" : "rgba(0,0,0,0.12)",
                  transition: "background 0.3s ease",
                }}
              />
              {labels?.[i] && (
                <span
                  style={{
                    fontSize: "var(--text-label)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    fontWeight: isActive ? 600 : 400,
                    opacity: isActive ? 0.8 : 0.3,
                    transition: "opacity 0.3s ease",
                  }}
                >
                  {labels[i]}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
