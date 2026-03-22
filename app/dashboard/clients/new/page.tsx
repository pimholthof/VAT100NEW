"use client";

import { ClientForm } from "@/features/clients/components/ClientForm";
import { PageHeader } from "@/components/ui";

export default function NewClientPage() {
  return (
    <div>
      <PageHeader
        title="Nieuwe klant"
        titleSize="md"
        backHref="/dashboard/clients"
        backLabel="Terug naar klanten"
      />
      <ClientForm />
    </div>
  );
}
