import { redirect } from "next/navigation";

export default function WaitlistRedirect() {
  redirect("/admin/pipeline?tab=wachtlijst");
}
