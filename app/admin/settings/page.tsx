import { redirect } from "next/navigation";

export default function SettingsRedirect() {
  redirect("/admin/systeem?tab=instellingen");
}
