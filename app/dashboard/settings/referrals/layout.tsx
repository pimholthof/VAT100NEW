import { redirect } from "next/navigation";
import { isGrowthEnabled } from "@/lib/config/features";

/**
 * Het referral-programma is een groei-extra, geen fiscale kernfunctie.
 * Standaard verborgen achter NEXT_PUBLIC_GROWTH_ENABLED; de code blijft
 * intact zodat het zonder wijzigingen weer aangezet kan worden.
 */
export default function ReferralsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isGrowthEnabled()) redirect("/dashboard/settings");
  return <>{children}</>;
}
