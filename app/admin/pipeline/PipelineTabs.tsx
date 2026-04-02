"use client";

import { type ReactNode, Suspense } from "react";
import dynamic from "next/dynamic";
import { Tabs, useTabState } from "@/components/ui/Tabs";
import { SkeletonTable } from "@/components/ui";

const WaitlistTab = dynamic(() => import("./WaitlistTab"));

export function PipelineTabs({ children }: { children: ReactNode }) {
  const [rawTab, setActiveTab] = useTabState("pipeline");
  const activeTab = rawTab === "wachtlijst" ? "wachtlijst" : "pipeline";

  const tabs = [
    { key: "pipeline", label: "Pipeline" },
    { key: "wachtlijst", label: "Wachtlijst" },
  ];

  return (
    <div>
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "pipeline" && children}
      {activeTab === "wachtlijst" && (
        <Suspense fallback={<SkeletonTable />}>
          <WaitlistTab />
        </Suspense>
      )}
    </div>
  );
}
