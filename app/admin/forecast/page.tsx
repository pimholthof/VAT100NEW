import { getForecasts } from "@/features/admin/actions/forecasts";
import { StatCard } from "@/components/ui/StatCard";
import { AdminStatePanel } from "../AdminStatePanel";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export default async function ForecastPage() {
  const result = await getForecasts();

  if (result.error || !result.data) {
    return (
      <AdminStatePanel
        eyebrow="Prognose"
        title="Prognosedata kon niet worden geladen"
        description={result.error ?? "Onbekende fout"}
        actions={[{ href: "/admin", label: "Terug naar Command Center", variant: "secondary" }]}
      />
    );
  }

  const forecast = result.data;
  const maxMrr = Math.max(...forecast.mrrTrend.map((m) => m.mrr), 1);

  return (
    <div className="admin-layout">
      {/* ─── Hero ─── */}
      <section className="admin-hero">
        <div className="admin-hero-copy">
          <p className="label">Prognose &amp; Forecasting</p>
          <h1 className="admin-hero-title">Waar staan we over 90 dagen?</h1>
          <p className="admin-hero-description">
            Vooruitkijkende projecties op basis van historische trends. MRR, klantgroei, churn,
            pipeline en cashflow — alles geprojecteerd.
          </p>
        </div>
      </section>

      {/* ─── Headline KPI's ─── */}
      <div className="admin-stat-grid">
        <StatCard
          label="Geprojecteerde MRR"
          value={formatCurrency(forecast.mrrTrend[forecast.mrrTrend.length - 1]?.mrr ?? 0)}
          numericValue={forecast.mrrTrend[forecast.mrrTrend.length - 1]?.mrr ?? 0}
          sub="Over 3 maanden"
          compact
        />
        <StatCard
          label="Geprojecteerde ARR"
          value={formatCurrency(forecast.projectedArrIn3Months)}
          numericValue={forecast.projectedArrIn3Months}
          sub="Op basis van MRR-trend"
          compact
        />
        <StatCard
          label="Verwachte nieuwe klanten"
          value={String(forecast.projectedNewCustomersNext3Months)}
          numericValue={forecast.projectedNewCustomersNext3Months}
          isCurrency={false}
          sub="Komende 3 maanden"
          compact
        />
        <StatCard
          label="Verwacht churn-verlies"
          value={formatCurrency(forecast.projectedChurnMrr)}
          numericValue={forecast.projectedChurnMrr}
          sub={`${forecast.projectedChurnedCustomersNext3Months} klanten (3 mnd)`}
          compact
        />
      </div>

      {/* ─── MRR Trendlijn + Projectie ─── */}
      <section className="admin-panel admin-section">
        <div className="admin-panel-header">
          <div>
            <p className="label">MRR Projectie</p>
            <h2 className="admin-panel-title">Omzettrend + vooruitblik</h2>
            <p className="admin-panel-description">
              6 maanden historisch (vast) + 3 maanden geprojecteerd (gestreept)
            </p>
          </div>
        </div>
        <div className="admin-mrr-trend">
          {forecast.mrrTrend.map((month) => (
            <div key={month.month} className="admin-mrr-trend-col">
              <div className="admin-mrr-trend-bar-wrap">
                <div
                  className={`admin-mrr-trend-bar ${month.isProjected ? "admin-mrr-trend-bar-projected" : ""}`}
                  style={{ height: `${Math.max((month.mrr / maxMrr) * 100, 4)}%` }}
                />
              </div>
              <span className="admin-mrr-trend-amount">{formatCurrency(month.mrr)}</span>
              <span className="admin-mrr-trend-label">{month.month}</span>
              {month.isProjected && (
                <span className="admin-mrr-trend-sub" style={{ color: "var(--color-info)" }}>prognose</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── Groei vs Churn Balans ─── */}
      <div className="admin-section-grid">
        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <p className="label">Groei</p>
              <h2 className="admin-panel-title">Verwachte klantgroei</h2>
            </div>
          </div>
          <div className="admin-growth-stats">
            <div className="admin-growth-stat-row">
              <span className="label">Huidige klanten</span>
              <span className="mono-amount">{forecast.currentTotalCustomers}</span>
            </div>
            <div className="admin-growth-stat-row">
              <span className="label">Gem. nieuwe klanten/maand</span>
              <span className="mono-amount">{forecast.monthlyGrowthRate}</span>
            </div>
            <div className="admin-growth-stat-row">
              <span className="label">Verwacht nieuw (3 mnd)</span>
              <span className="mono-amount" style={{ fontWeight: 600 }}>
                +{forecast.projectedNewCustomersNext3Months}
              </span>
            </div>
            <div className="admin-growth-stat-row">
              <span className="label">Verwacht eind jaar</span>
              <span className="mono-amount" style={{ fontWeight: 600 }}>
                {forecast.projectedTotalCustomersEoy}
              </span>
            </div>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <p className="label">Churn</p>
              <h2 className="admin-panel-title">Verwacht verloop</h2>
            </div>
          </div>
          <div className="admin-growth-stats">
            <div className="admin-growth-stat-row">
              <span className="label">Verwachte churn rate</span>
              <span className="mono-amount" style={{ color: forecast.projectedChurnRate > 5 ? "var(--color-accent)" : undefined }}>
                {forecast.projectedChurnRate}%
              </span>
            </div>
            <div className="admin-growth-stat-row">
              <span className="label">Verwacht verlies (3 mnd)</span>
              <span className="mono-amount" style={{ color: "var(--color-accent)" }}>
                -{forecast.projectedChurnedCustomersNext3Months} klanten
              </span>
            </div>
            <div className="admin-growth-stat-row">
              <span className="label">MRR-verlies (3 mnd)</span>
              <span className="mono-amount" style={{ color: "var(--color-accent)", fontWeight: 600 }}>
                -{formatCurrency(forecast.projectedChurnMrr)}
              </span>
            </div>
            <div className="admin-growth-stat-row" style={{ borderTop: "0.5px solid rgba(0,0,0,0.08)", paddingTop: 16, marginTop: 8 }}>
              <span className="label" style={{ fontWeight: 600 }}>Netto groei (3 mnd)</span>
              <span className="mono-amount" style={{
                fontWeight: 600,
                color: (forecast.projectedNewCustomersNext3Months - forecast.projectedChurnedCustomersNext3Months) >= 0
                  ? "var(--color-success)" : "var(--color-accent)",
              }}>
                {forecast.projectedNewCustomersNext3Months - forecast.projectedChurnedCustomersNext3Months >= 0 ? "+" : ""}
                {forecast.projectedNewCustomersNext3Months - forecast.projectedChurnedCustomersNext3Months} klanten
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* ─── Pipeline Forecast ─── */}
      <section className="admin-panel admin-section">
        <div className="admin-panel-header">
          <div>
            <p className="label">Pipeline</p>
            <h2 className="admin-panel-title">Gewogen pipeline-prognose</h2>
            <p className="admin-panel-description">
              Verwachte nieuwe MRR uit pipeline: {formatCurrency(forecast.expectedNewMrr)}
            </p>
          </div>
        </div>
        {forecast.pipelineForecast.length === 0 ? (
          <div className="admin-empty-state">Geen actieve leads in de pipeline.</div>
        ) : (
          <div className="admin-cohort-table">
            <div className="admin-cohort-header">
              <span>Stage</span>
              <span>Leads</span>
              <span>Conversie%</span>
              <span>Verwacht</span>
              <span>MRR</span>
            </div>
            {forecast.pipelineForecast.map((stage) => (
              <div key={stage.stage} className="admin-cohort-row">
                <span className="admin-cohort-label">{stage.stage}</span>
                <span className="mono-amount">{stage.leads}</span>
                <span className="mono-amount">{stage.conversionPct}%</span>
                <span className="mono-amount">{stage.expectedCustomers}</span>
                <span className="mono-amount" style={{ fontWeight: 500 }}>
                  {formatCurrency(stage.expectedMrr)}
                </span>
              </div>
            ))}
            <div className="admin-cohort-row" style={{ borderTop: "1px solid rgba(0,0,0,0.12)", fontWeight: 600 }}>
              <span className="admin-cohort-label">Totaal</span>
              <span className="mono-amount">{forecast.pipelineForecast.reduce((s, f) => s + f.leads, 0)}</span>
              <span />
              <span className="mono-amount">
                {forecast.pipelineForecast.reduce((s, f) => s + f.expectedCustomers, 0).toFixed(1)}
              </span>
              <span className="mono-amount">{formatCurrency(forecast.expectedNewMrr)}</span>
            </div>
          </div>
        )}
      </section>

      {/* ─── Cashflow Vooruitblik ─── */}
      <section className="admin-panel admin-section">
        <div className="admin-panel-header">
          <div>
            <p className="label">Cashflow</p>
            <h2 className="admin-panel-title">Cashflow-prognose</h2>
            <p className="admin-panel-description">
              Verwachte inkomsten vs kosten voor de komende 3 maanden
            </p>
          </div>
        </div>
        <div className="admin-cohort-table">
          <div className="admin-cohort-header">
            <span>Maand</span>
            <span>Inkomsten</span>
            <span>Kosten</span>
            <span>Netto</span>
          </div>
          {forecast.cashflowForecast.map((month) => (
            <div key={month.month} className="admin-cohort-row">
              <span className="admin-cohort-label">{month.month}</span>
              <span className="mono-amount" style={{ color: "var(--color-success)" }}>
                {formatCurrency(month.income)}
              </span>
              <span className="mono-amount" style={{ color: "var(--color-accent)" }}>
                -{formatCurrency(month.expenses)}
              </span>
              <span
                className="mono-amount"
                style={{
                  fontWeight: 600,
                  color: month.net >= 0 ? "var(--color-success)" : "var(--color-accent)",
                }}
              >
                {month.net >= 0 ? "+" : ""}{formatCurrency(month.net)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Scenario Snapshot ─── */}
      <section className="admin-section">
        <div style={{ marginBottom: 24 }}>
          <p className="label">Scenario-analyse</p>
          <h2 className="admin-panel-title" style={{ margin: 0 }}>Waar staan we over 6 maanden?</h2>
          <p className="admin-panel-description">
            Drie scenario&apos;s op basis van huidige groei- en churntrends
          </p>
        </div>
        <div className="admin-scenario-grid">
          {forecast.scenarios.map((scenario) => (
            <div
              key={scenario.type}
              className={`admin-scenario-card ${scenario.type === "realistic" ? "admin-scenario-card-highlight" : ""}`}
            >
              <span className="label">{scenario.label}</span>
              <div className="admin-scenario-metric">
                <span className="admin-scenario-value">{formatCurrency(scenario.mrrIn6Months)}</span>
                <span className="admin-scenario-sub">MRR</span>
              </div>
              <div className="admin-scenario-metric">
                <span className="admin-scenario-value">{scenario.customersIn6Months}</span>
                <span className="admin-scenario-sub">Klanten</span>
              </div>
              <div className="admin-scenario-metric">
                <span className="admin-scenario-value">{formatCurrency(scenario.mrrIn6Months * 12)}</span>
                <span className="admin-scenario-sub">ARR</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Revenue Projections ─── */}
      <div className="admin-section-grid">
        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <p className="label">Omzet</p>
              <h2 className="admin-panel-title">Omzetprognose</h2>
            </div>
          </div>
          <div className="admin-growth-stats">
            <div className="admin-growth-stat-row">
              <span className="label">Kwartaalprognose</span>
              <span className="mono-amount" style={{ fontWeight: 500 }}>
                {formatCurrency(forecast.projectedQuarterRevenue)}
              </span>
            </div>
            <div className="admin-growth-stat-row">
              <span className="label">Kwartaal-voortgang</span>
              <div className="admin-plan-bar-track" style={{ flex: 1, maxWidth: 120, marginLeft: "auto" }}>
                <div className="admin-plan-bar-fill" style={{ width: `${forecast.quarterProgress}%` }} />
              </div>
              <span className="mono-amount" style={{ marginLeft: 8 }}>{forecast.quarterProgress}%</span>
            </div>
            <div className="admin-growth-stat-row" style={{ borderTop: "0.5px solid rgba(0,0,0,0.08)", paddingTop: 16, marginTop: 8 }}>
              <span className="label" style={{ fontWeight: 600 }}>Jaarprognose</span>
              <span className="mono-amount" style={{ fontWeight: 600 }}>
                {formatCurrency(forecast.projectedAnnualRevenue)}
              </span>
            </div>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <p className="label">Pipeline waarde</p>
              <h2 className="admin-panel-title">Gewogen pipeline</h2>
            </div>
          </div>
          <div className="admin-growth-stats">
            <div className="admin-growth-stat-row">
              <span className="label">Gewogen waarde</span>
              <span className="mono-amount" style={{ fontWeight: 500 }}>
                {formatCurrency(forecast.weightedPipelineValue)}
              </span>
            </div>
            <div className="admin-growth-stat-row">
              <span className="label">Verwachte nieuwe MRR</span>
              <span className="mono-amount" style={{ fontWeight: 500, color: "var(--color-success)" }}>
                +{formatCurrency(forecast.expectedNewMrr)}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
