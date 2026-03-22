"use client";

import { ReceiptForm } from "@/features/receipts/components/ReceiptForm";
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
