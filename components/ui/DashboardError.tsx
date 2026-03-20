"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-12">
      <div className="py-3 px-4 border-l-2 border-l-foreground font-sans text-[var(--text-body-md)] mb-6">
        {error.message || "Er is een fout opgetreden."}
      </div>
      <button
        onClick={reset}
        className="font-sans text-[var(--text-body-md)] font-medium tracking-[0.05em] py-2.5 px-4 border border-foreground/20 bg-transparent text-foreground cursor-pointer"
      >
        Probeer opnieuw
      </button>
    </div>
  );
}
