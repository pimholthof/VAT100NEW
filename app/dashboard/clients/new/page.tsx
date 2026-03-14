"use client";

import { ClientForm } from "@/components/client/ClientForm";
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
