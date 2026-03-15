import { getDashboardData } from "@/lib/actions/dashboard";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const result = await getDashboardData();
  
  return <DashboardClient initialResult={result} />;
}
