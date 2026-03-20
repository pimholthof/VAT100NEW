"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
  getDocumentUrl,
} from "@/lib/actions/documents";
import type { Document } from "@/lib/types";
import { Th, Td, SkeletonTable } from "@/components/ui";
import { formatDate } from "@/lib/format";

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileTypeLabel(type: string | null): string {
  if (!type) return "—";
  if (type.includes("pdf")) return "PDF";
  if (type.includes("image")) return "Afbeelding";
  if (type.includes("word") || type.includes("document")) return "Word";
  if (type.includes("sheet") || type.includes("excel")) return "Excel";
  if (type.includes("csv")) return "CSV";
  return "Bestand";
}

export default function DocumentenPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: result, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => getDocuments(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const documents = result?.data ?? [];

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", file.name);

    const res = await uploadDocument(formData);

    if (res.error) {
      setUploadError(res.error);
    } else {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDownload(doc: Document) {
    const res = await getDocumentUrl(doc.id);
    if (res.error || !res.data) {
      alert(res.error ?? "Kon download-link niet ophalen.");
      return;
    }
    window.open(res.data, "_blank");
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="display-title">Documenten</h1>
            <p className="page-header-count">
              {documents.length} {documents.length === 1 ? "document" : "documenten"}
            </p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              style={{ display: "none" }}
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv"
            />
            <button
              className="action-button-secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "UPLOADEN..." : "+ Upload document"}
            </button>
          </div>
        </div>
      </div>

      {uploadError && (
        <p style={{ color: "var(--color-reserved)", fontSize: 12, marginBottom: 16 }}>
          {uploadError}
        </p>
      )}

      {isLoading ? (
        <SkeletonTable
          columns="2fr 1fr 1fr 1fr 80px"
          headerWidths={[80, 50, 60, 50, 40]}
          bodyWidths={[70, 40, 50, 40, 30]}
        />
      ) : documents.length === 0 ? (
        <div>
          <p className="empty-state">Nog geen documenten</p>
          <button
            className="table-action"
            style={{ opacity: 0.4 }}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload je eerste document
          </button>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)", textAlign: "left" }}>
              <Th>Naam</Th>
              <Th>Type</Th>
              <Th>Datum</Th>
              <Th style={{ textAlign: "right" }}>Grootte</Th>
              <Th style={{ textAlign: "right" }}>Acties</Th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc: Document) => (
              <tr key={doc.id} style={{ borderBottom: "var(--border-rule)" }}>
                <Td style={{ fontWeight: 400 }}>{doc.name}</Td>
                <Td>{fileTypeLabel(doc.file_type)}</Td>
                <Td>
                  <span className="mono-amount">{formatDate(doc.created_at)}</span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span className="mono-amount">{formatFileSize(doc.file_size)}</span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="table-action"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      Download
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Weet je zeker dat je dit document wilt verwijderen?")) {
                          deleteMutation.mutate(doc.id);
                        }
                      }}
                      className="table-action"
                      style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.3, padding: 0 }}
                    >
                      Verwijder
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
