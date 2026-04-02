import { redirect } from "next/navigation";

export default function CustomerDetailRedirect(_props: { params: Promise<{ id: string }> }) {
  // Redirect to the unified users page
  redirect("/admin/users");
}
