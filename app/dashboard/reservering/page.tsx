"use client";

import { useQuery } from "@tanstack/react-query";
import { getBtwOverview } from "@/lib/actions/tax";
import { getDashboardData } from "@/lib/actions/dashboard";
import { formatCurrency } from "@/lib/format";
import { ErrorMessage } from "@/components/ui";

export default function ReserveringPage() {
  const { data: btwResult, isLoading: btwLoading } = useQuery({
    queryKey: ["btw-overview"],
    queryFn: () => getBtwOverview(),
  });

  const { data: dashResult, isLoading: dashLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
  });

  const isLoading = btwLoading || dashLoading;

  if (isLoading) {
    return (
      <div>
        <h1 className="display-title m-0 mb-[80px]">
          Reserveringspot
        </h1>
        <div className="skeleton h-[120px] mb-6" />
        <div className="skeleton h-[120px] mb-6" />
        <div className="skeleton h-[200px]" />
      </div>
    );
  }

  if (btwResult?.error || dashResult?.error) {
    return (
      <div>
        <h1 className="display-title m-0 mb-[80px]">
          Reserveringspot
        </h1>
        <ErrorMessage>{btwResult?.error ?? dashResult?.error}</ErrorMessage>
      </div>
    );
  }

  const quarters = btwResult?.data ?? [];
  const safeToSpend = dashResult?.data?.safeToSpend;

  const totalVatReserved = safeToSpend?.estimatedVat ?? 0;
  const totalIbReserved = safeToSpend?.estimatedIncomeTax ?? 0;
  const totalReserved = safeToSpend?.reservedTotal ?? 0;
  const freeToSpend = safeToSpend?.safeToSpend ?? 0;
  const bankBalance = safeToSpend?.currentBalance ?? 0;

  return (
    <div>
      <h1 className="display-title m-0 mb-4">
        Reserveringspot
      </h1>
      <p className="label mb-[80px] opacity-40">
        Overzicht van gereserveerde en vrij besteedbare bedragen
      </p>

      {/* Totaaloverzicht */}
      <div className="grid grid-cols-3 mb-16">
        <div className="py-6 border-t-2 border-t-foreground">
          <p className="label m-0 mb-3 opacity-40">
            Banksaldo
          </p>
          <p className="m-0 font-mono text-2xl font-semibold">
            {formatCurrency(bankBalance)}
          </p>
        </div>
        <div className="py-6 border-t-2 border-t-[var(--color-reserved)]">
          <p className="label m-0 mb-3 opacity-40">
            Totaal gereserveerd
          </p>
          <p className="m-0 font-mono text-2xl font-semibold text-[var(--color-reserved)]">
            {formatCurrency(totalReserved)}
          </p>
        </div>
        <div className="py-6 border-t-2 border-t-[var(--color-safe)]">
          <p className="label m-0 mb-3 opacity-40">
            Vrij te besteden
          </p>
          <p className="m-0 font-mono text-2xl font-semibold text-[var(--color-safe)]">
            {formatCurrency(freeToSpend)}
          </p>
        </div>
      </div>

      {/* BTW-pot & IB-pot */}
      <div className="grid grid-cols-2 gap-8 mb-16">
        <div className="border-t border-foreground/15 pt-6">
          <p className="label-strong m-0 mb-6">
            BTW-pot
          </p>
          <p className="m-0 mb-2 font-mono text-xl font-semibold">
            {formatCurrency(totalVatReserved)}
          </p>
          <p className="label m-0 opacity-40">
            Output-BTW minus input-BTW dit jaar
          </p>
        </div>

        <div className="border-t border-foreground/15 pt-6">
          <p className="label-strong m-0 mb-6">
            IB-pot
          </p>
          <p className="m-0 mb-2 font-mono text-xl font-semibold">
            {formatCurrency(totalIbReserved)}
          </p>
          <p className="label m-0 opacity-40">
            Geschatte inkomstenbelasting op basis van jaaromzet
          </p>
        </div>
      </div>

      {/* BTW per kwartaal */}
      <div className="border-t border-foreground/15 pt-6">
        <p className="label-strong m-0 mb-6">
          BTW per kwartaal
        </p>

        {quarters.length === 0 ? (
          <p className="label opacity-40">
            Nog geen kwartaalgegevens beschikbaar.
          </p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="label text-left py-2 border-b border-foreground/15 opacity-40">Kwartaal</th>
                <th className="label text-right py-2 border-b border-foreground/15 opacity-40">Output-BTW</th>
                <th className="label text-right py-2 border-b border-foreground/15 opacity-40">Input-BTW</th>
                <th className="label text-right py-2 border-b border-foreground/15 opacity-40">Netto BTW</th>
              </tr>
            </thead>
            <tbody>
              {quarters.map((q) => (
                <tr key={q.quarter}>
                  <td className="py-2.5 border-b border-foreground/5 font-mono text-[13px]">
                    {q.quarter}
                  </td>
                  <td className="py-2.5 border-b border-foreground/5 text-right font-mono text-[13px]">
                    {formatCurrency(q.outputVat)}
                  </td>
                  <td className="py-2.5 border-b border-foreground/5 text-right font-mono text-[13px]">
                    {formatCurrency(q.inputVat)}
                  </td>
                  <td className="py-2.5 border-b border-foreground/5 text-right font-mono text-[13px] font-semibold">
                    {formatCurrency(q.netVat)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="label mt-12 opacity-30 max-w-[520px]">
        Deze bedragen zijn schattingen op basis van je huidige facturen en kosten. Raadpleeg je boekhouder voor definitieve aangiftes.
      </p>
    </div>
  );
}
