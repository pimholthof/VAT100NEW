import { redirect } from "next/navigation";

export default function UserDetailRedirect(_props: { params: Promise<{ id: string }> }) {
  redirect("/admin/klanten");
}
