"use client";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
  /** Maakt voltooide stappen tikbaar om terug te navigeren. */
  onStepSelect?: (step: number) => void;
}

export function StepIndicator({
  currentStep,
  totalSteps,
  labels,
  onStepSelect,
}: StepIndicatorProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 48,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const isActive = step === currentStep;
          const isCompleted = step < currentStep;
          const isClickable = isCompleted && !!onStepSelect;

          const stepContent = (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background:
                    isActive || isCompleted
                      ? "var(--foreground)"
                      : "rgba(0,0,0,0.2)",
                  transition:
                    "background var(--duration-moderate) var(--ease-out-expo)",
                }}
              />
              {labels?.[i] && (
                <span
                  style={{
                    fontSize: "var(--text-label)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    fontWeight: isActive ? 600 : 400,
                    opacity: isActive ? 0.8 : 0.45,
                    transition:
                      "opacity var(--duration-moderate) var(--ease-out-expo)",
                  }}
                >
                  {labels[i]}
                </span>
              )}
            </span>
          );

          return (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {i > 0 && (
                <div
                  style={{
                    width: 24,
                    height: "0.5px",
                    background: isCompleted
                      ? "var(--foreground)"
                      : "rgba(0,0,0,0.1)",
                    transition:
                      "background var(--duration-moderate) var(--ease-out-expo)",
                  }}
                />
              )}
              {isClickable ? (
                <button
                  type="button"
                  onClick={() => onStepSelect(step)}
                  aria-label={`Terug naar stap ${step}${labels?.[i] ? `: ${labels[i]}` : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  {stepContent}
                </button>
              ) : (
                stepContent
              )}
            </div>
          );
        })}
      </div>
      <span
        aria-hidden="true"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-mono-sm)",
          fontVariantNumeric: "tabular-nums",
          opacity: 0.55,
          whiteSpace: "nowrap",
        }}
      >
        {currentStep} / {totalSteps}
      </span>
      <span className="sr-only" role="status">
        {`Stap ${currentStep} van ${totalSteps}${labels?.[currentStep - 1] ? `: ${labels[currentStep - 1]}` : ""}`}
      </span>
    </div>
  );
}
