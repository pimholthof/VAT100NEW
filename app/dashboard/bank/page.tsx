import { redirect } from "next/navigation";

export default async function BankPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;
  if (reference) {
    redirect(`/dashboard/expenses?tab=bank&requisition_id=${reference}`);
  }
  redirect("/dashboard/expenses?tab=bank");
}
