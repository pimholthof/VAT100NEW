import { redirect } from "next/navigation";

export default function QuotesPage() {
  redirect("/dashboard/invoices?tab=offertes");
}
