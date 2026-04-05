import { getDashboardData, runBackgroundAgents } from "@/features/dashboard/actions";
import { getOnboardingProgress } from "@/features/onboarding/actions";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const [result, onboardingResult] = await Promise.all([
    getDashboardData(),
    getOnboardingProgress(),
    // Onzichtbare assistent: alle achtergrond-agents in één call
    runBackgroundAgents().catch(() => null),
  ]);

  return (
    <DashboardClient
      initialResult={result}
      initialOnboarding={onboardingResult.data ?? null}
    />
  );
}
