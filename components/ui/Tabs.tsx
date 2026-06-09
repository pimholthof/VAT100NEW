"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

interface Tab {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="tabs-bar" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={activeTab === tab.key}
          className={`tabs-item${activeTab === tab.key ? " tabs-item--active" : ""}`}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Hook that syncs active tab with URL search param `?tab=...`.
 *
 * `aliases` mapt taal-onafhankelijke sleutels (bijv. het Engelse `assets`) naar
 * de canonieke tab-key (`activa`), zodat gedeelde links en bladwijzers blijven
 * werken ongeacht de UI-taal. Onbekende waarden vallen veilig terug op de
 * default via de `isValidTab`-check in de aanroepende pagina.
 */
export function useTabState(
  defaultTab: string,
  paramName = "tab",
  aliases?: Record<string, string>,
) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const raw = searchParams.get(paramName);
  const activeTab = raw ? aliases?.[raw] ?? raw : defaultTab;

  const setActiveTab = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (key === defaultTab) {
        params.delete(paramName);
      } else {
        params.set(paramName, key);
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, router, pathname, defaultTab, paramName],
  );

  return [activeTab, setActiveTab] as const;
}
