import { redirect } from "next/navigation";

export default function BankRedirect() {
  redirect("/admin/klanten/bank");
}
