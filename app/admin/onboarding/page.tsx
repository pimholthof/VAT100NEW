"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getOnboardingOverview } from "@/features/onboarding/actions";
import { PageHeader, TableWrapper, Th, Td, SkeletonTable } from "@/components/ui";
import { formatDate } from "@/lib/format";

export default function AdminOnboardingPage() {
  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-onboarding"],
    queryFn: () => getOnboardingOverview(),
  });

  const items = result?.data ?? [];

  return (
    <div>
      <PageHeader title="Onboarding" backHref="/admin" backLabel="Beheer" />

      <p style={{ fontSize: "var(--text-body-md)", opacity: 0.5, maxWidth: 500, marginBottom: 32, lineHeight: 1.6 }}>
        Overzicht van klanten die hun account nog aan het inrichten zijn.
      </p>

      {isLoading ? (
        <SkeletonTable columns="2fr 2fr 1fr 1fr" rows={5} headerWidths={[60, 70, 50, 50]} bodyWidths={[50, 60, 40, 40]} />
      ) : items.length === 0 ? (
        <p className="empty-state">Geen actieve onboarding trajecten</p>
      ) : (
        <TableWrapper>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>Naam</Th>
                <Th>E-mail</Th>
                <Th>Voortgang</Th>
                <Th>Aangemeld</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const pct = item.totalTasks > 0 ? Math.round((item.completedTasks / item.totalTasks) * 100) : 0;
                return (
                  <tr key={item.userId}>
                    <Td>
                      <Link
                        href={`/admin/customers/${item.userId}`}
                        style={{ textDecoration: "none", color: "var(--foreground)", fontWeight: 500 }}
                      >
                        {item.fullName || "Naamloos"}
                        {item.studioName && (
                          <span className="label" style={{ display: "block", marginTop: 2, fontWeight: 400 }}>
                            {item.studioName}
                          </span>
                        )}
                      </Link>
                    </Td>
                    <Td style={{ fontSize: "var(--text-body-sm)" }}>{item.email}</Td>
                    <Td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 60,
                          height: 4,
                          background: "rgba(0,0,0,0.06)",
                          borderRadius: 2,
                          overflow: "hidden",
                        }}>
                          <div style={{
                            width: `${pct}%`,
                            height: "100%",
                            background: pct === 100 ? "var(--color-success)" : "var(--color-black)",
                            borderRadius: 2,
                            transition: "width 0.3s ease",
                          }} />
                        </div>
                        <span className="label" style={{ fontVariantNumeric: "tabular-nums" }}>
                          {item.completedTasks} / {item.totalTasks}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <span className="label">{formatDate(item.createdAt)}</span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrapper>
      )}
    </div>
  );
}
