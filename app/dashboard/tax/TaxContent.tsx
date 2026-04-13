"use client";

import { useQuery } from "@tanstack/react-query";
import { getBtwOverview, getTaxProjection } from "@/features/tax/actions";
import { getDashboardData } from "@/features/dashboard/actions";
import { TAX_CONSTANTS } from "@/lib/tax/dutch-tax-2026";
import { InkomstenBelastingSection } from "./components/InkomstenBelastingSection";
import { BtwSection } from "./components/BtwSection";
import { OverzichtSection } from "./components/OverzichtSection";

export default function TaxContent() {
  const { data: btwResult, isLoading: btwLoading } = useQuery({
    queryKey: ["btw-overview"],
    queryFn: () => getBtwOverview(),
  });

  const { data: taxResult, isLoading: taxLoading } = useQuery({
    queryKey: ["tax-projection"],
    queryFn: () => getTaxProjection(),
  });

  const { data: dashResult } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
  });

  const quarters = btwResult?.data ?? [];
  const projection = taxResult?.data ?? null;
  const vatDeadline = dashResult?.data?.vatDeadline;

  const now = new Date();
  const isLoading = btwLoading || taxLoading;

  return (
    <div>
      {/* ══ HEADER ══ */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "end",
        borderBottom: "1px solid var(--color-black)",
        paddingBottom: 20,
        marginBottom: "var(--space-xl)",
      }}>
        <div>
          <p className="label" style={{ margin: "0 0 8px" }}>Fiscaal overzicht {now.getFullYear()}</p>
          <h1 className="display-title">Belasting</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/api/export/btw" download className="btn-secondary">Download lijst</a>
          <a href="/dashboard/tax/opening-balance" className="btn-secondary">Openingsbalans</a>
        </div>
      </div>

      {/* Inkomstenbelasting */}
      <InkomstenBelastingSection projection={projection} isLoading={isLoading} />

      {/* Editorial breaker */}
      <div style={{
        margin: "var(--space-xl) 0",
        height: 200,
        borderRadius: "var(--radius)",
        overflow: "hidden",
        position: "relative",
      }}>
        <img
          src="/images/office-walnut.png"
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 40%",
            opacity: 0.12,
            filter: "grayscale(100%)",
          }}
        />
      </div>

      {/* BTW + ICP */}
      <BtwSection
        quarters={quarters}
        vatDeadline={vatDeadline}
        isLoading={btwLoading}
        year={now.getFullYear()}
      />

      {/* Voorlopige aanslagen */}
      <OverzichtSection year={now.getFullYear()} />

      {/* Editorial breaker */}
      <div style={{
        margin: "var(--space-xl) 0",
        height: 160,
        borderRadius: "var(--radius)",
        overflow: "hidden",
      }}>
        <img
          src="/images/office-corridor.png"
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 60%",
            opacity: 0.09,
            filter: "grayscale(100%)",
          }}
        />
      </div>

      {/* Disclaimer */}
      <div style={{
        padding: "20px 0",
        marginTop: "var(--space-section)",
        borderTop: "0.5px solid rgba(0,0,0,0.06)",
        fontSize: 11,
        fontWeight: 400,
        lineHeight: 1.6,
        opacity: 0.4,
      }}>
        Dit is een schatting op basis van je facturen en bonnetjes.
        Doe je officiële BTW-aangifte via de Belastingdienst.
        Bewaar je administratie minimaal 7 jaar.
        Berekeningen op basis van belastingtarieven {TAX_CONSTANTS.year}.
      </div>
    </div>
  );
}
