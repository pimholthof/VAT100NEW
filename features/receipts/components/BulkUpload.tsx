"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  createReceipt,
  uploadReceiptImage,
  scanReceiptWithAI,
  updateReceipt,
  markReceiptAiProcessed,
} from "@/features/receipts/actions";
import {
  ButtonPrimary,
  ButtonSecondary,
  ErrorMessage,
} from "@/components/ui";
import { KOSTENSOORTEN } from "@/lib/constants/costs";
import type { ReceiptInput, VatRate } from "@/lib/types";
import { BulkReceiptCard, type BulkReceiptResult } from "./BulkReceiptCard";
import { calculateVat } from "@/lib/format";

type Phase = "select" | "processing" | "review";

const MAX_FILES = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function validateFile(file: File): string | null {
  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";
  if (!isImage && !isPdf) {
    return `${file.name}: ongeldig bestandstype`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `${file.name}: te groot (max 10MB)`;
  }
  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BulkUpload() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("select");
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [results, setResults] = useState<BulkReceiptResult[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [processing, setProcessing] = useState(false);

  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Track user edits per receiptId
  const [edits, setEdits] = useState<
    Record<string, Partial<ReceiptInput & { cost_code: number | null }>>
  >({});

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const newFiles = Array.from(files);
      const errors: string[] = [];

      const validFiles: File[] = [];
      for (const file of newFiles) {
        const err = validateFile(file);
        if (err) {
          errors.push(err);
        } else {
          validFiles.push(file);
        }
      }

      const combined = [...selectedFiles, ...validFiles];
      if (combined.length > MAX_FILES) {
        errors.push(`Maximaal ${MAX_FILES} bestanden tegelijk.`);
        setSelectedFiles(combined.slice(0, MAX_FILES));
      } else {
        setSelectedFiles(combined);
      }

      setValidationErrors(errors);
    },
    [selectedFiles]
  );

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const processFiles = async () => {
    setPhase("processing");
    setProcessing(true);
    setProcessedCount(0);

    // Initialize results with processing state
    const initialResults: BulkReceiptResult[] = selectedFiles.map((f) => ({
      receiptId: "",
      fileName: f.name,
      status: "processing",
    }));
    setResults(initialResults);

    const today = new Date().toISOString().split("T")[0];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      let receiptId = "";

      try {
        // 1. Create receipt placeholder
        const createResult = await createReceipt({
          vendor_name: null,
          amount_ex_vat: null,
          vat_rate: null,
          category: null,
          cost_code: null,
          receipt_date: today,
        });

        if (createResult.error || !createResult.data) {
          setResults((prev) => {
            const updated = [...prev];
            updated[i] = {
              receiptId: "",
              fileName: file.name,
              status: "error",
              error: createResult.error ?? "Kon bon niet aanmaken.",
            };
            return updated;
          });
          setProcessedCount((c) => c + 1);
          continue;
        }

        receiptId = createResult.data.id;

        // 2. Upload file
        const formData = new FormData();
        formData.append("file", file);
        const uploadResult = await uploadReceiptImage(receiptId, formData);

        if (uploadResult.error) {
          setResults((prev) => {
            const updated = [...prev];
            updated[i] = {
              receiptId,
              fileName: file.name,
              status: "error",
              error: uploadResult.error ?? undefined,
            };
            return updated;
          });
          setProcessedCount((c) => c + 1);
          continue;
        }

        // 3. AI scan (non-fatal: receipt is already saved)
        const scanResult = await scanReceiptWithAI(receiptId);
        const aiData = scanResult.data ?? undefined;

        if (!scanResult.error && aiData) {
          // 4. Auto-save AI data to receipt
          const category = aiData.cost_code
            ? KOSTENSOORTEN.find((k) => k.code === aiData.cost_code)?.label ?? "Overig"
            : "Overig";

          await updateReceipt(receiptId, {
            vendor_name: aiData.vendor_name ?? null,
            amount_ex_vat: aiData.amount_ex_vat ?? null,
            vat_rate: aiData.vat_rate ?? null,
            category,
            cost_code: aiData.cost_code ?? null,
            receipt_date: aiData.receipt_date ?? today,
          });
        }

        setResults((prev) => {
          const updated = [...prev];
          updated[i] = {
            receiptId,
            fileName: file.name,
            status: "success",
            aiData: aiData ?? undefined,
            aiError: scanResult.error ?? undefined,
          };
          return updated;
        });
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Onverwachte fout bij verwerking.";
        setResults((prev) => {
          const updated = [...prev];
          updated[i] = {
            receiptId,
            fileName: file.name,
            status: "error",
            error: message,
          };
          return updated;
        });
      }

      setProcessedCount((c) => c + 1);
    }

    setProcessing(false);
    setPhase("review");
  };

  const handleCardUpdate = (
    receiptId: string,
    data: Partial<ReceiptInput & { cost_code: number | null }>
  ) => {
    setEdits((prev) => ({ ...prev, [receiptId]: data }));
  };

  const confirmAll = async () => {
    setConfirming(true);
    setConfirmError(null);

    const successResults = results.filter(
      (r) => r.status === "success" && r.receiptId
    );

    try {
      for (const result of successResults) {
        const editData = edits[result.receiptId];
        if (editData) {
          // User made edits — save them
          const vat = calculateVat(
            editData.amount_ex_vat ?? 0,
            (editData.vat_rate ?? 21) as VatRate
          );
          await updateReceipt(result.receiptId, {
            vendor_name: editData.vendor_name ?? null,
            amount_ex_vat: vat.subtotalExVat,
            vat_rate: editData.vat_rate ?? 21,
            category: editData.category ?? "Overig",
            cost_code: editData.cost_code ?? null,
            receipt_date: editData.receipt_date ?? null,
          });
        }
        await markReceiptAiProcessed(result.receiptId);
      }

      router.push("/dashboard/receipts");
    } catch {
      setConfirmError("Fout bij bevestigen. Probeer opnieuw.");
      setConfirming(false);
    }
  };

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  // ─── PHASE 1: FILE SELECTION ───
  if (phase === "select") {
    return (
      <div style={{ maxWidth: 600 }}>
        {validationErrors.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {validationErrors.map((err, i) => (
              <ErrorMessage key={i} style={{ marginBottom: 4 }}>
                {err}
              </ErrorMessage>
            ))}
          </div>
        )}

        <button
          type="button"
          aria-label="Klik of sleep bestanden om te uploaden"
          onClick={() => fileInputRef.current?.click()}
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
            width: "100%",
            background: "transparent",
            font: "inherit",
            color: "inherit",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            capture="environment"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />

          <p
            style={{
              fontSize: "var(--text-body-md)",
              fontWeight: 300,
              margin: 0,
              color: "var(--foreground)",
              opacity: 0.3,
            }}
          >
            Sleep foto&apos;s en PDF&apos;s van bonnen hierheen of klik om te
            selecteren
          </p>
          <p
            style={{
              fontSize: "var(--text-label)",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              margin: 0,
              opacity: 0.2,
            }}
          >
            Max {MAX_FILES} bestanden, max 10MB per bestand
          </p>
        </button>

        {/* Selected files list */}
        {selectedFiles.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <p
              style={{
                fontSize: "var(--text-label)",
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
                opacity: 0.4,
                margin: "0 0 12px",
              }}
            >
              {selectedFiles.length} bestand
              {selectedFiles.length !== 1 ? "en" : ""} geselecteerd
            </p>

            {selectedFiles.map((file, index) => {
              const isPdf = file.type === "application/pdf";
              return (
                <div
                  key={`${file.name}-${index}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 0",
                    borderBottom: "0.5px solid rgba(13,13,11,0.06)",
                  }}
                >
                  <span style={{ fontSize: 14, opacity: 0.4 }}>
                    {isPdf ? "📄" : "📷"}
                  </span>
                  <span
                    style={{
                      fontSize: "var(--text-body-sm)",
                      fontWeight: 400,
                      flex: 1,
                    }}
                  >
                    {file.name}
                  </span>
                  <span
                    className="mono-amount"
                    style={{
                      fontSize: "var(--text-mono-sm)",
                      opacity: 0.35,
                    }}
                  >
                    {formatFileSize(file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "var(--text-label)",
                      fontWeight: 500,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase" as const,
                      opacity: 0.3,
                      padding: "4px 0",
                    }}
                  >
                    Verwijder
                  </button>
                </div>
              );
            })}

            <div style={{ marginTop: 24 }}>
              <ButtonPrimary
                onClick={processFiles}
                disabled={selectedFiles.length === 0}
              >
                Start verwerking ({selectedFiles.length})
              </ButtonPrimary>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── PHASE 2: PROCESSING ───
  if (phase === "processing" && processing) {
    const progress =
      selectedFiles.length > 0
        ? (processedCount / selectedFiles.length) * 100
        : 0;

    return (
      <div style={{ maxWidth: 600 }}>
        <p
          style={{
            fontSize: "var(--text-body-md)",
            fontWeight: 300,
            margin: "0 0 8px",
          }}
        >
          {processedCount} van {selectedFiles.length} bonnen verwerkt...
        </p>

        {/* Progress bar */}
        <div
          style={{
            width: "100%",
            height: 2,
            background: "rgba(13,13,11,0.08)",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "var(--foreground)",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {/* File status list */}
        {results.map((result, i) => (
          <BulkReceiptCard
            key={`${result.fileName}-${i}`}
            result={result}
            onUpdate={handleCardUpdate}
          />
        ))}
      </div>
    );
  }

  // ─── PHASE 3: REVIEW ───
  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 24 }}>
        <p
          style={{
            fontSize: "var(--text-body-md)",
            fontWeight: 300,
            margin: "0 0 4px",
          }}
        >
          Verwerking voltooid
        </p>
        <p
          style={{
            fontSize: "var(--text-label)",
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            opacity: 0.4,
            margin: 0,
          }}
        >
          {successCount} geslaagd
          {errorCount > 0 ? ` · ${errorCount} mislukt` : ""}
        </p>
      </div>

      {confirmError && (
        <ErrorMessage style={{ marginBottom: 16 }}>{confirmError}</ErrorMessage>
      )}

      {results.map((result, i) => (
        <BulkReceiptCard
          key={`${result.fileName}-${i}`}
          result={result}
          onUpdate={handleCardUpdate}
        />
      ))}

      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 32,
          paddingTop: 24,
          borderTop: "0.5px solid rgba(13,13,11,0.15)",
        }}
      >
        <ButtonSecondary onClick={() => router.push("/dashboard/receipts")}>
          Annuleer
        </ButtonSecondary>
        {successCount > 0 && (
          <ButtonPrimary onClick={confirmAll} disabled={confirming}>
            {confirming
              ? "Bevestigen..."
              : `Alles bevestigen (${successCount})`}
          </ButtonPrimary>
        )}
      </div>
    </div>
  );
}
