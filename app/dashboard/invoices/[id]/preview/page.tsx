import Link from "next/link";
import { fetchInvoiceData } from "@/lib/invoice/fetch";
import { InvoiceHTML } from "@/components/invoice/InvoiceHTML";
import { SendEmailButton } from "@/components/invoice/SendEmailButton";

export default async function InvoicePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchInvoiceData(id);

  if (result.error || !result.data) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center px-5 py-10">
        <div className="py-3 px-4 border-l-2 border-[var(--foreground)] font-sans text-[var(--text-body-md)] font-normal mb-6">
          {result.error ?? "Factuur niet gevonden"}
        </div>
        <Link
          href="/dashboard/invoices"
          className="text-[var(--text-body-md)] font-sans font-normal text-[var(--foreground)]"
        >
          &larr; Terug naar facturen
        </Link>
      </div>
    );
  }

  const data = result.data;

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center px-5 py-10">
      {/* Toolbar */}
      <div className="w-[595px] flex justify-between items-center mb-6">
        <div className="flex gap-3 items-center">
          <Link
            href="/dashboard/invoices"
            className="text-[var(--text-body-md)] font-sans font-normal text-[var(--foreground)] no-underline tracking-[0.05em]"
          >
            &larr; Overzicht
          </Link>
          <Link
            href={`/dashboard/invoices/${id}`}
            className="text-[var(--text-body-md)] font-sans font-normal text-[var(--foreground)] no-underline tracking-[0.05em]"
          >
            Bewerken
          </Link>
        </div>
        <div className="flex gap-3 items-center">
          {data.invoice.status !== "draft" && data.client.email && (
            <SendEmailButton
              invoiceId={id}
              clientEmail={data.client.email}
            />
          )}
          <a
            href={`/api/invoice/${id}/pdf`}
            className="text-[var(--text-body-md)] font-sans font-medium text-[var(--foreground)] no-underline tracking-[0.05em] py-2 px-5 border border-foreground/20"
          >
            Download PDF
          </a>
        </div>
      </div>

      {/* Invoice Preview */}
      <div className="[border:var(--border-rule)]">
        <InvoiceHTML data={data} />
      </div>
    </div>
  );
}
