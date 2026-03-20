"use client";

import { useRef, useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadReceiptImage, scanReceiptWithAI, createReceipt } from "@/lib/actions/receipts";

/**
 * QuickReceiptUpload — Drag-and-drop bon-upload voor het dashboard.
 * Drop een foto → AI extraheert data → bon wordt aangemaakt.
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

      const formData = new FormData();
      formData.append("file", file);
      const uploadResult = await uploadReceiptImage(receiptId, formData);
      if (uploadResult.error) {
        throw new Error(uploadResult.error);
      }

      setStatus("scanning");
      setMessage("VISION AI EXTRAHEERT DATA...");
      const scanResult = await scanReceiptWithAI(receiptId);

      if (scanResult.error) {
        setStatus("done");
        setMessage("DOCUMENT OPGESLAGEN (EXTRACTIE MISLUKT).");
        return;
      }

      if (scanResult.data) {
        const { updateReceipt } = await import("@/lib/actions/receipts");
        await updateReceipt(receiptId, {
          vendor_name: scanResult.data.vendor_name ?? null,
          amount_ex_vat: scanResult.data.amount_ex_vat ?? null,
          vat_rate: scanResult.data.vat_rate ?? null,
          category: null,
          cost_code: scanResult.data.cost_code ?? null,
          receipt_date: scanResult.data.receipt_date ?? null,
        });

        const { markReceiptAiProcessed } = await import("@/lib/actions/receipts");
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

  const isProcessing = status === "uploading" || status === "scanning";

  return (
    <div
      className={`upload-zone ${isProcessing ? "upload-processing" : ""}`}
      data-dragging={isDragging}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => status === "idle" && fileRef.current?.click()}
      style={{ cursor: status === "idle" ? "pointer" : "default" }}
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
          <p className="upload-zone-title">Document dropzone</p>
          <p className="upload-zone-sub">
            Sleep foto of PDF voor AI-verwerking
          </p>
        </>
      )}

      {isProcessing && (
        <p className="mono-amount" style={{ fontSize: 12, margin: 0, opacity: 0.7 }}>
          {message}
        </p>
      )}

      {status === "done" && (
        <p className="mono-amount" style={{ fontSize: 13, margin: 0 }}>
          {message}
        </p>
      )}

      {status === "error" && (
        <p style={{ fontSize: 13, margin: 0, opacity: 0.7 }}>
          {message}
        </p>
      )}
    </div>
  );
}
