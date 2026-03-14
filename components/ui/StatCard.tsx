import React from "react";

export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="border-0 border-t border-t-foreground/15 py-6">
      <p className="font-body text-[10px] font-medium tracking-[0.02em] m-0 mb-2 opacity-60">
        {label}
      </p>
      <p className="font-display text-[2.5rem] font-black leading-none m-0">
        {value}
      </p>
      {sub && (
        <p className="font-body text-[11px] font-normal mt-2 mb-0 opacity-50">
          {sub}
        </p>
      )}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="border-0 border-t border-t-foreground/15 py-6 opacity-12">
      <div className="skeleton w-3/5 h-[9px] mb-3" />
      <div className="skeleton w-4/5 h-8" />
    </div>
  );
}
