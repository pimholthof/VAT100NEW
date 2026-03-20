// ─── English annual account PDF template (8 pages) ───

import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { AnnualFigures, RawProfile } from "../types";
import {
  baseStyles as s,
  formatEuro,
  formatPercentage,
  CATEGORY_LABELS_EN,
} from "./shared";

interface Props {
  figures: AnnualFigures;
  profile: RawProfile;
}

function Footer({ year, tradeName, pageNum }: { year: number; tradeName: string; pageNum: number }) {
  return (
    <View style={s.footer} fixed>
      <Text>{`Annual report ${year} — ${tradeName}`}</Text>
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
        <Text style={s.coverLabel}>PRESENTED TO</Text>
        <Text style={s.coverTitle}>{name}</Text>
        <Text style={s.coverSubtitle}>Annual report {year}</Text>
        <View style={s.spacer} />
        <Text style={s.coverMeta}>{city}</Text>
        <Text style={s.coverMeta}>31 December {year}</Text>
      </View>
    </Page>
  );
}

// ─── Page 2: Table of Contents ───

function TocPage({ figures, profile }: Props) {
  const tradeName = profile.studio_name ?? profile.full_name;
  const items = [
    { label: "Compilation statement", page: 3 },
    { label: "General information", page: 3 },
    { label: "Balance sheet as at 31 December", page: 4 },
    { label: "Profit and loss statement", page: 5 },
    { label: "Notes to the balance sheet — Assets", page: 6 },
    { label: "Notes to the balance sheet — Liabilities", page: 7 },
    { label: "Notes to the profit and loss statement", page: 8 },
  ];

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionHeader}>Table of contents</Text>
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

// ─── Page 3: Compilation + General ───

function CompilationPage({ figures, profile }: Props) {
  const tradeName = profile.studio_name ?? profile.full_name;
  const year = figures.fiscalYear;
  const address = [profile.address, [profile.postal_code, profile.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionHeader}>Compilation statement</Text>

      {address && <Text style={s.bodyText}>{address}</Text>}
      <Text style={s.bodyText}>Amsterdam, 31 March {year + 1}</Text>
      <View style={s.spacer} />

      <Text style={s.bodyText}>
        In accordance with your instructions, we have compiled the annual accounts for {year} of {tradeName} based on
        the information provided by you. These annual accounts have been compiled on the basis
        of the administration and other data provided.
      </Text>

      <Text style={s.bodyText}>
        The responsibility for the accuracy and completeness of the information provided
        and the resulting annual accounts rests with the entrepreneur. We have compiled these
        annual accounts in accordance with Dutch law.
      </Text>

      <View style={s.spacer} />
      <View style={s.spacer} />

      <Text style={s.sectionHeader}>General information</Text>

      <Text style={[s.bodyText, s.bold]}>Activities</Text>
      <Text style={s.bodyText}>
        The sole proprietorship {tradeName} is based in {profile.city ?? "Amsterdam"} and
        provides creative and business services.
      </Text>

      {profile.kvk_number && (
        <>
          <Text style={[s.bodyText, s.bold]}>Chamber of Commerce number</Text>
          <Text style={s.bodyText}>{profile.kvk_number}</Text>
        </>
      )}

      {profile.btw_number && (
        <>
          <Text style={[s.bodyText, s.bold]}>VAT identification number</Text>
          <Text style={s.bodyText}>{profile.btw_number}</Text>
        </>
      )}

      <Footer year={year} tradeName={tradeName} pageNum={3} />
    </Page>
  );
}

// ─── Page 4: Balance sheet ───

function BalancePage({ figures, profile }: Props) {
  const tradeName = profile.studio_name ?? profile.full_name;
  const year = figures.fiscalYear;
  const bs = figures.balanceSheet;
  const py = figures.priorYear;

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionHeader}>Balance sheet as at 31 December {year}</Text>
      <Text style={[s.bodyText, s.muted]}>After appropriation of result</Text>
      <View style={s.spacer} />

      <View style={s.tableRow}>
        <Text style={[s.colLabel, s.bold]}>ASSETS</Text>
        <Text style={s.colYearHeader}>{year}</Text>
        {py && <Text style={s.colYearHeader}>{year - 1}</Text>}
      </View>
      <View style={s.hr} />

      <View style={s.tableRow}>
        <Text style={s.colLabel}>Fixed assets</Text>
        <Text style={s.colYear} />
        {py && <Text style={s.colYear} />}
      </View>
      <View style={s.tableRow}>
        <Text style={s.colLabelIndent}>Tangible fixed assets</Text>
        <Text style={s.colYear}>{formatEuro(bs.assets.tangibleFixed)}</Text>
        {py && <Text style={s.colYear}>{formatEuro(py.tangibleFixed)}</Text>}
      </View>

      <View style={s.spacerSmall} />
      <View style={s.tableRow}>
        <Text style={s.colLabel}>Current assets</Text>
        <Text style={s.colYear}>{formatEuro(bs.assets.currentAssets)}</Text>
        {py && <Text style={s.colYear}>—</Text>}
      </View>

      <View style={s.spacerSmall} />
      <View style={s.tableRow}>
        <Text style={s.colLabel}>Cash and cash equivalents</Text>
        <Text style={s.colYear}>{formatEuro(bs.assets.cash)}</Text>
        {py && <Text style={s.colYear}>{formatEuro(py.cash)}</Text>}
      </View>

      <View style={s.tableRowDoubleBorder}>
        <Text style={[s.colLabel, s.bold]}>Total assets</Text>
        <Text style={[s.colYear, s.bold]}>{formatEuro(bs.assets.total)}</Text>
        {py && (
          <Text style={[s.colYear, s.bold]}>
            {formatEuro(py.tangibleFixed + py.cash)}
          </Text>
        )}
      </View>

      <View style={s.spacer} />
      <View style={s.spacer} />

      <View style={s.tableRow}>
        <Text style={[s.colLabel, s.bold]}>LIABILITIES</Text>
        <Text style={s.colYearHeader}>{year}</Text>
        {py && <Text style={s.colYearHeader}>{year - 1}</Text>}
      </View>
      <View style={s.hr} />

      <View style={s.tableRow}>
        <Text style={s.colLabel}>Equity</Text>
        <Text style={s.colYear} />
        {py && <Text style={s.colYear} />}
      </View>
      <View style={s.tableRow}>
        <Text style={s.colLabelIndent}>Owner&apos;s equity</Text>
        <Text style={s.colYear}>{formatEuro(bs.liabilities.equity)}</Text>
        {py && <Text style={s.colYear}>{formatEuro(py.equity)}</Text>}
      </View>

      <View style={s.spacerSmall} />
      <View style={s.tableRow}>
        <Text style={s.colLabel}>Current liabilities</Text>
        <Text style={s.colYear} />
        {py && <Text style={s.colYear} />}
      </View>
      <View style={s.tableRow}>
        <Text style={s.colLabelIndent}>VAT payable</Text>
        <Text style={s.colYear}>{formatEuro(bs.liabilities.currentLiabilities)}</Text>
        {py && <Text style={s.colYear}>{formatEuro(py.currentLiabilities)}</Text>}
      </View>

      <View style={s.tableRowDoubleBorder}>
        <Text style={[s.colLabel, s.bold]}>Total liabilities</Text>
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

// ─── Page 5: Profit and loss ───

function ProfitLossPage({ figures, profile }: Props) {
  const tradeName = profile.studio_name ?? profile.full_name;
  const year = figures.fiscalYear;
  const py = figures.priorYear;
  let refNum = 1;

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionHeader}>Profit and loss statement {year}</Text>
      <View style={s.spacer} />

      <View style={s.tableRow}>
        <Text style={[s.colLabel, s.bold]} />
        <Text style={s.colRef}>Ref</Text>
        <Text style={s.colYearHeader}>{year}</Text>
        {py && <Text style={s.colYearHeader}>{year - 1}</Text>}
      </View>
      <View style={s.hr} />

      <View style={s.tableRow}>
        <Text style={[s.colLabel, s.bold]}>Net revenue</Text>
        <Text style={s.colRef} />
        <Text style={[s.colYear, s.bold]}>{formatEuro(figures.revenue.total)}</Text>
        {py && <Text style={[s.colYear, s.bold]}>{formatEuro(py.revenue)}</Text>}
      </View>

      <View style={s.spacerSmall} />

      <View style={s.tableRow}>
        <Text style={[s.colLabel, s.bold]}>Costs</Text>
        <Text style={s.colRef} />
        <Text style={s.colYear} />
        {py && <Text style={s.colYear} />}
      </View>

      {figures.expenses.map((exp) => (
        <View style={s.tableRow} key={exp.category}>
          <Text style={s.colLabelIndent}>
            {CATEGORY_LABELS_EN[exp.category] ?? exp.category}
          </Text>
          <Text style={s.colRef}>{refNum++}</Text>
          <Text style={s.colYear}>{formatEuro(exp.amount)}</Text>
          {py && <Text style={s.colYear} />}
        </View>
      ))}

      {figures.depreciationTotal > 0 && (
        <View style={s.tableRow}>
          <Text style={s.colLabelIndent}>Depreciation</Text>
          <Text style={s.colRef}>{refNum++}</Text>
          <Text style={s.colYear}>{formatEuro(figures.depreciationTotal)}</Text>
          {py && <Text style={s.colYear}>{formatEuro(py.depreciation)}</Text>}
        </View>
      )}

      <View style={s.tableRowBorder}>
        <Text style={s.colLabel}>Total costs</Text>
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

      <View style={s.tableRowDoubleBorder}>
        <Text style={[s.colLabel, s.bold]}>Result</Text>
        <Text style={s.colRef} />
        <Text style={[s.colYear, s.bold]}>{formatEuro(figures.result)}</Text>
        {py && <Text style={[s.colYear, s.bold]}>{formatEuro(py.result)}</Text>}
      </View>

      <Footer year={year} tradeName={tradeName} pageNum={5} />
    </Page>
  );
}

// ─── Page 6: Notes on assets ───

function NotesAssetsPage({ figures, profile }: Props) {
  const tradeName = profile.studio_name ?? profile.full_name;
  const year = figures.fiscalYear;

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionHeader}>Notes to the balance sheet — Assets</Text>

      {figures.depreciation.length > 0 && (
        <>
          <Text style={s.subHeader}>Tangible fixed assets — Movement schedule</Text>

          {figures.depreciation.map((dep) => (
            <View key={dep.description} style={{ marginBottom: 12 }}>
              <Text style={[s.bodyText, s.bold]}>{dep.description}</Text>

              <View style={s.tableRow}>
                <Text style={s.colLabel}>Acquisition cost</Text>
                <Text style={s.colAmountWide}>{formatEuro(dep.acquisitionCost)}</Text>
              </View>
              <View style={s.tableRow}>
                <Text style={s.colLabel}>Book value as at 1 January {year}</Text>
                <Text style={s.colAmountWide}>{formatEuro(dep.bookValueStart)}</Text>
              </View>
              <View style={s.tableRow}>
                <Text style={s.colLabel}>Depreciation {year}</Text>
                <Text style={s.colAmountWide}>
                  {dep.depreciationAmount > 0
                    ? `-/- ${formatEuro(dep.depreciationAmount).replace("-/- ", "")}`
                    : "—"}
                </Text>
              </View>
              <View style={s.tableRowBorder}>
                <Text style={[s.colLabel, s.bold]}>Book value as at 31 December {year}</Text>
                <Text style={[s.colAmountWide, s.bold]}>{formatEuro(dep.bookValueEnd)}</Text>
              </View>
              <View style={s.tableRow}>
                <Text style={[s.colLabel, s.muted]}>Residual value</Text>
                <Text style={[s.colAmountWide, s.muted]}>{formatEuro(dep.residualValue)}</Text>
              </View>
            </View>
          ))}

          <View style={s.spacer} />
          <Text style={s.subHeader}>Depreciation rates</Text>
          {figures.depreciation.map((dep) => (
            <View style={s.tableRow} key={dep.description}>
              <Text style={s.colLabel}>{dep.description}</Text>
              <Text style={s.colAmountWide}>{formatPercentage(dep.rate)}</Text>
            </View>
          ))}
        </>
      )}

      {figures.depreciation.length === 0 && (
        <Text style={s.bodyText}>There are no tangible fixed assets in fiscal year {year}.</Text>
      )}

      <View style={s.spacer} />
      <View style={s.spacer} />

      <Text style={s.subHeader}>Cash and cash equivalents</Text>
      {profile.iban && (
        <View style={s.tableRow}>
          <Text style={s.colLabel}>Bank account ({profile.iban})</Text>
          <Text style={s.colAmountWide}>{formatEuro(figures.balanceSheet.assets.cash)}</Text>
        </View>
      )}
      {!profile.iban && (
        <View style={s.tableRow}>
          <Text style={s.colLabel}>Bank account</Text>
          <Text style={s.colAmountWide}>{formatEuro(figures.balanceSheet.assets.cash)}</Text>
        </View>
      )}

      <Footer year={year} tradeName={tradeName} pageNum={6} />
    </Page>
  );
}

// ─── Page 7: Notes on liabilities ───

function NotesLiabilitiesPage({ figures, profile }: Props) {
  const tradeName = profile.studio_name ?? profile.full_name;
  const year = figures.fiscalYear;
  const eq = figures.equity;

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionHeader}>Notes to the balance sheet — Liabilities</Text>

      <Text style={s.subHeader}>Owner&apos;s equity</Text>

      <View style={s.tableRow}>
        <Text style={s.colLabel}>Balance as at 1 January {year}</Text>
        <Text style={s.colAmountWide}>{formatEuro(eq.openingBalance)}</Text>
      </View>
      <View style={s.tableRow}>
        <Text style={s.colLabel}>Result for the year</Text>
        <Text style={s.colAmountWide}>{formatEuro(eq.result)}</Text>
      </View>
      <View style={s.tableRow}>
        <Text style={s.colLabel}>Private withdrawals</Text>
        <Text style={s.colAmountWide}>
          {eq.privateWithdrawals > 0
            ? `-/- ${formatEuro(eq.privateWithdrawals).replace("-/- ", "")}`
            : formatEuro(eq.privateWithdrawals)}
        </Text>
      </View>
      <View style={s.tableRowDoubleBorder}>
        <Text style={[s.colLabel, s.bold]}>Balance as at 31 December {year}</Text>
        <Text style={[s.colAmountWide, s.bold]}>{formatEuro(eq.closingBalance)}</Text>
      </View>

      <View style={s.spacer} />
      <View style={s.spacer} />

      <Text style={s.subHeader}>Current liabilities</Text>
      <View style={s.tableRow}>
        <Text style={s.colLabel}>VAT payable (Q4)</Text>
        <Text style={s.colAmountWide}>
          {formatEuro(figures.balanceSheet.liabilities.currentLiabilities)}
        </Text>
      </View>

      <Footer year={year} tradeName={tradeName} pageNum={7} />
    </Page>
  );
}

// ─── Page 8: Notes on P&L ───

function NotesProfitLossPage({ figures, profile }: Props) {
  const tradeName = profile.studio_name ?? profile.full_name;
  const year = figures.fiscalYear;
  let refNum = 1;

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionHeader}>Notes to the profit and loss statement</Text>

      <Text style={s.subHeader}>Net revenue</Text>

      {figures.revenue.domestic > 0 && (
        <View style={s.tableRow}>
          <Text style={s.colLabel}>Domestic (21% VAT)</Text>
          <Text style={s.colAmountWide}>{formatEuro(figures.revenue.domestic)}</Text>
        </View>
      )}
      {figures.revenue.outsideEu > 0 && (
        <View style={s.tableRow}>
          <Text style={s.colLabel}>Outside EU (0%)</Text>
          <Text style={s.colAmountWide}>{formatEuro(figures.revenue.outsideEu)}</Text>
        </View>
      )}
      {figures.revenue.intraEu > 0 && (
        <View style={s.tableRow}>
          <Text style={s.colLabel}>Intra-EU (reverse charge)</Text>
          <Text style={s.colAmountWide}>{formatEuro(figures.revenue.intraEu)}</Text>
        </View>
      )}
      <View style={s.tableRowBorder}>
        <Text style={[s.colLabel, s.bold]}>Total net revenue</Text>
        <Text style={[s.colAmountWide, s.bold]}>{formatEuro(figures.revenue.total)}</Text>
      </View>

      <View style={s.spacer} />

      <Text style={s.subHeader}>Costs</Text>

      {figures.expenses.map((exp) => (
        <View key={exp.category} style={{ marginBottom: 4 }}>
          <View style={s.tableRow}>
            <Text style={s.colLabel}>
              {CATEGORY_LABELS_EN[exp.category] ?? exp.category}
            </Text>
            <Text style={s.colRef}>{refNum++}</Text>
            <Text style={s.colAmountWide}>{formatEuro(exp.amount)}</Text>
          </View>
        </View>
      ))}

      {figures.depreciationTotal > 0 && (
        <View style={s.tableRow}>
          <Text style={s.colLabel}>Depreciation of tangible fixed assets</Text>
          <Text style={s.colRef}>{refNum++}</Text>
          <Text style={s.colAmountWide}>{formatEuro(figures.depreciationTotal)}</Text>
        </View>
      )}

      <View style={s.tableRowBorder}>
        <Text style={[s.colLabel, s.bold]}>Total costs</Text>
        <Text style={s.colRef} />
        <Text style={[s.colAmountWide, s.bold]}>
          {formatEuro(figures.expensesTotal + figures.depreciationTotal)}
        </Text>
      </View>

      <View style={s.spacer} />
      <View style={s.spacer} />

      <Text style={s.subHeader}>VAT overview</Text>

      <View style={s.tableRow}>
        <Text style={[s.colLabel, s.bold]}>Period</Text>
        <Text style={[s.colYear, s.bold]}>Output VAT</Text>
        <Text style={[s.colYear, s.bold]}>Input VAT</Text>
        <Text style={[s.colYear, s.bold]}>Balance</Text>
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
        <Text style={[s.colLabel, s.bold]}>Total {year}</Text>
        <Text style={[s.colYear, s.bold]}>{formatEuro(figures.vat.totalCharged)}</Text>
        <Text style={[s.colYear, s.bold]}>{formatEuro(figures.vat.totalInput)}</Text>
        <Text style={[s.colYear, s.bold]}>{formatEuro(figures.vat.totalBalance)}</Text>
      </View>

      <Footer year={year} tradeName={tradeName} pageNum={8} />
    </Page>
  );
}

// ─── Main template ───

export function AnnualAccountPdfEN({ figures, profile }: Props) {
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
