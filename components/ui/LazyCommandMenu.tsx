"use client";

import dynamic from "next/dynamic";

const CommandMenu = dynamic(
  () => import("@/components/ui/CommandMenu").then((m) => m.CommandMenu),
  { ssr: false }
);

export function LazyCommandMenu() {
  return <CommandMenu />;
}
