"use client";

import Link from "next/link";
import { BulkInvoiceUpload } from "@/features/invoices/components/BulkInvoiceUpload";
import { useLocale } from "@/lib/i18n/context";

export default function InvoiceImportPage() {
  const { t } = useLocale();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="display-title" style={{ marginBottom: 8 }}>
            {t.invoices.importTitle}
          </h1>
          <p className="label" style={{ opacity: 0.25 }}>
            {t.invoices.importSubtitle}
          </p>
        </div>
        <Link href="/dashboard/invoices" className="btn-secondary">
          {t.common.back}
        </Link>
      </div>

      <BulkInvoiceUpload />
    </div>
  );
}
