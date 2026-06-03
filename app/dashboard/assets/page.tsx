import { redirect } from "next/navigation";

export default function AssetsPage() {
  redirect("/dashboard/expenses?tab=activa");
}
