"use client";

import { ReceiptForm } from "@/components/receipt/ReceiptForm";
import { PageHeader } from "@/components/ui";

export default function NewReceiptPage() {
  return (
    <div>
      <PageHeader
        title="Nieuwe bon"
        titleSize="md"
        backHref="/dashboard/receipts"
        backLabel="Terug naar bonnen"
      />
      <ReceiptForm />
    </div>
  );
}
