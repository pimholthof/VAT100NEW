"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Tabs, useTabState } from "@/components/ui/Tabs";
import { SkeletonTable } from "@/components/ui";

const TaxContent = dynamic(() => import("./TaxContent"));
const DocumentsTab = dynamic(() => import("../documents/page"));
const ImportTab = dynamic(() => import("../import/page"));

const TAB_KEYS = ["btw", "documenten", "importeren"] as const;
type TabKey = (typeof TAB_KEYS)[number];

// Taal-onafhankelijke aliassen → canonieke tab-key. Zie testrapport 2.5.
const TAB_ALIASES: Record<string, string> = {
  tax: "btw",
  vat: "btw",
  documents: "documenten",
  import: "importeren",
};

function isValidTab(value: string): value is TabKey {
  return (TAB_KEYS as readonly string[]).includes(value);
}

export default function TaxPage() {
  const [rawTab, setActiveTab] = useTabState("btw", "tab", TAB_ALIASES);
  const activeTab: TabKey = isValidTab(rawTab) ? rawTab : "btw";

  const tabs = [
    { key: "btw", label: "Belasting" },
    { key: "documenten", label: "Documenten" },
    { key: "importeren", label: "Importeren" },
  ];

  return (
    <div>
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <Suspense fallback={<SkeletonTable />}>
        {activeTab === "btw" && <TaxContent />}
        {activeTab === "documenten" && <DocumentsTab />}
        {activeTab === "importeren" && <ImportTab />}
      </Suspense>
    </div>
  );
}
