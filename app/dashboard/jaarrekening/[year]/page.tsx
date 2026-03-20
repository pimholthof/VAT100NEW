import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getAnnualAccount } from "@/lib/actions/annual-account";
import { AnnualAccountDetail } from "@/components/jaarrekening/AnnualAccountDetail";

interface Props {
  params: Promise<{ year: string }>;
}

function JaarrekeningSkeleton() {
  return (
    <div className="animate-pulse max-w-[560px]">
      <div className="h-7 w-60 bg-[var(--vat-pale-grey)] mb-8" />
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between">
            <div className="h-3.5 w-20 bg-[var(--vat-pale-grey)]" />
            <div className="h-3.5 w-[100px] bg-[var(--vat-pale-grey)]" />
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
    <div className="py-8">
      <Suspense fallback={<JaarrekeningSkeleton />}>
        <JaarrekeningContent year={year} />
      </Suspense>
    </div>
  );
}
