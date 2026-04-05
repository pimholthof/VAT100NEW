"use client";

import { type ReactNode } from "react";
import { Tabs, useTabState } from "@/components/ui/Tabs";

export function SysteemTabs({ children }: { children: [ReactNode, ReactNode, ReactNode] }) {
  const [rawTab, setActiveTab] = useTabState("status");
  const activeTab = rawTab === "instellingen" ? "instellingen" : rawTab === "audit" ? "audit" : "status";

  const tabs = [
    { key: "status", label: "Status" },
    { key: "instellingen", label: "Instellingen" },
    { key: "audit", label: "Audit Log" },
  ];

  return (
    <div>
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === "status" && children[0]}
      {activeTab === "instellingen" && children[1]}
      {activeTab === "audit" && children[2]}
    </div>
  );
}
