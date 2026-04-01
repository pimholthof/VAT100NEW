"use client";

import Image from "next/image";
import { useLocale } from "@/lib/i18n/context";

interface ReceiptProcessingProps {
  imageUrl: string | null;
  filePreview: string | null;
  isPdf?: boolean;
}

function SkeletonField() {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        className="skeleton"
        style={{ width: "30%", height: 9, marginBottom: 8 }}
      />
      <div className="skeleton" style={{ width: "100%", height: 32 }} />
    </div>
  );
}

export function ReceiptProcessing({
  imageUrl,
  filePreview,
  isPdf,
}: ReceiptProcessingProps) {
  const { t } = useLocale();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "250px 1fr",
        gap: 32,
        maxWidth: 800,
      }}
    >
      <div>
        {isPdf ? (
          <div
            style={{
              width: "100%",
              height: 400,
              border: "0.5px solid rgba(13,13,11,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "var(--text-label)",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              opacity: 0.3,
            }}
          >
            {t.receipts.pdfProcessing}
          </div>
        ) : (imageUrl || filePreview) ? (
          <div style={{ position: "relative", width: "100%", height: 400 }}>
            <Image
              src={imageUrl || filePreview || ""}
              alt={t.receipts.receiptPreview}
              fill
              style={{
                objectFit: "contain",
                border: "0.5px solid rgba(13,13,11,0.15)",
              }}
              unoptimized
            />
          </div>
        ) : null}
      </div>

      <div>
        <p
          style={{
            fontSize: "var(--text-body-md)",
            fontWeight: 300,
            margin: "0 0 24px",
          }}
        >
          {t.receipts.receiptRecognizing}
        </p>
        <SkeletonField />
        <SkeletonField />
        <SkeletonField />
        <SkeletonField />
        <SkeletonField />
      </div>
    </div>
  );
}
