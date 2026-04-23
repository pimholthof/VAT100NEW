"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export interface RecentNavItem {
  path: string;
  label: string;
  visitedAt: number;
}

const STORAGE_KEY = "vat100-recent-nav";
const MAX_RECENT = 5;

const LABEL_RULES: Array<{ match: RegExp; label: string }> = [
  { match: /^\/dashboard\/?$/, label: "Dashboard" },
  { match: /^\/dashboard\/invoices\/new$/, label: "Nieuwe factuur" },
  { match: /^\/dashboard\/invoices\/?$/, label: "Facturen" },
  { match: /^\/dashboard\/invoices\/[^/]+\/preview$/, label: "Factuur voorbeeld" },
  { match: /^\/dashboard\/invoices\/[^/]+$/, label: "Factuur bewerken" },
  { match: /^\/dashboard\/clients\/new$/, label: "Nieuwe klant" },
  { match: /^\/dashboard\/clients\/?$/, label: "Klanten" },
  { match: /^\/dashboard\/clients\/[^/]+$/, label: "Klantdetails" },
  { match: /^\/dashboard\/tax\/?$/, label: "BTW & belasting" },
  { match: /^\/dashboard\/tax\/suppletie$/, label: "Suppletie" },
  { match: /^\/dashboard\/receipts\/new$/, label: "Nieuwe bon" },
  { match: /^\/dashboard\/expenses\/?$/, label: "Bonnen & kosten" },
  { match: /^\/dashboard\/quotes\/?$/, label: "Offertes" },
  { match: /^\/dashboard\/bank\/?$/, label: "Bank" },
  { match: /^\/dashboard\/report\/?$/, label: "Rapporten" },
  { match: /^\/dashboard\/berichten\/?$/, label: "Berichten" },
  { match: /^\/dashboard\/settings/, label: "Instellingen" },
  { match: /^\/dashboard\/ai-assistant$/, label: "AI assistent" },
];

function labelFor(path: string): string | null {
  for (const rule of LABEL_RULES) {
    if (rule.match.test(path)) return rule.label;
  }
  return null;
}

function loadInitial(): RecentNavItem[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as RecentNavItem[]) : [];
  } catch {
    return [];
  }
}

let store: RecentNavItem[] = loadInitial();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return store;
}

function getServerSnapshot() {
  return [] as RecentNavItem[];
}

function recordVisit(path: string, label: string) {
  const existing = store[0];
  if (existing?.path === path) return;
  store = [
    { path, label, visitedAt: Date.now() },
    ...store.filter((r) => r.path !== path),
  ].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota errors
  }
  listeners.forEach((l) => l());
}

export function useRecentNav(): RecentNavItem[] {
  const pathname = usePathname();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!pathname) return;
    const label = labelFor(pathname);
    if (!label) return;
    recordVisit(pathname, label);
  }, [pathname]);

  return snapshot.filter((r) => r.path !== pathname);
}
