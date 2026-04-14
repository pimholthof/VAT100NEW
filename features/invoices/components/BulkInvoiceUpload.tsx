"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  uploadInvoiceFile,
  scanInvoiceWithAI,
  findOrCreateClient,
} from "@/features/invoices/invoice-ocr-actions";
import {
  createInvoice,
  generateInvoiceNumber,
  updateInvoice,
} from "@/features/invoices/actions";
import { getClients } from "@/features/clients/actions";
import {
  ButtonPrimary,
  ButtonSecondary,
  ErrorMessage,
} from "@/components/ui";
import type { Client, VatRate, InvoiceUnit } from "@/lib/types";
import {
  BulkInvoiceCard,
  type BulkInvoiceResult,
  type InvoiceEditData,
} from "./BulkInvoiceCard";
import { useLocale } from "@/lib/i18n/context";

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

export function BulkInvoiceUpload() {
  const { t } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("select");
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [results, setResults] = useState<BulkInvoiceResult[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [processing, setProcessing] = useState(false);

  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Track user edits per invoiceId
  const [edits, setEdits] = useState<Record<string, InvoiceEditData>>({});

  // Fetch clients for the dropdown in review cards
  const { data: clientsResult } = useQuery({
    queryKey: ["clients"],
    queryFn: () => getClients(),
  });
  const clients: Client[] = clientsResult?.data ?? [];

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

    const initialResults: BulkInvoiceResult[] = selectedFiles.map((f) => ({
      invoiceId: "",
      fileName: f.name,
      status: "processing",
    }));
    setResults(initialResults);

    const today = new Date().toISOString().split("T")[0];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      let invoiceId = "";

      try {
        // 1. Upload file to storage
        const formData = new FormData();
        formData.append("file", file);
        const uploadResult = await uploadInvoiceFile(formData);

        if (uploadResult.error || !uploadResult.data) {
          setResults((prev) => {
            const updated = [...prev];
            updated[i] = {
              invoiceId: "",
              fileName: file.name,
              status: "error",
              error: uploadResult.error ?? "Upload mislukt.",
            };
            return updated;
          });
          setProcessedCount((c) => c + 1);
          continue;
        }

        const storagePath = uploadResult.data;

        // 2. AI scan
        const scanResult = await scanInvoiceWithAI(storagePath);
        const aiData = scanResult.data ?? undefined;
        const aiError = scanResult.error ?? undefined;

        // 3. Find or create client
        let clientMatch: BulkInvoiceResult["clientMatch"] = undefined;
        if (aiData?.client_name) {
          const clientResult = await findOrCreateClient({
            name: aiData.client_name,
            address: aiData.client_address,
            city: aiData.client_city,
            postal_code: aiData.client_postal_code,
            kvk_number: aiData.client_kvk_number,
            btw_number: aiData.client_btw_number,
            email: aiData.client_email,
          });

          if (!clientResult.error && clientResult.data) {
            clientMatch = clientResult.data;
            // Invalidate clients cache so new clients show in dropdowns
            if (clientResult.data.isNew) {
              queryClient.invalidateQueries({ queryKey: ["clients"] });
            }
          }
        }

        // 4. Generate invoice number + create draft invoice
        const numberResult = await generateInvoiceNumber();
        const invNumber =
          aiData?.invoice_number ?? numberResult.data ?? `IMPORT-${i + 1}`;

        const invoiceLines =
          aiData?.lines && aiData.lines.length > 0
            ? aiData.lines.map((l) => ({
                id: crypto.randomUUID(),
                description: l.description,
                quantity: l.quantity,
                unit: l.unit as InvoiceUnit,
                rate: l.rate,
              }))
            : [
                {
                  id: crypto.randomUUID(),
                  description: "Geïmporteerde factuur",
                  quantity: 1,
                  unit: "stuks" as InvoiceUnit,
                  rate: aiData?.subtotal_ex_vat ?? 0,
                },
              ];

        const createResult = await createInvoice({
          client_id: clientMatch?.id ?? "",
          invoice_number: invNumber,
          status: "draft",
          issue_date: aiData?.issue_date ?? today,
          due_date: aiData?.due_date ?? null,
          vat_rate: (aiData?.vat_rate ?? 21) as VatRate,
          vat_scheme: aiData?.vat_scheme ?? "standard",
          notes: null,
          lines: invoiceLines,
        });

        if (createResult.error || !createResult.data) {
          // If invoice creation fails (e.g., duplicate number), retry with generated number
          if (createResult.error?.includes("duplicate") || createResult.error?.includes("bestaat al")) {
            const retryNumber = numberResult.data ?? `IMPORT-${Date.now()}`;
            const retryResult = await createInvoice({
              client_id: clientMatch?.id ?? "",
              invoice_number: retryNumber,
              status: "draft",
              issue_date: aiData?.issue_date ?? today,
              due_date: aiData?.due_date ?? null,
              vat_rate: (aiData?.vat_rate ?? 21) as VatRate,
              vat_scheme: aiData?.vat_scheme ?? "standard",
              notes: null,
              lines: invoiceLines,
            });

            if (retryResult.error || !retryResult.data) {
              setResults((prev) => {
                const updated = [...prev];
                updated[i] = {
                  invoiceId: "",
                  fileName: file.name,
                  status: "error",
                  error: retryResult.error ?? "Kon factuur niet aanmaken.",
                };
                return updated;
              });
              setProcessedCount((c) => c + 1);
              continue;
            }
            invoiceId = retryResult.data;
          } else {
            setResults((prev) => {
              const updated = [...prev];
              updated[i] = {
                invoiceId: "",
                fileName: file.name,
                status: "error",
                error: createResult.error ?? "Kon factuur niet aanmaken.",
              };
              return updated;
            });
            setProcessedCount((c) => c + 1);
            continue;
          }
        } else {
          invoiceId = createResult.data;
        }

        setResults((prev) => {
          const updated = [...prev];
          updated[i] = {
            invoiceId,
            fileName: file.name,
            status: "success",
            aiData: aiData ?? undefined,
            aiError: aiError ?? undefined,
            clientMatch,
          };
          return updated;
        });
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Onverwachte fout bij verwerking.";
        setResults((prev) => {
          const updated = [...prev];
          updated[i] = {
            invoiceId,
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

  const handleCardUpdate = (invoiceId: string, data: InvoiceEditData) => {
    setEdits((prev) => ({ ...prev, [invoiceId]: data }));
  };

  const confirmAll = async () => {
    setConfirming(true);
    setConfirmError(null);

    const successResults = results.filter(
      (r) => r.status === "success" && r.invoiceId
    );

    try {
      for (const result of successResults) {
        const editData = edits[result.invoiceId];
        if (editData) {
          await updateInvoice(result.invoiceId, {
            client_id: editData.client_id ?? "",
            invoice_number: editData.invoice_number,
            status: "draft",
            issue_date: editData.issue_date,
            due_date: editData.due_date || null,
            vat_rate: editData.vat_rate,
            vat_scheme: editData.vat_scheme,
            notes: editData.notes || null,
            lines: editData.lines.map((l) => ({
              id: l.id,
              description: l.description,
              quantity: l.quantity,
              unit: l.unit,
              rate: l.rate,
            })),
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      router.push("/dashboard/invoices");
    } catch {
      setConfirmError(t.invoices.importConfirmError);
      setConfirming(false);
    }
  };

  const addManualInvoice = async () => {
    const numberResult = await generateInvoiceNumber();
    const invNumber = numberResult.data ?? `HANDMATIG-${Date.now()}`;
    const today = new Date().toISOString().split("T")[0];

    const createResult = await createInvoice({
      client_id: "",
      invoice_number: invNumber,
      status: "draft",
      issue_date: today,
      due_date: null,
      vat_rate: 21,
      vat_scheme: "standard",
      notes: null,
      lines: [
        {
          id: crypto.randomUUID(),
          description: "",
          quantity: 1,
          unit: "uren" as InvoiceUnit,
          rate: 0,
        },
      ],
    });

    if (createResult.data) {
      const newResult: BulkInvoiceResult = {
        invoiceId: createResult.data,
        fileName: t.invoices.importManualEntry,
        status: "success",
        aiData: undefined,
        aiError: "manual",
      };
      setResults((prev) => [...prev, newResult]);
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

        <div
          role="button"
          tabIndex={0}
          aria-label="Klik of sleep bestanden om te uploaden"
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
            {t.invoices.importDropzone}
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
        </div>

        {/* Manual entry option */}
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button
            type="button"
            onClick={async () => {
              setPhase("review");
              await addManualInvoice();
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "var(--text-body-sm)",
              fontWeight: 400,
              opacity: 0.4,
              padding: "4px 8px",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            {t.invoices.importManualEntry}
          </button>
        </div>

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
                    {isPdf ? "\u{1F4C4}" : "\u{1F4F7}"}
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
                {t.invoices.importStartProcessing} ({selectedFiles.length})
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
      <div style={{ maxWidth: 700 }}>
        <p
          style={{
            fontSize: "var(--text-body-md)",
            fontWeight: 300,
            margin: "0 0 8px",
          }}
        >
          {processedCount} van {selectedFiles.length} facturen verwerkt...
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
          <BulkInvoiceCard
            key={`${result.fileName}-${i}`}
            result={result}
            clients={clients}
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
          {t.invoices.importComplete}
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
          {errorCount > 0 ? ` \u00B7 ${errorCount} mislukt` : ""}
        </p>
      </div>

      {confirmError && (
        <ErrorMessage style={{ marginBottom: 16 }}>{confirmError}</ErrorMessage>
      )}

      {results.map((result, i) => (
        <BulkInvoiceCard
          key={`${result.fileName}-${i}`}
          result={result}
          clients={clients}
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
          flexWrap: "wrap",
        }}
      >
        <ButtonSecondary onClick={() => router.push("/dashboard/invoices")}>
          Annuleer
        </ButtonSecondary>
        <ButtonSecondary onClick={addManualInvoice}>
          {t.invoices.importManualEntry}
        </ButtonSecondary>
        {successCount > 0 && (
          <ButtonPrimary onClick={confirmAll} disabled={confirming}>
            {confirming
              ? t.invoices.importConfirming
              : `${t.invoices.importConfirmAll} (${successCount})`}
          </ButtonPrimary>
        )}
      </div>
    </div>
  );
}
