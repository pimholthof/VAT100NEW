import {
  QueryClient,
  dehydrate,
  HydrationBoundary,
} from "@tanstack/react-query";
import { getClients } from "@/features/clients/actions";
import { NewInvoicePageClient } from "./NewInvoicePageClient";

// Klanten worden server-side meegeladen zodat de ontvanger-dropdown nooit
// leeg of op "Laden…" staat.
export default async function NewInvoicePage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: ["clients"],
    queryFn: () => getClients(),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NewInvoicePageClient />
    </HydrationBoundary>
  );
}
