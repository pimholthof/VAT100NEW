import { getDashboardData } from "@/features/dashboard/actions";
import { getOnboardingProgress } from "@/features/onboarding/actions";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const [result, onboardingResult] = await Promise.all([
    getDashboardData(),
    getOnboardingProgress(),
  ]);

  return (
    <DashboardClient
      initialResult={result}
      initialOnboarding={onboardingResult.data ?? null}
    />
  );
}
