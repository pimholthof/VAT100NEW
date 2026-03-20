import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getAnnualAccount } from "@/lib/actions/annual-account";
import { AnnualAccountDetail } from "@/components/jaarrekening/AnnualAccountDetail";

interface Props {
  params: Promise<{ year: string }>;
}

function JaarrekeningSkeleton() {
  return (
    <div className="animate-pulse" style={{ maxWidth: 560 }}>
      <div
        style={{ height: 28, width: 240, background: "var(--vat-pale-grey)", marginBottom: 32 }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div style={{ height: 14, width: 80, background: "var(--vat-pale-grey)" }} />
            <div style={{ height: 14, width: 100, background: "var(--vat-pale-grey)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

async function JaarrekeningContent({ year }: { year: number }) {
  const result = await getAnnualAccount(year);
  const account = result.data ?? null;

  return <AnnualAccountDetail fiscalYear={year} initialAccount={account} />;
}

export default async function JaarrekeningPage({ params }: Props) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);

  if (isNaN(year) || year < 2020 || year > new Date().getFullYear()) {
    notFound();
  }

  return (
    <div style={{ padding: "32px 0" }}>
      <Suspense fallback={<JaarrekeningSkeleton />}>
        <JaarrekeningContent year={year} />
      </Suspense>
    </div>
  );
}
