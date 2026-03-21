"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getReceipts, deleteReceipt } from "@/lib/actions/receipts";
import { getKostensoortByCode } from "@/lib/constants/costs";
import type { Receipt } from "@/lib/types";
import { Th, Td, SkeletonTable } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

export default function ReceiptsPage() {
  const queryClient = useQueryClient();

  const { data: result, isLoading } = useQuery({
    queryKey: ["receipts"],
    queryFn: () => getReceipts(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReceipt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
    },
  });

  const receipts = result?.data ?? [];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="display-title">Bonnen</h1>
            <p className="page-header-count">
              {receipts.length} {receipts.length === 1 ? "bon" : "bonnen"}
            </p>
          </div>
          <Link
            href="/dashboard/receipts/new"
            className="action-button-secondary"
          >
            + Nieuwe bon
          </Link>
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable
          columns="24px 1fr 2fr 1fr 1fr 1fr 1fr 80px"
          headerWidths={[10, 60, 80, 70, 60, 50, 50, 40]}
          bodyWidths={[10, 50, 70, 60, 50, 40, 40, 30]}
        />
      ) : receipts.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[var(--color-muted)] text-[15px] mb-4">
            Nog geen bonnen — voeg je eerste bon toe
          </p>
          <Link
            href="/dashboard/receipts/new"
            className="inline-block font-sans text-[length:var(--text-label)] font-semibold uppercase tracking-[0.10em] px-7 py-3.5 border-[0.5px] border-foreground/25 bg-transparent text-foreground no-underline transition-opacity duration-200 hover:opacity-70"
          >
            + Eerste bon toevoegen
          </Link>
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-[0.5px] border-foreground/15 text-left">
              <Th className="w-[24px]"></Th>
              <Th>Datum</Th>
              <Th>Leverancier</Th>
              <Th>Kostensoort</Th>
              <Th className="text-right">Excl. BTW</Th>
              <Th className="text-right">BTW</Th>
              <Th className="text-right">Incl. BTW</Th>
              <Th className="text-right">Acties</Th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((receipt: Receipt) => {
              const kostensoort = receipt.cost_code
                ? getKostensoortByCode(receipt.cost_code)
                : null;

              return (
                <tr
                  key={receipt.id}
                  className="border-b border-[var(--border-rule)]"
                >
                  <Td className="w-[24px] text-center opacity-30">
                    {receipt.storage_path ? "◉" : ""}
                  </Td>
                  <Td>
                    <span className="mono-amount">
                      {receipt.receipt_date
                        ? formatDate(receipt.receipt_date)
                        : "—"}
                    </span>
                  </Td>
                  <Td className="font-normal">
                    {receipt.vendor_name ?? "—"}
                  </Td>
                  <Td>
                    {kostensoort
                      ? kostensoort.label
                      : (receipt.category ?? "—")}
                  </Td>
                  <Td className="text-right">
                    <span className="mono-amount">
                      {receipt.amount_ex_vat != null
                        ? formatCurrency(receipt.amount_ex_vat)
                        : "—"}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <span className="mono-amount">
                      {receipt.vat_amount != null
                        ? formatCurrency(receipt.vat_amount)
                        : "—"}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <span className="mono-amount">
                      {receipt.amount_inc_vat != null
                        ? formatCurrency(receipt.amount_inc_vat)
                        : "—"}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <div className="flex gap-3 justify-end">
                      <Link
                        href={`/dashboard/receipts/${receipt.id}`}
                        className="table-action"
                      >
                        Bekijk
                      </Link>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              "Weet je zeker dat je deze bon wilt verwijderen?",
                            )
                          ) {
                            deleteMutation.mutate(receipt.id);
                          }
                        }}
                        className="table-action bg-transparent border-none cursor-pointer opacity-30 p-0"
                      >
                        Verwijder
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
