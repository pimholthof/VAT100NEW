import {
  QueryClient,
  dehydrate,
  HydrationBoundary,
} from "@tanstack/react-query";
import { getClients } from "@/features/clients/actions";
import { getInvoice } from "@/features/invoices/actions";
import { EditInvoicePageClient } from "./EditInvoicePageClient";

// Factuur + klanten worden server-side meegeladen zodat het formulier en de
// ontvanger-dropdown direct gevuld zijn.
export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const queryClient = new QueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["clients"],
      queryFn: () => getClients(),
    }),
    queryClient.prefetchQuery({
      queryKey: ["invoice", id],
      queryFn: () => getInvoice(id),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <EditInvoicePageClient id={id} />
    </HydrationBoundary>
  );
}
