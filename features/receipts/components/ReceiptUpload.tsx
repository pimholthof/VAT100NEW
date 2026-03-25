"use client";

import { useState, useRef } from "react";
import { ErrorMessage } from "@/components/ui";

import Image from "next/image";

const uploadTextStyle: React.CSSProperties = {
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "var(--text-body-md)",
  fontWeight: 300,
  margin: 0,
  color: "var(--foreground)",
  opacity: 0.3,
};

interface ReceiptUploadProps {
  onFileSelected: (file: File) => void;
  onSkip: () => void;
  uploading: boolean;
  uploadError: string | null;
}

export function ReceiptUpload({
  onFileSelected,
  onSkip,
  uploading,
  uploadError,
}: ReceiptUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setValidationError(null);

    // Valideer magic bytes om te controleren of het echt een afbeelding is
    const header = await file.slice(0, 4).arrayBuffer();
    const bytes = new Uint8Array(header);
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const isWebp = bytes[0] === 0x52 && bytes[1] === 0x49; // RIFF
    const isHeic = bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x00;

    if (!isJpeg && !isPng && !isWebp && !isHeic) {
      setValidationError("Ongeldig bestandstype. Upload een JPEG, PNG of WebP afbeelding.");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setFilePreview(e.target?.result as string);
    reader.readAsDataURL(file);
    onFileSelected(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  return (
    <div style={{ maxWidth: 600 }}>
      {(uploadError || validationError) && (
        <ErrorMessage style={{ marginBottom: 24 }}>{uploadError || validationError}</ErrorMessage>
      )}

      <div
        role="button"
        tabIndex={0}
        aria-label="Klik of sleep een afbeelding om te uploaden"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        style={{
          border: dragOver
            ? "0.5px dashed rgba(13,13,11,0.4)"
            : "0.5px dashed rgba(13,13,11,0.2)",
          padding: 40,
          textAlign: "center" as const,
          cursor: "pointer",
          minHeight: 120,
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />

        {uploading ? (
          <p style={uploadTextStyle}>Uploaden...</p>
        ) : selectedFile && filePreview ? (
          <>
            <div style={{ position: "relative", width: 200, height: 150 }}>
              <Image
                src={filePreview}
                alt="Preview"
                fill
                style={{
                  objectFit: "contain",
                }}
                unoptimized
              />
            </div>
            <p
              style={{
                ...uploadTextStyle,
                fontSize: "var(--text-label)",
              }}
            >
              {selectedFile.name}
            </p>
          </>
        ) : (
          <p style={uploadTextStyle}>
            Sleep een foto van je bon hierheen of klik om te uploaden
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onSkip}
        style={{
          display: "block",
          marginTop: 16,
          background: "none",
          border: "none",
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-label)",
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
          color: "var(--foreground)",
          opacity: 0.3,
          cursor: "pointer",
          padding: 0,
        }}
      >
        Handmatig invoeren
      </button>
    </div>
  );
}
