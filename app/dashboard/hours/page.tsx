import { redirect } from "next/navigation";

export default function HoursPage() {
  redirect("/dashboard/expenses?tab=uren");
}
