import { getDashboardData } from "@/features/dashboard/actions";
import { getOnboardingProgress } from "@/features/onboarding/actions";
import { autoPreparePreviousQuarterVatReturn } from "@/features/tax/vat-returns-actions";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const [result, onboardingResult] = await Promise.all([
    getDashboardData(),
    getOnboardingProgress(),
    // Onzichtbare assistent: bereid BTW-aangifte voor op de achtergrond
    autoPreparePreviousQuarterVatReturn().catch(() => null),
  ]);

  return (
    <DashboardClient
      initialResult={result}
      initialOnboarding={onboardingResult.data ?? null}
    />
  );
}
