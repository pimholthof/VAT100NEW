"use client";

import Image from "next/image";

interface ReceiptProcessingProps {
  imageUrl: string | null;
  filePreview: string | null;
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
}: ReceiptProcessingProps) {
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
        {(imageUrl || filePreview) && (
          <div style={{ position: "relative", width: "100%", height: 400 }}>
            <Image
              src={imageUrl || filePreview || ""}
              alt="Bon preview"
              fill
              style={{
                objectFit: "contain",
                border: "0.5px solid rgba(13,13,11,0.15)",
              }}
              unoptimized
            />
          </div>
        )}
      </div>

      <div>
        <p
          style={{
            fontSize: "var(--text-body-md)",
            fontWeight: 300,
            margin: "0 0 24px",
          }}
        >
          Bon wordt herkend...
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
