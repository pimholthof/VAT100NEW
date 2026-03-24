"use client";

import { useState, useEffect } from "react";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

interface SearchFilterProps {
  placeholder?: string;
  filters?: FilterConfig[];
  onSearch: (query: string) => void;
  onFilterChange?: (filters: Record<string, string>) => void;
}

export function SearchFilter({
  placeholder = "Zoeken...",
  filters = [],
  onSearch,
  onFilterChange,
}: SearchFilterProps) {
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => onSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search, onSearch]);

  function handleFilterChange(key: string, value: string) {
    const next = { ...filterValues, [key]: value };
    setFilterValues(next);
    onFilterChange?.(next);
  }

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-end", marginBottom: 32, flexWrap: "wrap" }}>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          minWidth: 200,
          maxWidth: 400,
          padding: "14px 0",
          border: "none",
          borderBottom: "0.5px solid rgba(13,13,11,0.15)",
          background: "transparent",
          color: "var(--foreground)",
          fontSize: "var(--text-mono-md)",
          fontWeight: 300,
          outline: "none",
        }}
      />
      {filters.map((filter) => (
        <select
          key={filter.key}
          value={filterValues[filter.key] ?? ""}
          onChange={(e) => handleFilterChange(filter.key, e.target.value)}
          style={{
            padding: "14px 0",
            border: "none",
            borderBottom: "0.5px solid rgba(13,13,11,0.15)",
            background: "transparent",
            color: "var(--foreground)",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 300,
            outline: "none",
            cursor: "pointer",
            minWidth: 120,
          }}
        >
          <option value="">{filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}
