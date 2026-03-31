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
    <div style={{
      display: "flex",
      gap: 12,
      alignItems: "center",
      marginBottom: 28,
      flexWrap: "wrap",
    }}>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={placeholder}
        className="input-field"
        style={{
          flex: 1,
          minWidth: 200,
          maxWidth: 400,
        }}
      />
      {filters.map((filter) => (
        <select
          key={filter.key}
          value={filterValues[filter.key] ?? ""}
          onChange={(e) => handleFilterChange(filter.key, e.target.value)}
          style={{
            padding: "10px 16px",
            border: "1px solid rgba(0, 0, 0, 0.10)",
            borderRadius: 8,
            background: "rgba(0, 0, 0, 0.015)",
            color: "var(--foreground)",
            fontSize: 12,
            fontWeight: 500,
            outline: "none",
            cursor: "pointer",
            minWidth: 140,
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
