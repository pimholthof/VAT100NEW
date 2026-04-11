"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminGlobalSearch } from "@/features/admin/actions/users";
import type { AdminSearchResult } from "@/features/admin/actions/users";

const TYPE_LABELS: Record<string, string> = {
  user: "Gebruiker",
  lead: "Lead",
  invoice: "Factuur",
  waitlist: "Wachtlijst",
};

export function AdminGlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const resetSearch = useCallback(() => {
    setQuery("");
    setResults([]);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      resetSearch();
    }
  }, [open, resetSearch]);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      const result = await adminGlobalSearch(value);
      if (result.data) setResults(result.data);
      setIsLoading(false);
    }, 300);
  }, []);

  function handleSelect(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;

  // Group results by type
  const grouped = results.reduce<Record<string, AdminSearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <div className="admin-search-overlay" onClick={() => setOpen(false)}>
      <div className="admin-search-modal" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Zoek gebruikers, leads, facturen..."
          className="admin-search-input"
        />
        <div className="admin-search-results">
          {query.trim().length < 2 && (
            <div className="admin-search-empty">
              Typ minimaal 2 tekens om te zoeken
            </div>
          )}
          {query.trim().length >= 2 && isLoading && (
            <div className="admin-search-empty">Zoeken...</div>
          )}
          {query.trim().length >= 2 && !isLoading && results.length === 0 && (
            <div className="admin-search-empty">Geen resultaten gevonden</div>
          )}
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type}>
              <div className="admin-search-group-label">
                {TYPE_LABELS[type] ?? type}
              </div>
              {items.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="admin-search-item"
                  onClick={() => handleSelect(item.href)}
                >
                  <div>
                    <div className="admin-search-item-label">{item.label}</div>
                    {item.sub && (
                      <div className="admin-search-item-sub">{item.sub}</div>
                    )}
                  </div>
                  <span className="admin-search-item-type">
                    {TYPE_LABELS[item.type]}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
