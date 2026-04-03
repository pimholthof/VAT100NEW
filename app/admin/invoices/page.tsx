import { redirect } from "next/navigation";

export default function InvoicesRedirect() {
  redirect("/admin/klanten/facturen");
}
