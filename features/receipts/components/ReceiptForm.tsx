"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import {
  createReceipt,
  updateReceipt,
  uploadReceiptImage,
  scanReceiptWithAI,
  getReceiptImageUrl,
  markReceiptAiProcessed,
} from "@/features/receipts/actions";
import {
  KOSTENSOORTEN,
  getGroepen,
  getKostensoortenByGroep,
} from "@/lib/constants/costs";
import { isRepresentatie, HORECA_CODES } from "@/lib/tax/chart-of-accounts";
import { getDefaultVatRateForCostCode, getDefaultBusinessPercentage } from "@/lib/tax/transaction-classifier";
import type { Receipt, ReceiptInput } from "@/lib/types";
import {
  FieldGroup,
  ButtonPrimary,
  ButtonSecondary,
  ErrorMessage,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { ReceiptUpload } from "./ReceiptUpload";
import { ReceiptProcessing } from "./ReceiptProcessing";
import { useLocale } from "@/lib/i18n/context";

type Step = "upload" | "processing" | "form" | "done";

/** Confidence drempel voor auto-save (geen handmatige review nodig) */
const AUTO_SAVE_CONFIDENCE = 0.85;

interface ReceiptFormProps {
  receipt?: Receipt;
  onSaved?: () => void;
}

export function ReceiptForm({ receipt, onSaved }: ReceiptFormProps) {
  const { t } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();

  const initialStep: Step = receipt ? "form" : "upload";
  const [step, setStep] = useState<Step>(initialStep);

  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [scanError, setScanError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [workingReceiptId, setWorkingReceiptId] = useState<string | null>(
    receipt?.id ?? null
  );

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
  const [businessPercentage, setBusinessPercentage] = useState(
    receipt?.business_percentage ?? 100
  );

  const parsedAmount = parseFloat(amountExVat) || 0;
  const parsedVatRate = parseFloat(vatRate) || 0;
  const computedVat = Math.round(parsedAmount * (parsedVatRate / 100) * 100) / 100;
  const computedIncVat = Math.round((parsedAmount + computedVat) * 100) / 100;

  const category = costCode
    ? KOSTENSOORTEN.find((k) => k.code === costCode)?.label ?? "Overig"
    : "Overig";

  const [autoRuleMessage, setAutoRuleMessage] = useState<string | null>(null);

  const applyCostCodeRules = (code: number | null) => {
    setCostCode(code);
    if (!code) {
      setAutoRuleMessage(null);
      return;
    }

    const suggestedVat = getDefaultVatRateForCostCode(code);
    setVatRate(String(suggestedVat));

    const suggestedBp = getDefaultBusinessPercentage(code);
    setBusinessPercentage(suggestedBp);

    if (isRepresentatie(code)) {
      setAutoRuleMessage("Representatiekosten: automatisch 80% zakelijk, 20% privé (fiscale regel)");
    } else if (HORECA_CODES.has(code)) {
      setAutoRuleMessage("Horeca: BTW is niet aftrekbaar (Nederlandse wetgeving)");
    } else if (suggestedVat === 9) {
      setAutoRuleMessage(`Standaard BTW-tarief: ${suggestedVat}% (verlaagd tarief)`);
    } else if (suggestedVat === 0) {
      setAutoRuleMessage("Geen BTW van toepassing op deze kostsoort");
    } else {
      setAutoRuleMessage(null);
    }
  };

  useEffect(() => {
    if (receipt?.storage_path && !imageUrl) {
      getReceiptImageUrl(receipt.storage_path).then((result) => {
        if (result.data) setImageUrl(result.data);
      });
    }
  }, [receipt?.storage_path, imageUrl]);

  const handleFileSelect = async (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isPdfFile = file.type === "application/pdf";
    if (!isImage && !isPdfFile) {
      setUploadError(t.receipts.onlyImages);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError(t.receipts.fileTooLarge);
      return;
    }

    setUploadError(null);

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }

    await handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);

    try {
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
          setUploadError(createResult.error ?? t.receipts.couldNotCreate);
          setUploading(false);
          return;
        }
        receiptId = createResult.data.id;
        setWorkingReceiptId(receiptId);
      }

      const formData = new FormData();
      formData.append("file", file);
      const uploadResult = await uploadReceiptImage(receiptId, formData);

      if (uploadResult.error) {
        setUploadError(uploadResult.error);
        setUploading(false);
        return;
      }

      if (uploadResult.data) {
        const urlResult = await getReceiptImageUrl(uploadResult.data);
        if (urlResult.data) setImageUrl(urlResult.data);
      }

      setUploading(false);

      setStep("processing");
      await handleScan(receiptId);
    } catch {
      setUploadError(t.receipts.uploadFailed);
      setUploading(false);
    }
  };

  const handleScan = async (receiptId: string) => {
    setScanError(null);

    try {
      const result = await scanReceiptWithAI(receiptId);

      if (result.error) {
        setScanError(result.error);
        setStep("form");
        return;
      }

      if (result.data) {
        if (result.data.vendor_name) setVendorName(result.data.vendor_name);
        if (result.data.receipt_date) setReceiptDate(result.data.receipt_date);
        if (result.data.amount_ex_vat != null)
          setAmountExVat(String(result.data.amount_ex_vat));
        if (result.data.vat_rate != null)
          setVatRate(String(result.data.vat_rate));
        if (result.data.cost_code != null)
          applyCostCodeRules(result.data.cost_code);
        if (result.data.confidence != null)
          setConfidence(result.data.confidence);

        // Auto-save bij hoge confidence — skip het formulier
        const conf = result.data.confidence ?? 0;
        if (conf >= AUTO_SAVE_CONFIDENCE && result.data.amount_ex_vat != null && result.data.vendor_name) {
          const aiCategory = result.data.cost_code
            ? KOSTENSOORTEN.find((k) => k.code === result.data!.cost_code)?.label ?? "Overig"
            : "Overig";

          await updateReceipt(receiptId, {
            vendor_name: result.data.vendor_name,
            amount_ex_vat: result.data.amount_ex_vat,
            vat_rate: result.data.vat_rate ?? 21,
            category: aiCategory,
            cost_code: result.data.cost_code ?? null,
            receipt_date: result.data.receipt_date ?? today,
          });
          await markReceiptAiProcessed(receiptId);
          await queryClient.invalidateQueries({ queryKey: ["dashboard"] });

          setStep("done");
          return;
        }
      }
    } catch {
      setScanError(t.receipts.aiFailed);
    }

    setStep("form");
  };

  const handleSubmit = async () => {
    if (!receiptDate) {
      setError(t.receipts.dateRequiredError);
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
      business_percentage: businessPercentage,
    };

    const result = workingReceiptId
      ? await updateReceipt(workingReceiptId, input)
      : await createReceipt(input);

    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    const finalId = workingReceiptId ?? result.data?.id;
    if (finalId && imageUrl) {
      await markReceiptAiProcessed(finalId);
    }

    // Invalidate dashboard cache so the receipt count updates
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });

    if (onSaved) {
      onSaved();
    } else if (result.data) {
      router.push(`/dashboard/receipts/${result.data.id}`);
    }
  };

  const groepen = getGroepen();

  // ─── STEP 1: UPLOAD ───
  if (step === "upload") {
    return (
      <ReceiptUpload
        onFileSelected={handleFileSelect}
        onSkip={() => setStep("form")}
        uploading={uploading}
        uploadError={uploadError}
      />
    );
  }

  // ─── STEP 2: PROCESSING ───
  if (step === "processing") {
    const isPdfProcessing = !filePreview && !imageUrl;
    return <ReceiptProcessing imageUrl={imageUrl} filePreview={filePreview} isPdf={isPdfProcessing} />;
  }

  // ─── STEP 2b: DONE (auto-saved) ───
  if (step === "done") {
    const parsedAmt = parseFloat(amountExVat) || 0;
    const parsedVat = parseFloat(vatRate) || 0;
    const incVat = Math.round(parsedAmt * (1 + parsedVat / 100) * 100) / 100;
    return (
      <div style={{ maxWidth: 500 }}>
        <div
          style={{
            padding: "24px 0",
            borderBottom: "0.5px solid rgba(13,13,11,0.1)",
            marginBottom: 24,
          }}
        >
          <p
            style={{
              fontSize: "var(--text-label)",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              opacity: 0.4,
              margin: "0 0 8px",
            }}
          >
            {t.receipts.autoSaved ?? "Automatisch opgeslagen"}
          </p>
          <p
            style={{
              fontSize: "var(--text-body-lg, 18px)",
              fontWeight: 400,
              margin: 0,
            }}
          >
            {vendorName || "—"}
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
          <span style={{ fontSize: "var(--text-body-sm)", opacity: 0.5 }}>{t.receipts.dateRequired}</span>
          <span style={{ fontSize: "var(--text-mono-md)" }}>{receiptDate}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
          <span style={{ fontSize: "var(--text-body-sm)", opacity: 0.5 }}>{t.receipts.amountExVat}</span>
          <span style={{ fontSize: "var(--text-mono-md)" }}>{formatCurrency(parsedAmt)}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
          <span style={{ fontSize: "var(--text-body-sm)", opacity: 0.5 }}>{t.receipts.incVatLabel}</span>
          <span style={{ fontSize: "var(--text-mono-md)" }}>{formatCurrency(incVat)}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
          <span style={{ fontSize: "var(--text-body-sm)", opacity: 0.5 }}>{t.receipts.vatRateLabel}</span>
          <span style={{ fontSize: "var(--text-mono-md)" }}>{vatRate}%</span>
        </div>

        {costCode && (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
            <span style={{ fontSize: "var(--text-body-sm)", opacity: 0.5 }}>{t.receipts.costTypeLabel}</span>
            <span style={{ fontSize: "var(--text-mono-md)" }}>{category}</span>
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 32,
            paddingTop: 24,
            borderTop: "0.5px solid rgba(13,13,11,0.15)",
          }}
        >
          <ButtonSecondary onClick={() => setStep("form")}>
            {t.receipts.editReceipt ?? "Bewerken"}
          </ButtonSecondary>
          <ButtonPrimary
            onClick={() => {
              if (onSaved) {
                onSaved();
              } else {
                router.push("/dashboard/receipts");
              }
            }}
          >
            {t.common.done ?? "Klaar"}
          </ButtonPrimary>
        </div>
      </div>
    );
  }

  // ─── STEP 3: FORM ───
  const isPdfForm = (receipt?.storage_path?.endsWith(".pdf")) || (!filePreview && !!workingReceiptId && !imageUrl);
  const showPreviewColumn = !!imageUrl || !!filePreview || isPdfForm;

  return (
    <div
      style={
        showPreviewColumn
          ? {
              display: "grid",
              gridTemplateColumns: "250px 1fr",
              gap: 32,
              maxWidth: 800,
            }
          : { maxWidth: 600 }
      }
    >
      {showPreviewColumn && (
        <div style={{ position: "sticky", top: 80, alignSelf: "start", width: "100%" }}>
          {filePreview || (imageUrl && !receipt?.storage_path?.endsWith(".pdf")) ? (
            <div style={{ position: "relative", width: "100%", height: 400 }}>
              <Image
                src={imageUrl || filePreview || ""}
                alt={t.receipts.receipt}
                fill
                style={{
                  objectFit: "contain",
                  border: "0.5px solid rgba(13,13,11,0.15)",
                }}
                unoptimized
              />
            </div>
          ) : imageUrl ? (
            <iframe
              src={imageUrl}
              title="PDF bon"
              style={{
                width: "100%",
                height: 400,
                border: "0.5px solid rgba(13,13,11,0.15)",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: 120,
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
              PDF
            </div>
          )}
        </div>
      )}

      <div>
        {confidence !== null && (
          <p
            style={{
              fontSize: "var(--text-label)",
              fontWeight: 500,
              textTransform: "uppercase" as const,
              letterSpacing: "0.08em",
              opacity: 0.4,
              margin: "0 0 16px",
            }}
          >
            {t.receipts.aiRecognition}
          </p>
        )}

        {confidence !== null && confidence < 0.7 && (
          <ErrorMessage style={{ marginBottom: 24 }}>
            {t.receipts.lowConfidence}
          </ErrorMessage>
        )}

        {scanError && <ErrorMessage style={{ marginBottom: 24 }}>{scanError}</ErrorMessage>}
        {error && <ErrorMessage style={{ marginBottom: 24 }}>{error}</ErrorMessage>}

        <FieldGroup label={t.receipts.dateRequired}>
          <input
            type="date"
            value={receiptDate}
            onChange={(e) => setReceiptDate(e.target.value)}
            required
            className="form-input"
          />
        </FieldGroup>

        <FieldGroup label={t.receipts.vendorLabel}>
          <input
            type="text"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            placeholder={t.receipts.vendorPlaceholder}
            className="form-input"
          />
        </FieldGroup>

        <FieldGroup label={t.receipts.costTypeLabel}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              value={costCode ?? ""}
              onChange={(e) =>
                applyCostCodeRules(e.target.value ? Number(e.target.value) : null)
              }
              className="form-input"
              style={{ flex: 1 }}
            >
              <option value="">{t.receipts.selectCategory}</option>
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
                  fontSize: "var(--text-mono-sm)",
                  opacity: 0.35,
                }}
              >
                {costCode}
              </span>
            )}
          </div>
        </FieldGroup>

        <FieldGroup label={t.receipts.amountExVat}>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amountExVat}
            onChange={(e) => setAmountExVat(e.target.value)}
            placeholder="0,00"
            className="form-input"
          />
        </FieldGroup>

        <FieldGroup label={t.receipts.vatRateLabel}>
          <select
            value={vatRate}
            onChange={(e) => setVatRate(e.target.value)}
            className="form-input"
          >
            <option value="21">21%</option>
            <option value="9">9%</option>
            <option value="0">0%</option>
          </select>
        </FieldGroup>

        {autoRuleMessage && (
          <p
            style={{
              fontSize: "var(--text-body-xs)",
              opacity: 0.5,
              fontWeight: 500,
              padding: "8px 0",
              margin: "0 0 8px",
              borderTop: "0.5px solid rgba(13,13,11,0.08)",
              fontStyle: "italic",
            }}
          >
            {autoRuleMessage}
          </p>
        )}

        <FieldGroup label={t.receipts.businessPercentage}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={businessPercentage}
              onChange={(e) => setBusinessPercentage(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span
              style={{
                fontSize: "var(--text-mono-md)",
                fontWeight: 600,
                minWidth: 44,
                textAlign: "right",
              }}
            >
              {businessPercentage}%
            </span>
          </div>
          {businessPercentage < 100 && (
            <p
              style={{
                fontSize: "var(--text-body-xs)",
                opacity: 0.4,
                margin: "6px 0 0",
              }}
            >
              {t.receipts.businessSplit.replace("{business}", String(businessPercentage)).replace("{private}", String(100 - businessPercentage))}
            </p>
          )}
        </FieldGroup>

        <p
          style={{
            fontSize: "var(--text-mono-md)",
            fontWeight: 400,
            margin: "0 0 24px",
            padding: "12px 0",
            borderTop: "0.5px solid rgba(13,13,11,0.15)",
            borderBottom: "0.5px solid rgba(13,13,11,0.15)",
          }}
        >
          {t.receipts.vatLabel} {formatCurrency(computedVat)} | {t.receipts.incVatLabel}{" "}
          {formatCurrency(computedIncVat)}
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 32,
            paddingTop: 24,
            borderTop: "0.5px solid rgba(13,13,11,0.15)",
          }}
        >
          <ButtonSecondary onClick={() => router.back()}>
            {t.common.cancel}
          </ButtonSecondary>
          <ButtonPrimary onClick={handleSubmit} disabled={saving}>
            {saving ? t.common.saving : t.receipts.saveReceipt}
          </ButtonPrimary>
        </div>
      </div>
    </div>
  );
}
