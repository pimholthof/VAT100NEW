import { notFound } from "next/navigation";
import { fetchInvoiceByToken } from "@/lib/invoice/fetch-public";
import { InvoiceHTML } from "@/components/invoice/InvoiceHTML";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const result = await fetchInvoiceByToken(token);
  if (result.error || !result.data) {
    notFound();
  }

  const pdfUrl = `/api/invoice/public/${token}/pdf`;

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center px-4 py-6">
      <div className="w-[595px] max-w-full flex justify-end mb-4">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-sans text-[13px] font-medium tracking-[0.05em] px-5 py-2.5 border border-[#0D0D0B] bg-[#0D0D0B] text-white cursor-pointer no-underline"
        >
          Download PDF
        </a>
      </div>
      <InvoiceHTML data={result.data} />
    </div>
  );
}
