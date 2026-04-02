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

function isValidTab(value: string): value is TabKey {
  return (TAB_KEYS as readonly string[]).includes(value);
}

export default function TaxPage() {
  const [rawTab, setActiveTab] = useTabState("btw");
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
