"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createReceipt,
  updateReceipt,
  uploadReceiptImage,
  scanReceiptWithAI,
  getReceiptImageUrl,
  markReceiptAiProcessed,
} from "@/lib/actions/receipts";
import {
  KOSTENSOORTEN,
  getGroepen,
  getKostensoortenByGroep,
} from "@/lib/constants/costs";
import type { Receipt, ReceiptInput } from "@/lib/types";

type Step = "upload" | "processing" | "form";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

interface ReceiptFormProps {
  receipt?: Receipt;
  onSaved?: () => void;
}

export function ReceiptForm({ receipt, onSaved }: ReceiptFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine initial step
  const initialStep: Step = receipt ? "form" : "upload";
  const [step, setStep] = useState<Step>(initialStep);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Processing state
  const [scanError, setScanError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);

  // Receipt image URL (for preview)
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // The receipt ID we're working with (existing or newly created)
  const [workingReceiptId, setWorkingReceiptId] = useState<string | null>(
    receipt?.id ?? null
  );

  // Form state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const [receiptDate, setReceiptDate] = useState(receipt?.receipt_date ?? today);
  const [vendorName, setVendorName] = useState(receipt?.vendor_name ?? "");
  const [costCode, setCostCode] = useState<number | null>(
    receipt?.cost_code ?? null
  );
  const [amountExVat, setAmountExVat] = useState(
    receipt?.amount_ex_vat != null ? String(receipt.amount_ex_vat) : ""
  );
  const [vatRate, setVatRate] = useState(
    receipt?.vat_rate != null ? String(receipt.vat_rate) : "21"
  );

  // Drag state
  const [dragOver, setDragOver] = useState(false);

  const parsedAmount = parseFloat(amountExVat) || 0;
  const parsedVatRate = parseFloat(vatRate) || 0;
  const computedVat = Math.round(parsedAmount * (parsedVatRate / 100) * 100) / 100;
  const computedIncVat = Math.round((parsedAmount + computedVat) * 100) / 100;

  // Derive category from cost_code
  const category = costCode
    ? KOSTENSOORTEN.find((k) => k.code === costCode)?.label ?? "Overig"
    : "Overig";

  // Load existing receipt image
  useEffect(() => {
    if (receipt?.storage_path && !imageUrl) {
      getReceiptImageUrl(receipt.storage_path).then((result) => {
        if (result.data) setImageUrl(result.data);
      });
    }
  }, [receipt?.storage_path, imageUrl]);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("Alleen afbeeldingen zijn toegestaan.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Bestand is te groot (max 10MB).");
      return;
    }

    setSelectedFile(file);
    setUploadError(null);

    // Create local preview
    const reader = new FileReader();
    reader.onload = (e) => setFilePreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Start upload flow
    await handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);

    try {
      // If no receipt yet, create a minimal one first
      let receiptId = workingReceiptId;
      if (!receiptId) {
        const createResult = await createReceipt({
          vendor_name: null,
          amount_ex_vat: null,
          vat_rate: null,
          category: null,
          cost_code: null,
          receipt_date: today,
        });
        if (createResult.error || !createResult.data) {
          setUploadError(createResult.error ?? "Kon bon niet aanmaken.");
          setUploading(false);
          return;
        }
        receiptId = createResult.data.id;
        setWorkingReceiptId(receiptId);
      }

      // Upload the file
      const formData = new FormData();
      formData.append("file", file);
      const uploadResult = await uploadReceiptImage(receiptId, formData);

      if (uploadResult.error) {
        setUploadError(uploadResult.error);
        setUploading(false);
        return;
      }

      // Get signed URL for preview
      if (uploadResult.data) {
        const urlResult = await getReceiptImageUrl(uploadResult.data);
        if (urlResult.data) setImageUrl(urlResult.data);
      }

      setUploading(false);

      // Move to processing step
      setStep("processing");
      await handleScan(receiptId);
    } catch {
      setUploadError("Upload mislukt. Probeer opnieuw.");
      setUploading(false);
    }
  };

  const handleScan = async (receiptId: string) => {
    setScanError(null);

    try {
      const result = await scanReceiptWithAI(receiptId);

      if (result.error) {
        setScanError(result.error);
      } else if (result.data) {
        // Fill form fields with AI results
        if (result.data.vendor_name) setVendorName(result.data.vendor_name);
        if (result.data.receipt_date) setReceiptDate(result.data.receipt_date);
        if (result.data.amount_ex_vat != null)
          setAmountExVat(String(result.data.amount_ex_vat));
        if (result.data.vat_rate != null)
          setVatRate(String(result.data.vat_rate));
        if (result.data.cost_code != null)
          setCostCode(result.data.cost_code);
        if (result.data.confidence != null)
          setConfidence(result.data.confidence);
      }
    } catch {
      setScanError("AI-analyse mislukt. Vul de velden handmatig in.");
    }

    setStep("form");
  };

  const handleSubmit = async () => {
    if (!receiptDate) {
      setError("Datum is verplicht.");
      return;
    }

    setSaving(true);
    setError(null);

    const input: ReceiptInput = {
      vendor_name: vendorName || null,
      amount_ex_vat: parsedAmount,
      vat_rate: parsedVatRate,
      category,
      cost_code: costCode,
      receipt_date: receiptDate,
    };

    const result = workingReceiptId
      ? await updateReceipt(workingReceiptId, input)
      : await createReceipt(input);

    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    // Mark as AI processed if we did a scan
    const finalId = workingReceiptId ?? result.data?.id;
    if (finalId && imageUrl) {
      await markReceiptAiProcessed(finalId);
    }

    if (onSaved) {
      onSaved();
    } else if (result.data) {
      router.push(`/dashboard/receipts/${result.data.id}`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const groepen = getGroepen();

  // ─── STEP 1: UPLOAD ───
  if (step === "upload") {
    return (
      <div style={{ maxWidth: 600 }}>
        {uploadError && <ErrorBanner message={uploadError} />}

        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            border: dragOver
              ? "1px dashed rgba(13,13,11,0.4)"
              : "1px dashed rgba(13,13,11,0.2)",
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
              <img
                src={filePreview}
                alt="Preview"
                style={{ maxWidth: 200, maxHeight: 150, objectFit: "contain" as const }}
              />
              <p style={{ ...uploadTextStyle, fontSize: "var(--text-body-xs)" }}>
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
          onClick={() => setStep("form")}
          style={{
            display: "block",
            marginTop: 16,
            background: "none",
            border: "none",
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-sm)",
            fontWeight: 400,
            color: "var(--foreground)",
            opacity: 0.6,
            cursor: "pointer",
            textDecoration: "underline",
            padding: 0,
          }}
        >
          Handmatig invoeren
        </button>
      </div>
    );
  }

  // ─── STEP 2: PROCESSING ───
  if (step === "processing") {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "250px 1fr",
          gap: 32,
          maxWidth: 800,
        }}
      >
        {/* Left: image preview */}
        <div>
          {(imageUrl || filePreview) && (
            <img
              src={imageUrl || filePreview || ""}
              alt="Bon preview"
              style={{
                width: "100%",
                maxHeight: 400,
                objectFit: "contain" as const,
                border: "var(--border-rule)",
              }}
            />
          )}
        </div>

        {/* Right: skeleton form */}
        <div>
          <p
            style={{
              fontFamily: "var(--font-body), sans-serif",
              fontSize: "var(--text-body-md)",
              fontWeight: 400,
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

  // ─── STEP 3: FORM (CONTROLEREN & OPSLAAN) ───
  const showImageColumn = !!imageUrl || !!filePreview;

  return (
    <div
      style={
        showImageColumn
          ? {
              display: "grid",
              gridTemplateColumns: "250px 1fr",
              gap: 32,
              maxWidth: 800,
            }
          : { maxWidth: 600 }
      }
    >
      {/* Left column: image */}
      {showImageColumn && (
        <div style={{ position: "sticky" as const, top: 80, alignSelf: "start" }}>
          <img
            src={imageUrl || filePreview || ""}
            alt="Bon"
            style={{
              width: "100%",
              maxHeight: 400,
              objectFit: "contain" as const,
              border: "var(--border-rule)",
            }}
          />
        </div>
      )}

      {/* Right column: form */}
      <div>
        {confidence !== null && (
          <p
            style={{
              fontFamily: "var(--font-body), sans-serif",
              fontSize: 9,
              fontWeight: 500,
              textTransform: "uppercase" as const,
              letterSpacing: "0.25em",
              opacity: 0.6,
              margin: "0 0 16px",
            }}
          >
            AI-herkenning — controleer de velden
          </p>
        )}

        {confidence !== null && confidence < 0.7 && (
          <div
            style={{
              borderLeft: "2px solid var(--foreground)",
              padding: "12px 16px",
              marginBottom: 24,
              fontFamily: "var(--font-body), sans-serif",
              fontSize: "var(--text-body-md)",
              fontWeight: 400,
            }}
          >
            Let op: lage betrouwbaarheid, controleer extra
          </div>
        )}

        {scanError && <ErrorBanner message={scanError} />}
        {error && <ErrorBanner message={error} />}

        <FieldGroup label="Datum *">
          <input
            type="date"
            value={receiptDate}
            onChange={(e) => setReceiptDate(e.target.value)}
            required
            style={inputStyle}
          />
        </FieldGroup>

        <FieldGroup label="Leverancier">
          <input
            type="text"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            placeholder="Naam leverancier"
            style={inputStyle}
          />
        </FieldGroup>

        <FieldGroup label="Kostensoort">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              value={costCode ?? ""}
              onChange={(e) =>
                setCostCode(e.target.value ? Number(e.target.value) : null)
              }
              style={{ ...inputStyle, flex: 1 }}
            >
              <option value="">— Selecteer —</option>
              {groepen.map((groep) => (
                <optgroup
                  key={groep}
                  label={groep}
                  style={{
                    fontSize: 9,
                    textTransform: "uppercase" as const,
                    fontWeight: 700,
                  }}
                >
                  {getKostensoortenByGroep(groep).map((k) => (
                    <option key={k.code} value={k.code}>
                      {k.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {costCode && (
              <span
                style={{
                  fontSize: 9,
                  opacity: 0.4,
                  fontFamily: "var(--font-body), sans-serif",
                }}
              >
                {costCode}
              </span>
            )}
          </div>
        </FieldGroup>

        <FieldGroup label="Bedrag excl. BTW">
          <input
            type="number"
            step="0.01"
            value={amountExVat}
            onChange={(e) => setAmountExVat(e.target.value)}
            placeholder="0,00"
            style={inputStyle}
          />
        </FieldGroup>

        <FieldGroup label="BTW-tarief">
          <select
            value={vatRate}
            onChange={(e) => setVatRate(e.target.value)}
            style={inputStyle}
          >
            <option value="21">21%</option>
            <option value="9">9%</option>
            <option value="0">0%</option>
          </select>
        </FieldGroup>

        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-md)",
            fontWeight: 400,
            margin: "0 0 24px",
            padding: "12px 16px",
            border: "none",
            borderTop: "var(--border-rule)",
            borderBottom: "var(--border-rule)",
          }}
        >
          BTW: {formatCurrency(computedVat)} | Incl. BTW:{" "}
          {formatCurrency(computedIncVat)}
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 32,
            paddingTop: 24,
            borderTop: "var(--border-rule)",
          }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            style={buttonSecondaryStyle}
          >
            Annuleer
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            style={buttonPrimaryStyle}
          >
            {saving ? "Opslaan..." : "Bon opslaan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "12px 16px",
        border: "none",
        borderLeft: "2px solid var(--foreground)",
        marginBottom: 24,
        fontFamily: "var(--font-body), sans-serif",
        fontSize: "var(--text-body-md)",
        fontWeight: 400,
      }}
    >
      {message}
    </div>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-body-sm)",
          fontWeight: 500,
          letterSpacing: "0.02em",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
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

const uploadTextStyle: React.CSSProperties = {
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "var(--text-body-md)",
  fontWeight: 300,
  margin: 0,
  color: "var(--foreground)",
  opacity: 0.6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 2px",
  border: "none",
  borderBottom: "var(--border-input)",
  background: "transparent",
  color: "var(--foreground)",
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "var(--text-body-md)",
  fontWeight: 300,
  outline: "none",
};

const buttonPrimaryStyle: React.CSSProperties = {
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "var(--text-body-lg)",
  fontWeight: 500,
  letterSpacing: "0.05em",
  padding: "12px 20px",
  border: "none",
  background: "var(--foreground)",
  color: "var(--background)",
  cursor: "pointer",
};

const buttonSecondaryStyle: React.CSSProperties = {
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "var(--text-body-md)",
  fontWeight: 500,
  letterSpacing: "0.05em",
  padding: "10px 16px",
  border: "1px solid rgba(13, 13, 11, 0.2)",
  background: "transparent",
  color: "var(--foreground)",
  cursor: "pointer",
};
