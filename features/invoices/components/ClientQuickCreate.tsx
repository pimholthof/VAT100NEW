"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createNewClient } from "@/features/clients/actions";
import { useInvoiceStore } from "@/lib/store/invoice";
import {
  ButtonPrimary,
  ButtonSecondary,
} from "@/components/ui";
import type { KvkSearchResult } from "@/app/api/kvk/search/route";

const quickLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "var(--text-label)",
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 8,
  opacity: 0.4,
};

interface ClientQuickCreateProps {
  onClose: () => void;
}

export function ClientQuickCreate({ onClose }: ClientQuickCreateProps) {
  const queryClient = useQueryClient();
  const setClientId = useInvoiceStore((s) => s.setClientId);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [kvkNumber, setKvkNumber] = useState("");
  const [btwNumber, setBtwNumber] = useState("");

  // KVK search state
  const [kvkQuery, setKvkQuery] = useState("");
  const [kvkResults, setKvkResults] = useState<KvkSearchResult[]>([]);
  const [kvkSearching, setKvkSearching] = useState(false);
  const [kvkError, setKvkError] = useState<string | null>(null);
  const [showKvkResults, setShowKvkResults] = useState(false);
  const kvkDropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        kvkDropdownRef.current &&
        !kvkDropdownRef.current.contains(e.target as Node)
      ) {
        setShowKvkResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchKvk = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setKvkResults([]);
      setShowKvkResults(false);
      return;
    }

    setKvkSearching(true);
    setKvkError(null);

    try {
      const res = await fetch(
        `/api/kvk/search?q=${encodeURIComponent(query.trim())}`
      );
      const data = await res.json();

      if (!res.ok) {
        setKvkError(data.error || "Zoeken mislukt");
        setKvkResults([]);
      } else {
        setKvkResults(data.results ?? []);
        setShowKvkResults(true);
      }
    } catch {
      setKvkError("Verbinding met KVK mislukt");
      setKvkResults([]);
    } finally {
      setKvkSearching(false);
    }
  }, []);

  const handleKvkQueryChange = (value: string) => {
    setKvkQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => searchKvk(value), 400);
    } else {
      setKvkResults([]);
      setShowKvkResults(false);
    }
  };

  const selectKvkResult = (result: KvkSearchResult) => {
    setName(result.handelsnaam);
    setKvkNumber(result.kvkNummer);

    if (result.straatnaam) {
      const fullAddress = result.huisnummer
        ? `${result.straatnaam} ${result.huisnummer}`
        : result.straatnaam;
      setAddress(fullAddress);
    }
    if (result.postcode) setPostalCode(result.postcode);
    if (result.plaats) setCity(result.plaats);

    setKvkQuery("");
    setKvkResults([]);
    setShowKvkResults(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setErrorMsg(null);
    const result = await createNewClient({
      name: name.trim(),
      contact_name: null,
      email: email.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      postal_code: postalCode.trim() || null,
      kvk_number: kvkNumber.trim() || null,
      btw_number: btwNumber.trim() || null,
    });
    if (result.error) {
      setErrorMsg(result.error);
    } else if (result.data) {
      setClientId(result.data.id);
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      onClose();
    }
  };

  return (
    <div
      style={{
        borderTop: "0.5px solid rgba(13,13,11,0.08)",
        borderBottom: "0.5px solid rgba(13,13,11,0.08)",
        padding: "20px 0",
        marginBottom: 24,
      }}
    >
      <p
        style={{
          fontSize: "var(--text-label)",
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          margin: "0 0 16px",
          opacity: 0.4,
        }}
      >
        Nieuwe klant aanmaken
      </p>

      {/* KVK Search */}
      <div
        ref={kvkDropdownRef}
        style={{ position: "relative", marginBottom: 16 }}
      >
        <label style={quickLabelStyle}>KVK zoeken</label>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            value={kvkQuery}
            onChange={(e) => handleKvkQueryChange(e.target.value)}
            placeholder="Zoek op bedrijfsnaam of KVK-nummer"
            className="form-input"
            style={{ paddingRight: 40 }}
          />
          {kvkSearching && (
            <span
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 12,
                opacity: 0.3,
              }}
            >
              ···
            </span>
          )}
        </div>

        {kvkError && (
          <p
            style={{
              fontSize: 12,
              opacity: 0.5,
              marginTop: 4,
            }}
          >
            {kvkError}
          </p>
        )}

        {showKvkResults && kvkResults.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 50,
              background: "var(--background)",
              border: "0.5px solid rgba(0,0,0,0.1)",
              borderRadius: 8,
              boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
              maxHeight: 280,
              overflowY: "auto",
              marginTop: 4,
            }}
          >
            {kvkResults.map((result) => (
              <button
                key={result.kvkNummer + result.handelsnaam}
                type="button"
                onClick={() => selectKvkResult(result)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "12px 16px",
                  background: "none",
                  border: "none",
                  borderBottom: "0.5px solid rgba(0,0,0,0.05)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(0,0,0,0.02)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "none")
                }
              >
                <span
                  style={{
                    display: "block",
                    fontWeight: 500,
                    fontSize: 14,
                    lineHeight: 1.3,
                  }}
                >
                  {result.handelsnaam}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 12,
                    opacity: 0.4,
                    marginTop: 2,
                  }}
                >
                  KVK {result.kvkNummer}
                  {result.plaats && ` · ${result.plaats}`}
                </span>
              </button>
            ))}
          </div>
        )}

        {showKvkResults && kvkResults.length === 0 && !kvkSearching && kvkQuery.trim().length >= 2 && !kvkError && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 50,
              background: "var(--background)",
              border: "0.5px solid rgba(0,0,0,0.1)",
              borderRadius: 8,
              boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
              padding: "12px 16px",
              marginTop: 4,
              fontSize: 13,
              opacity: 0.5,
            }}
          >
            Geen resultaten gevonden
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={quickLabelStyle}>Bedrijfsnaam *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bedrijfsnaam"
            className="form-input"
          />
        </div>
        <div>
          <label style={quickLabelStyle}>KVK-nummer</label>
          <input
            type="text"
            value={kvkNumber}
            onChange={(e) => setKvkNumber(e.target.value)}
            placeholder="12345678"
            className="form-input"
          />
        </div>
        <div>
          <label style={quickLabelStyle}>BTW-nummer</label>
          <input
            type="text"
            value={btwNumber}
            onChange={(e) => setBtwNumber(e.target.value)}
            placeholder="NL123456789B01"
            className="form-input"
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={quickLabelStyle}>E-mailadres</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@voorbeeld.nl"
            className="form-input"
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={quickLabelStyle}>Adres</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Straatnaam en huisnummer"
            className="form-input"
          />
        </div>
        <div>
          <label style={quickLabelStyle}>Postcode</label>
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="1234 AB"
            className="form-input"
          />
        </div>
        <div>
          <label style={quickLabelStyle}>Stad</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Stad"
            className="form-input"
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <ButtonPrimary type="button" onClick={handleCreate}>
          Klant aanmaken
        </ButtonPrimary>
        <ButtonSecondary
          type="button"
          onClick={onClose}
          style={{ opacity: 0.4 }}
        >
          Annuleer
        </ButtonSecondary>
      </div>
      {errorMsg && (
        <p style={{ color: "var(--foreground)", opacity: 0.8, marginTop: 12, fontSize: "var(--text-body-sm)" }}>
          Fout: {errorMsg}
        </p>
      )}
    </div>
  );
}
