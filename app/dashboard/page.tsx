import { getDashboardData } from "@/features/dashboard/actions";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const result = await getDashboardData();
  
  return <DashboardClient initialResult={result} />;
}
