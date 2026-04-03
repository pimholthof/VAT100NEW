import { redirect } from "next/navigation";

export default function FeedbackRedirect() {
  redirect("/admin/klanten/feedback");
}
