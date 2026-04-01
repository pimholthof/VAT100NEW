"use client";

import { useState } from "react";
import { Input, Select, ButtonSecondary } from "@/components/ui";

export interface AdminSearchFilters {
  search: string;
  status: string;
  planType: string;
  dateFrom: string;
  dateTo: string;
  revenueMin: string;
  revenueMax: string;
  activity: string;
}

const DEFAULT_FILTERS: AdminSearchFilters = {
  search: "",
  status: "all",
  planType: "all",
  dateFrom: "",
  dateTo: "",
  revenueMin: "",
  revenueMax: "",
  activity: "all",
};

interface AdminSearchPanelProps {
  filters: AdminSearchFilters;
  onFiltersChange: (filters: AdminSearchFilters) => void;
  showPlanFilter?: boolean;
  showRevenueFilter?: boolean;
  showActivityFilter?: boolean;
}

export function AdminSearchPanel({
  filters,
  onFiltersChange,
  showPlanFilter = false,
  showRevenueFilter = false,
  showActivityFilter = false,
}: AdminSearchPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const hasActiveFilters =
    filters.planType !== "all" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "" ||
    filters.revenueMin !== "" ||
    filters.revenueMax !== "" ||
    filters.activity !== "all";

  const handleReset = () => {
    onFiltersChange({ ...DEFAULT_FILTERS, search: filters.search });
  };

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Main search row */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: expanded ? 16 : 0 }}>
        <Input
          type="text"
          placeholder="Zoek op naam, studio of e-mail..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          style={{ maxWidth: 400 }}
        />
        <Select
          value={filters.status}
          onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
          style={{ maxWidth: 180 }}
        >
          <option value="all">Alle statussen</option>
          <option value="active">Actief</option>
          <option value="suspended">Geblokkeerd</option>
        </Select>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: "none",
            border: hasActiveFilters ? "1px solid #000" : "1px solid rgba(0,0,0,0.1)",
            borderRadius: 6,
            padding: "8px 16px",
            cursor: "pointer",
            fontSize: "var(--text-body-sm)",
            fontWeight: hasActiveFilters ? 600 : 400,
            whiteSpace: "nowrap",
          }}
        >
          {expanded ? "Minder filters" : "Meer filters"}{hasActiveFilters ? " \u2022" : ""}
        </button>
        {hasActiveFilters && (
          <ButtonSecondary onClick={handleReset} style={{ fontSize: "var(--text-body-sm)", padding: "6px 12px" }}>
            Reset
          </ButtonSecondary>
        )}
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            padding: 20,
            border: "0.5px solid rgba(0,0,0,0.05)",
            borderRadius: 8,
            background: "rgba(255,255,255,0.85)",
          }}
        >
          {showPlanFilter && (
            <div>
              <label className="label" style={{ display: "block", marginBottom: 4 }}>Plan</label>
              <Select
                value={filters.planType}
                onChange={(e) => onFiltersChange({ ...filters, planType: e.target.value })}
              >
                <option value="all">Alle plannen</option>
                <option value="basis">Basis</option>
                <option value="compleet">Compleet</option>
                <option value="none">Geen plan</option>
              </Select>
            </div>
          )}

          <div>
            <label className="label" style={{ display: "block", marginBottom: 4 }}>Aangemeld vanaf</label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
            />
          </div>

          <div>
            <label className="label" style={{ display: "block", marginBottom: 4 }}>Aangemeld tot</label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
            />
          </div>

          {showRevenueFilter && (
            <>
              <div>
                <label className="label" style={{ display: "block", marginBottom: 4 }}>Omzet vanaf</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.revenueMin}
                  onChange={(e) => onFiltersChange({ ...filters, revenueMin: e.target.value })}
                />
              </div>
              <div>
                <label className="label" style={{ display: "block", marginBottom: 4 }}>Omzet tot</label>
                <Input
                  type="number"
                  placeholder="999999"
                  value={filters.revenueMax}
                  onChange={(e) => onFiltersChange({ ...filters, revenueMax: e.target.value })}
                />
              </div>
            </>
          )}

          {showActivityFilter && (
            <div>
              <label className="label" style={{ display: "block", marginBottom: 4 }}>Activiteit</label>
              <Select
                value={filters.activity}
                onChange={(e) => onFiltersChange({ ...filters, activity: e.target.value })}
              >
                <option value="all">Alle</option>
                <option value="active">Actief (laatste 14 dagen)</option>
                <option value="inactive">Inactief (14+ dagen)</option>
                <option value="dormant">Slapend (30+ dagen)</option>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { DEFAULT_FILTERS };
