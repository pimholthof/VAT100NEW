"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useLocale } from "@/lib/i18n/context";
import { Tabs, useTabState } from "@/components/ui/Tabs";
import { SkeletonTable } from "@/components/ui";

const ReceiptsTab = dynamic(() => import("./ReceiptsTab"));
const BankTab = dynamic(() => import("./BankTab"));
const AssetsTab = dynamic(() => import("./AssetsTab"));
const HoursTab = dynamic(() => import("./HoursTab"));
const TripsTab = dynamic(() => import("./TripsTab"));

const TAB_KEYS = ["bonnen", "bank", "activa", "uren", "ritten"] as const;
type TabKey = (typeof TAB_KEYS)[number];

function isValidTab(value: string): value is TabKey {
  return (TAB_KEYS as readonly string[]).includes(value);
}

export default function ExpensesPage() {
  const { t } = useLocale();
  const [rawTab, setActiveTab] = useTabState("bonnen");
  const activeTab: TabKey = isValidTab(rawTab) ? rawTab : "bonnen";

  const tabs = [
    { key: "bonnen", label: t.expenses.receipts },
    { key: "bank", label: t.expenses.bank },
    { key: "activa", label: t.nav.assets },
    { key: "uren", label: t.nav.hours },
    { key: "ritten", label: t.nav.trips },
  ];

  return (
    <div>
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <Suspense fallback={<SkeletonTable />}>
        {activeTab === "bonnen" && <ReceiptsTab />}
        {activeTab === "bank" && <BankTab />}
        {activeTab === "activa" && <AssetsTab />}
        {activeTab === "uren" && <HoursTab />}
        {activeTab === "ritten" && <TripsTab />}
      </Suspense>
    </div>
  );
}
