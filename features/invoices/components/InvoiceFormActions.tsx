"use client";

import { useLocale } from "@/lib/i18n/context";
import { playSound } from "@/lib/utils/sound";
import { useInvoiceStore } from "@/lib/store/invoice";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui";
import { formatTime } from "@/lib/format";

export function InvoiceFormActions({
  saving,
  onSaveDraft,
  onIssueAndPreview,
  recipientName,
}: {
  saving: boolean;
  onSaveDraft: () => void;
  onIssueAndPreview: () => void;
  recipientName?: string | null;
}) {
  const { t } = useLocale();
  const isDirty = useInvoiceStore((s) => s.isDirty);
  const lastSavedAt = useInvoiceStore((s) => s.lastSavedAt);

  const savedLabel = lastSavedAt ? `Opgeslagen ${formatTime(lastSavedAt)}` : null;

  return (
    <div>
      {/* Auto-save indicator */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 12,
          fontSize: "var(--text-body-xs)",
          opacity: 0.3,
          letterSpacing: "0.02em",
        }}
      >
        {saving ? (
          <span>Opslaan...</span>
        ) : isDirty ? (
          <span>Niet-opgeslagen wijzigingen</span>
        ) : savedLabel ? (
          <span>{savedLabel}</span>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: 24 }}>
        <ButtonSecondary
          className="btn-block"
          style={{ flex: 1 }}
          loading={saving}
          onClick={() => {
            onSaveDraft();
            playSound("glass-ping");
          }}
        >
          {saving ? t.common.saving : t.invoices.saveDraft}
        </ButtonSecondary>
        <ButtonPrimary
          className="btn-block"
          style={{ flex: 2 }}
          loading={saving}
          onClick={() => {
            onIssueAndPreview();
            playSound("glass-ping");
          }}
        >
          {saving
            ? t.common.saving
            : recipientName
              ? `Versturen aan ${recipientName}`
              : t.invoices.issueAndPreview}
        </ButtonPrimary>
      </div>
    </div>
  );
}
