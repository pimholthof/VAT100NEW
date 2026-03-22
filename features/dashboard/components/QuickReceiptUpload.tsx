"use client";

import { useRef, useState, useCallback } from "react";
import { m as motion  } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadReceiptImage, scanReceiptWithAI, createReceipt } from "@/features/receipts/actions";

/**
 * QuickReceiptUpload — A drag-and-drop "snap & go" receipt uploader
 * for the dashboard. Drop a photo → AI extracts data → receipt is created.
 */
export function QuickReceiptUpload() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "scanning" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const processMutation = useMutation({
    mutationFn: async (file: File) => {
      setStatus("uploading");
      setMessage("SYSTEEM INITIALISEREN...");

      // 1. Create a placeholder receipt
      const receiptResult = await createReceipt({
        vendor_name: null,
        amount_ex_vat: 0,
        vat_rate: 21,
        category: "Overig",
        cost_code: null,
        receipt_date: new Date().toISOString().split("T")[0],
      });

      if (receiptResult.error || !receiptResult.data) {
        throw new Error(receiptResult.error ?? "Kon bon niet aanmaken.");
      }

      const receiptId = receiptResult.data.id;

      // 2. Upload the image
      const formData = new FormData();
      formData.append("file", file);
      const uploadResult = await uploadReceiptImage(receiptId, formData);
      if (uploadResult.error) {
        throw new Error(uploadResult.error);
      }

      // 3. Scan with AI
      setStatus("scanning");
      setMessage("VISION AI EXTRAGEERT DATA...");
      const scanResult = await scanReceiptWithAI(receiptId);

      if (scanResult.error) {
        // Receipt is still saved, just not AI-enriched
        setStatus("done");
        setMessage("DOCUMENT OPGESLAGEN (EXTRACTIE MISLUKT).");
        return;
      }

      // 4. Update receipt with AI data
      if (scanResult.data) {
        const { updateReceipt } = await import("@/features/receipts/actions");
        await updateReceipt(receiptId, {
          vendor_name: scanResult.data.vendor_name ?? null,
          amount_ex_vat: scanResult.data.amount_ex_vat ?? null,
          vat_rate: scanResult.data.vat_rate ?? null,
          category: null,
          cost_code: scanResult.data.cost_code ?? null,
          receipt_date: scanResult.data.receipt_date ?? null,
        });

        const { markReceiptAiProcessed } = await import("@/features/receipts/actions");
        await markReceiptAiProcessed(receiptId);
      }

    setStatus("done");
    setMessage(
      scanResult.data?.vendor_name
        ? `${scanResult.data.vendor_name} — €${scanResult.data.amount_ex_vat?.toFixed(2) ?? "?"}`
        : "DOCUMENT GEREGISTREERD."
    );
    },
    onError: (err) => {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Onbekende fout.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["action-feed"] });
      // Auto-reset after 4 seconds
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 4000);
    },
  });

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        setStatus("error");
        setMessage("ALLEEN AFBEELDING OF PDF TOEGESTAAN.");
        return;
      }
      processMutation.mutate(file);
    },
    [processMutation]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      className={status === "uploading" || status === "scanning" ? "upload-processing" : ""}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => status === "idle" && fileRef.current?.click()}
      style={{
        border: isDragging
          ? "2px solid var(--foreground)"
          : "1px dashed rgba(13,13,11,0.2)",
        padding: 24,
        textAlign: "center",
        cursor: status === "idle" ? "pointer" : "default",
        transition: "all 0.2s ease",
        background: isDragging ? "rgba(13,13,11,0.02)" : "transparent",
        marginBottom: "var(--space-section)",
      }}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {status === "idle" && (
        <>
          <p
            style={{
              fontFamily: "var(--font-body), sans-serif",
              fontSize: "var(--text-body-md)",
              fontWeight: 500,
              margin: "0 0 4px",
            }}
          >
            DOCUMENT DROPZONE
          </p>
          <p className="label" style={{ opacity: 0.5, margin: 0 }}>
            Sleep foto of PDF voor AI-verwerking
          </p>
        </>
      )}

      {(status === "uploading" || status === "scanning") && (
        <div style={{ position: "relative", overflow: "hidden", margin: "-24px", padding: "24px" }}>
          {status === "scanning" && (
            <motion.div
              initial={{ top: "0%" }}
              animate={{ top: "100%" }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: "2px",
                background: "linear-gradient(to right, transparent, var(--color-accent), transparent)",
                zIndex: 10,
                boxShadow: "0 0 15px var(--color-accent)",
              }}
            />
          )}
          <p
            style={{
              fontFamily: "var(--font-body), sans-serif",
              fontSize: "var(--text-body-md)",
              fontWeight: 400,
              margin: 0,
              opacity: 0.7,
            }}
          >
            {message}
          </p>
        </div>
      )}

      {status === "done" && (
        <p
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "var(--text-mono-md)",
            fontWeight: 400,
            margin: 0,
          }}
        >
          {message}
        </p>
      )}

      {status === "error" && (
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-md)",
            fontWeight: 400,
            margin: 0,
            opacity: 0.7,
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
