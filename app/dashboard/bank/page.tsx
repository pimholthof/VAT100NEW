import { redirect } from "next/navigation";

export default function BankPage() {
  redirect("/dashboard/expenses?tab=bank");
}
