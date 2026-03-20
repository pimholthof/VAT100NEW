// ─── Dutch annual account PDF template (8 pages) ───

import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { AnnualFigures, RawProfile } from "../types";
import {
  baseStyles as s,
  formatEuro,
  formatPercentage,
  CATEGORY_LABELS_NL,
} from "./shared";

interface Props {
  figures: AnnualFigures;
  profile: RawProfile;
}

function Footer({ year, tradeName, pageNum }: { year: number; tradeName: string; pageNum: number }) {
  return (
    <View style={s.footer} fixed>
      <Text>{`Jaarbericht ${year} van ${tradeName}`}</Text>
      <Text>{pageNum}</Text>
    </View>
  );
}

// ─── Page 1: Cover ───

function CoverPage({ figures, profile }: Props) {
  const name = profile.full_name;
  const year = figures.fiscalYear;
  const city = profile.city ?? "Amsterdam";

  return (
    <Page size="A4" style={s.page}>
      <View style={s.coverContainer}>
        <Text style={s.coverLabel}>UITGEBRACHT AAN</Text>
        <Text style={s.coverTitle}>{name}</Text>
        <Text style={s.coverSubtitle}>Inzake jaarbericht {year}</Text>
        <View style={s.spacer} />
        <Text style={s.coverMeta}>{city}</Text>
        <Text style={s.coverMeta}>31 december {year}</Text>
      </View>
    </Page>
  );
}

// ─── Page 2: Table of Contents ───

function TocPage({ figures, profile }: Props) {
  const tradeName = profile.studio_name ?? profile.full_name;
  const items = [
    { label: "Samenstellingsverklaring", page: 3 },
    { label: "Algemeen", page: 3 },
    { label: "Balans per 31 december", page: 4 },
    { label: "Winst-en-verliesrekening", page: 5 },
    { label: "Toelichting op de balans — Activa", page: 6 },
    { label: "Toelichting op de balans — Passiva", page: 7 },
    { label: "Toelichting op de winst-en-verliesrekening", page: 8 },
  ];

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionHeader}>Inhoudsopgave</Text>
      <View style={s.spacer} />
      {items.map((item) => (
        <View style={s.tocRow} key={item.label}>
          <Text style={s.tocLabel}>{item.label}</Text>
          <Text style={s.tocPage}>{item.page}</Text>
        </View>
      ))}
      <Footer year={figures.fiscalYear} tradeName={tradeName} pageNum={2} />
    </Page>
  );
}

// ─── Page 3: Samenstellingsverklaring + Algemeen ───

function CompilationPage({ figures, profile }: Props) {
  const tradeName = profile.studio_name ?? profile.full_name;
  const year = figures.fiscalYear;
  const address = [profile.address, [profile.postal_code, profile.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionHeader}>Samenstellingsverklaring</Text>

      {address && <Text style={s.bodyText}>{address}</Text>}
      <Text style={s.bodyText}>Amsterdam, 31 maart {year + 1}</Text>
      <View style={s.spacer} />

      <Text style={s.bodyText}>
        Overeenkomstig uw opdracht hebben wij de jaarrekening {year} van {tradeName} te {profile.city ?? "Amsterdam"} samengesteld
        op basis van de door u verstrekte gegevens. Deze jaarrekening is samengesteld op basis
        van de door u aangeleverde administratie en overige gegevens.
      </Text>

      <Text style={s.bodyText}>
        De verantwoordelijkheid voor de juistheid en de volledigheid van de verstrekte gegevens
        en de daarop gebaseerde jaarrekening berust bij de ondernemer. Wij hebben deze
        jaarrekening samengesteld in overeenstemming met Nederlands recht.
      </Text>

      <View style={s.spacer} />
      <View style={s.spacer} />

      <Text style={s.sectionHeader}>Algemeen</Text>

      <Text style={[s.bodyText, s.bold]}>Activiteiten</Text>
      <Text style={s.bodyText}>
        De eenmanszaak {tradeName} is gevestigd te {profile.city ?? "Amsterdam"} en richt zich
        op het verlenen van creatieve en zakelijke diensten.
      </Text>

      {profile.kvk_number && (
        <>
          <Text style={[s.bodyText, s.bold]}>KvK-nummer</Text>
          <Text style={s.bodyText}>{profile.kvk_number}</Text>
        </>
      )}

      {profile.btw_number && (
        <>
          <Text style={[s.bodyText, s.bold]}>BTW-identificatienummer</Text>
          <Text style={s.bodyText}>{profile.btw_number}</Text>
        </>
      )}

      <Footer year={year} tradeName={tradeName} pageNum={3} />
    </Page>
  );
}

// ─── Page 4: Balans ───

function BalancePage({ figures, profile }: Props) {
  const tradeName = profile.studio_name ?? profile.full_name;
  const year = figures.fiscalYear;
  const bs = figures.balanceSheet;
  const py = figures.priorYear;

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionHeader}>Balans per 31 december {year}</Text>
      <Text style={[s.bodyText, s.muted]}>Na resultaatbestemming</Text>
      <View style={s.spacer} />

      {/* Column headers */}
      <View style={s.tableRow}>
        <Text style={[s.colLabel, s.bold]}>ACTIVA</Text>
        <Text style={s.colYearHeader}>{year}</Text>
        {py && <Text style={s.colYearHeader}>{year - 1}</Text>}
      </View>
      <View style={s.hr} />

      <View style={s.tableRow}>
        <Text style={s.colLabel}>Vaste activa</Text>
        <Text style={s.colYear} />
        {py && <Text style={s.colYear} />}
      </View>
      <View style={s.tableRow}>
        <Text style={s.colLabelIndent}>Materiële vaste activa</Text>
        <Text style={s.colYear}>{formatEuro(bs.assets.tangibleFixed)}</Text>
        {py && <Text style={s.colYear}>{formatEuro(py.tangibleFixed)}</Text>}
      </View>

      <View style={s.spacerSmall} />
      <View style={s.tableRow}>
        <Text style={s.colLabel}>Vlottende activa</Text>
        <Text style={s.colYear}>{formatEuro(bs.assets.currentAssets)}</Text>
        {py && <Text style={s.colYear}>—</Text>}
      </View>

      <View style={s.spacerSmall} />
      <View style={s.tableRow}>
        <Text style={s.colLabel}>Liquide middelen</Text>
        <Text style={s.colYear}>{formatEuro(bs.assets.cash)}</Text>
        {py && <Text style={s.colYear}>{formatEuro(py.cash)}</Text>}
      </View>

      <View style={s.tableRowDoubleBorder}>
        <Text style={[s.colLabel, s.bold]}>Totaal activa</Text>
        <Text style={[s.colYear, s.bold]}>{formatEuro(bs.assets.total)}</Text>
        {py && (
          <Text style={[s.colYear, s.bold]}>
            {formatEuro(py.tangibleFixed + py.cash)}
          </Text>
        )}
      </View>

      <View style={s.spacer} />
      <View style={s.spacer} />

      {/* Passiva */}
      <View style={s.tableRow}>
        <Text style={[s.colLabel, s.bold]}>PASSIVA</Text>
        <Text style={s.colYearHeader}>{year}</Text>
        {py && <Text style={s.colYearHeader}>{year - 1}</Text>}
      </View>
      <View style={s.hr} />

      <View style={s.tableRow}>
        <Text style={s.colLabel}>Eigen vermogen</Text>
        <Text style={s.colYear} />
        {py && <Text style={s.colYear} />}
      </View>
      <View style={s.tableRow}>
        <Text style={s.colLabelIndent}>Ondernemingsvermogen</Text>
        <Text style={s.colYear}>{formatEuro(bs.liabilities.equity)}</Text>
        {py && <Text style={s.colYear}>{formatEuro(py.equity)}</Text>}
      </View>

      <View style={s.spacerSmall} />
      <View style={s.tableRow}>
        <Text style={s.colLabel}>Kortlopende schulden</Text>
        <Text style={s.colYear} />
        {py && <Text style={s.colYear} />}
      </View>
      <View style={s.tableRow}>
        <Text style={s.colLabelIndent}>Omzetbelasting</Text>
        <Text style={s.colYear}>{formatEuro(bs.liabilities.currentLiabilities)}</Text>
        {py && <Text style={s.colYear}>{formatEuro(py.currentLiabilities)}</Text>}
      </View>

      <View style={s.tableRowDoubleBorder}>
        <Text style={[s.colLabel, s.bold]}>Totaal passiva</Text>
        <Text style={[s.colYear, s.bold]}>{formatEuro(bs.liabilities.total)}</Text>
        {py && (
          <Text style={[s.colYear, s.bold]}>
            {formatEuro(py.equity + py.currentLiabilities)}
          </Text>
        )}
      </View>

      <Footer year={year} tradeName={tradeName} pageNum={4} />
    </Page>
  );
}

// ─── Page 5: Winst-en-verliesrekening ───

function ProfitLossPage({ figures, profile }: Props) {
  const tradeName = profile.studio_name ?? profile.full_name;
  const year = figures.fiscalYear;
  const py = figures.priorYear;
  let refNum = 1;

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionHeader}>Winst-en-verliesrekening {year}</Text>
      <View style={s.spacer} />

      {/* Header */}
      <View style={s.tableRow}>
        <Text style={[s.colLabel, s.bold]} />
        <Text style={s.colRef}>Ref</Text>
        <Text style={s.colYearHeader}>{year}</Text>
        {py && <Text style={s.colYearHeader}>{year - 1}</Text>}
      </View>
      <View style={s.hr} />

      {/* Revenue */}
      <View style={s.tableRow}>
        <Text style={[s.colLabel, s.bold]}>Netto-omzet</Text>
        <Text style={s.colRef} />
        <Text style={[s.colYear, s.bold]}>{formatEuro(figures.revenue.total)}</Text>
        {py && <Text style={[s.colYear, s.bold]}>{formatEuro(py.revenue)}</Text>}
      </View>

      <View style={s.spacerSmall} />

      {/* Expenses */}
      <View style={s.tableRow}>
        <Text style={[s.colLabel, s.bold]}>Kosten</Text>
        <Text style={s.colRef} />
        <Text style={s.colYear} />
        {py && <Text style={s.colYear} />}
      </View>

      {figures.expenses.map((exp) => (
        <View style={s.tableRow} key={exp.category}>
          <Text style={s.colLabelIndent}>
            {CATEGORY_LABELS_NL[exp.category] ?? exp.category}
          </Text>
          <Text style={s.colRef}>{refNum++}</Text>
          <Text style={s.colYear}>{formatEuro(exp.amount)}</Text>
          {py && <Text style={s.colYear} />}
        </View>
      ))}

      {figures.depreciationTotal > 0 && (
        <View style={s.tableRow}>
          <Text style={s.colLabelIndent}>Afschrijvingen</Text>
          <Text style={s.colRef}>{refNum++}</Text>
          <Text style={s.colYear}>{formatEuro(figures.depreciationTotal)}</Text>
          {py && <Text style={s.colYear}>{formatEuro(py.depreciation)}</Text>}
        </View>
      )}

      <View style={s.tableRowBorder}>
        <Text style={s.colLabel}>Totaal kosten</Text>
        <Text style={s.colRef} />
        <Text style={s.colYear}>
          {formatEuro(figures.expensesTotal + figures.depreciationTotal)}
        </Text>
        {py && (
          <Text style={s.colYear}>
            {formatEuro(py.expenses + py.depreciation)}
          </Text>
        )}
      </View>

      <View style={s.spacerSmall} />

      {/* Result */}
      <View style={s.tableRowDoubleBorder}>
        <Text style={[s.colLabel, s.bold]}>Resultaat</Text>
        <Text style={s.colRef} />
        <Text style={[s.colYear, s.bold]}>{formatEuro(figures.result)}</Text>
        {py && <Text style={[s.colYear, s.bold]}>{formatEuro(py.result)}</Text>}
      </View>

      <Footer year={year} tradeName={tradeName} pageNum={5} />
    </Page>
  );
}

// ─── Page 6: Toelichting activa ───

function NotesAssetsPage({ figures, profile }: Props) {
  const tradeName = profile.studio_name ?? profile.full_name;
  const year = figures.fiscalYear;

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionHeader}>Toelichting op de balans — Activa</Text>

      {/* MVA Mutatiestaat */}
      {figures.depreciation.length > 0 && (
        <>
          <Text style={s.subHeader}>Materiële vaste activa — Mutatiestaat</Text>

          {figures.depreciation.map((dep) => (
            <View key={dep.description} style={{ marginBottom: 12 }}>
              <Text style={[s.bodyText, s.bold]}>{dep.description}</Text>

              <View style={s.tableRow}>
                <Text style={s.colLabel}>Aanschafwaarde</Text>
                <Text style={s.colAmountWide}>{formatEuro(dep.acquisitionCost)}</Text>
              </View>
              <View style={s.tableRow}>
                <Text style={s.colLabel}>Boekwaarde per 1 januari {year}</Text>
                <Text style={s.colAmountWide}>{formatEuro(dep.bookValueStart)}</Text>
              </View>
              <View style={s.tableRow}>
                <Text style={s.colLabel}>Afschrijving {year}</Text>
                <Text style={s.colAmountWide}>
                  {dep.depreciationAmount > 0
                    ? `-/- ${formatEuro(dep.depreciationAmount).replace("-/- ", "")}`
                    : "—"}
                </Text>
              </View>
              <View style={s.tableRowBorder}>
                <Text style={[s.colLabel, s.bold]}>Boekwaarde per 31 december {year}</Text>
                <Text style={[s.colAmountWide, s.bold]}>{formatEuro(dep.bookValueEnd)}</Text>
              </View>
              <View style={s.tableRow}>
                <Text style={[s.colLabel, s.muted]}>Restwaarde</Text>
                <Text style={[s.colAmountWide, s.muted]}>{formatEuro(dep.residualValue)}</Text>
              </View>
            </View>
          ))}

          <View style={s.spacer} />
          <Text style={s.subHeader}>Afschrijvingspercentages</Text>
          {figures.depreciation.map((dep) => (
            <View style={s.tableRow} key={dep.description}>
              <Text style={s.colLabel}>{dep.description}</Text>
              <Text style={s.colAmountWide}>{formatPercentage(dep.rate)}</Text>
            </View>
          ))}
        </>
      )}

      {figures.depreciation.length === 0 && (
        <Text style={s.bodyText}>Er zijn geen materiële vaste activa in het boekjaar {year}.</Text>
      )}

      <View style={s.spacer} />
      <View style={s.spacer} />

      {/* Liquide middelen */}
      <Text style={s.subHeader}>Liquide middelen</Text>
      {profile.iban && (
        <View style={s.tableRow}>
          <Text style={s.colLabel}>Bankrekening ({profile.iban})</Text>
          <Text style={s.colAmountWide}>{formatEuro(figures.balanceSheet.assets.cash)}</Text>
        </View>
      )}
      {!profile.iban && (
        <View style={s.tableRow}>
          <Text style={s.colLabel}>Bankrekening</Text>
          <Text style={s.colAmountWide}>{formatEuro(figures.balanceSheet.assets.cash)}</Text>
        </View>
      )}

      <Footer year={year} tradeName={tradeName} pageNum={6} />
    </Page>
  );
}

// ─── Page 7: Toelichting passiva ───

function NotesLiabilitiesPage({ figures, profile }: Props) {
  const tradeName = profile.studio_name ?? profile.full_name;
  const year = figures.fiscalYear;
  const eq = figures.equity;

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionHeader}>Toelichting op de balans — Passiva</Text>

      {/* Ondernemingsvermogen */}
      <Text style={s.subHeader}>Ondernemingsvermogen</Text>

      <View style={s.tableRow}>
        <Text style={s.colLabel}>Stand per 1 januari {year}</Text>
        <Text style={s.colAmountWide}>{formatEuro(eq.openingBalance)}</Text>
      </View>
      <View style={s.tableRow}>
        <Text style={s.colLabel}>Resultaat boekjaar</Text>
        <Text style={s.colAmountWide}>{formatEuro(eq.result)}</Text>
      </View>
      <View style={s.tableRow}>
        <Text style={s.colLabel}>Privé-opnamen</Text>
        <Text style={s.colAmountWide}>
          {eq.privateWithdrawals > 0
            ? `-/- ${formatEuro(eq.privateWithdrawals).replace("-/- ", "")}`
            : formatEuro(eq.privateWithdrawals)}
        </Text>
      </View>
      <View style={s.tableRowDoubleBorder}>
        <Text style={[s.colLabel, s.bold]}>Stand per 31 december {year}</Text>
        <Text style={[s.colAmountWide, s.bold]}>{formatEuro(eq.closingBalance)}</Text>
      </View>

      <View style={s.spacer} />
      <View style={s.spacer} />

      {/* Kortlopende schulden */}
      <Text style={s.subHeader}>Kortlopende schulden</Text>
      <View style={s.tableRow}>
        <Text style={s.colLabel}>Omzetbelasting (4e kwartaal)</Text>
        <Text style={s.colAmountWide}>
          {formatEuro(figures.balanceSheet.liabilities.currentLiabilities)}
        </Text>
      </View>

      <Footer year={year} tradeName={tradeName} pageNum={7} />
    </Page>
  );
}

// ─── Page 8: Toelichting W&V ───

function NotesProfitLossPage({ figures, profile }: Props) {
  const tradeName = profile.studio_name ?? profile.full_name;
  const year = figures.fiscalYear;
  let refNum = 1;

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionHeader}>Toelichting op de winst-en-verliesrekening</Text>

      {/* Omzetspecificatie */}
      <Text style={s.subHeader}>Netto-omzet</Text>

      {figures.revenue.domestic > 0 && (
        <View style={s.tableRow}>
          <Text style={s.colLabel}>Binnenland (21% BTW)</Text>
          <Text style={s.colAmountWide}>{formatEuro(figures.revenue.domestic)}</Text>
        </View>
      )}
      {figures.revenue.outsideEu > 0 && (
        <View style={s.tableRow}>
          <Text style={s.colLabel}>Buiten EU (0%)</Text>
          <Text style={s.colAmountWide}>{formatEuro(figures.revenue.outsideEu)}</Text>
        </View>
      )}
      {figures.revenue.intraEu > 0 && (
        <View style={s.tableRow}>
          <Text style={s.colLabel}>Binnen EU (ICP verlegd)</Text>
          <Text style={s.colAmountWide}>{formatEuro(figures.revenue.intraEu)}</Text>
        </View>
      )}
      <View style={s.tableRowBorder}>
        <Text style={[s.colLabel, s.bold]}>Totaal netto-omzet</Text>
        <Text style={[s.colAmountWide, s.bold]}>{formatEuro(figures.revenue.total)}</Text>
      </View>

      <View style={s.spacer} />

      {/* Kostenspecificatie */}
      <Text style={s.subHeader}>Kosten</Text>

      {figures.expenses.map((exp) => (
        <View key={exp.category} style={{ marginBottom: 4 }}>
          <View style={s.tableRow}>
            <Text style={s.colLabel}>
              {CATEGORY_LABELS_NL[exp.category] ?? exp.category}
            </Text>
            <Text style={s.colRef}>{refNum++}</Text>
            <Text style={s.colAmountWide}>{formatEuro(exp.amount)}</Text>
          </View>
        </View>
      ))}

      {figures.depreciationTotal > 0 && (
        <View style={s.tableRow}>
          <Text style={s.colLabel}>Afschrijvingen materiële vaste activa</Text>
          <Text style={s.colRef}>{refNum++}</Text>
          <Text style={s.colAmountWide}>{formatEuro(figures.depreciationTotal)}</Text>
        </View>
      )}

      <View style={s.tableRowBorder}>
        <Text style={[s.colLabel, s.bold]}>Totaal kosten</Text>
        <Text style={s.colRef} />
        <Text style={[s.colAmountWide, s.bold]}>
          {formatEuro(figures.expensesTotal + figures.depreciationTotal)}
        </Text>
      </View>

      <View style={s.spacer} />
      <View style={s.spacer} />

      {/* BTW-overzicht */}
      <Text style={s.subHeader}>Omzetbelasting</Text>

      <View style={s.tableRow}>
        <Text style={[s.colLabel, s.bold]}>Periode</Text>
        <Text style={[s.colYear, s.bold]}>Af te dragen</Text>
        <Text style={[s.colYear, s.bold]}>Voorbelasting</Text>
        <Text style={[s.colYear, s.bold]}>Saldo</Text>
      </View>
      <View style={s.hr} />

      {figures.vat.quarters.map((q) => (
        <View style={s.tableRow} key={q.period}>
          <Text style={s.colLabel}>{q.period}</Text>
          <Text style={s.colYear}>{formatEuro(q.charged)}</Text>
          <Text style={s.colYear}>{formatEuro(q.input)}</Text>
          <Text style={s.colYear}>{formatEuro(q.balance)}</Text>
        </View>
      ))}

      <View style={s.tableRowDoubleBorder}>
        <Text style={[s.colLabel, s.bold]}>Totaal {year}</Text>
        <Text style={[s.colYear, s.bold]}>{formatEuro(figures.vat.totalCharged)}</Text>
        <Text style={[s.colYear, s.bold]}>{formatEuro(figures.vat.totalInput)}</Text>
        <Text style={[s.colYear, s.bold]}>{formatEuro(figures.vat.totalBalance)}</Text>
      </View>

      <Footer year={year} tradeName={tradeName} pageNum={8} />
    </Page>
  );
}

// ─── Main template ───

export function AnnualAccountPdfNL({ figures, profile }: Props) {
  return (
    <Document>
      <CoverPage figures={figures} profile={profile} />
      <TocPage figures={figures} profile={profile} />
      <CompilationPage figures={figures} profile={profile} />
      <BalancePage figures={figures} profile={profile} />
      <ProfitLossPage figures={figures} profile={profile} />
      <NotesAssetsPage figures={figures} profile={profile} />
      <NotesLiabilitiesPage figures={figures} profile={profile} />
      <NotesProfitLossPage figures={figures} profile={profile} />
    </Document>
  );
}
