import { getSubscriptionAnalytics } from "@/features/admin/actions/analytics";
import { getRevenueMetrics } from "@/features/admin/actions/stats";
import { getForecasts } from "@/features/admin/actions/forecasts";
import { StatCard } from "@/components/ui/StatCard";
import { AdminStatePanel } from "../AdminStatePanel";
import { GroeiTabs } from "./GroeiTabs";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export default async function GroeiPage() {
  const [analyticsResult, metricsResult, forecastResult] = await Promise.all([
    getSubscriptionAnalytics(),
    getRevenueMetrics(),
    getForecasts(),
  ]);

  if (analyticsResult.error || !analyticsResult.data) {
    return (
      <AdminStatePanel
        eyebrow="Groei"
        title="Groeidata kon niet worden geladen"
        description={analyticsResult.error ?? "Onbekende fout"}
        actions={[{ href: "/admin", label: "Terug naar Command Center", variant: "secondary" }]}
      />
    );
  }

  const analytics = analyticsResult.data;
  const _metrics = metricsResult.data;
  const forecast = forecastResult.data;
  const maxMrr = Math.max(...analytics.monthlyMrr.map((m) => m.mrr), 1);

  return (
    <div className="admin-layout">
      {/* ─── Hero ─── */}
      <section className="admin-hero">
        <div className="admin-hero-copy">
          <p className="label">Groei &amp; Prognoses</p>
          <h1 className="admin-hero-title">Groei-overzicht</h1>
          <p className="admin-hero-description">
            SaaS-metrics, retentie, conversie en vooruitkijkende projecties in één overzicht.
          </p>
        </div>
      </section>

      {/* ─── Revenue KPI Strip ─── */}
      <div className="admin-stat-grid">
        <StatCard label="MRR" value={formatCurrency(analytics.mrr)} numericValue={analytics.mrr} sub={`${analytics.mrrGrowth > 0 ? "+" : ""}${analytics.mrrGrowth}% groei`} compact />
        <StatCard label="ARR" value={formatCurrency(analytics.mrr * 12)} numericValue={analytics.mrr * 12} sub="Jaarlijks terugkerend" compact />
        <StatCard label="Churn rate" value={`${analytics.churnRate}%`} numericValue={analytics.churnRate} isCurrency={false} sub="Klantverloop deze maand" compact />
        <StatCard label="ARPU" value={formatCurrency(analytics.arpu)} numericValue={analytics.arpu} sub="Gem. omzet per gebruiker" compact />
        <StatCard label="LTV" value={formatCurrency(analytics.ltv)} numericValue={analytics.ltv} sub="Geschatte levensduurwaarde" compact />
        <StatCard label="Abonnementen" value={String(analytics.totalActiveSubscriptions)} numericValue={analytics.totalActiveSubscriptions} isCurrency={false} sub="Actieve subscriptions" compact />
      </div>

      {/* ─── Tabs: Metrics | Prognoses ─── */}
      <GroeiTabs>
        {/* Tab 1: Metrics */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-section, 32px)" }}>
          {/* MRR Trend */}
          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <p className="label">Maandelijkse omzet</p>
                <h2 className="admin-panel-title">MRR Trend</h2>
                <p className="admin-panel-description">Laatste 6 maanden terugkerende omzet</p>
              </div>
            </div>
            <div className="admin-mrr-trend">
              {analytics.monthlyMrr.map((month) => (
                <div key={month.month} className="admin-mrr-trend-col">
                  <div className="admin-mrr-trend-bar-wrap">
                    <div className="admin-mrr-trend-bar" style={{ height: `${Math.max((month.mrr / maxMrr) * 100, 4)}%` }} />
                  </div>
                  <span className="admin-mrr-trend-amount">{formatCurrency(month.mrr)}</span>
                  <span className="admin-mrr-trend-label">{month.month}</span>
                  <span className="admin-mrr-trend-sub">{month.subscriptions} subs</span>
                </div>
              ))}
            </div>
          </section>

          {/* MRR Waterfall */}
          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <p className="label">MRR Decompositie</p>
                <h2 className="admin-panel-title">MRR Beweging</h2>
                <p className="admin-panel-description">Uitsplitsing: waar komt groei en verlies vandaan deze maand</p>
              </div>
            </div>
            {(() => {
              const m = analytics.mrrMovements;
              const allValues = [m.previousMrr, m.newMrr, m.expansionMrr, m.contractionMrr, m.churnedMrr, m.previousMrr + m.netNewMrr];
              const maxVal = Math.max(...allValues, 1);
              const bars = [
                { label: "Vorige MRR", value: m.previousMrr, type: "neutral" as const },
                { label: "+Nieuw", value: m.newMrr, type: "positive" as const },
                { label: "+Expansie", value: m.expansionMrr, type: "positive" as const },
                { label: "-Krimp", value: m.contractionMrr, type: "negative" as const },
                { label: "-Churn", value: m.churnedMrr, type: "negative" as const },
                { label: "Huidige MRR", value: m.previousMrr + m.netNewMrr, type: "neutral" as const },
              ];
              return (
                <div className="admin-waterfall">
                  {bars.map((bar) => (
                    <div key={bar.label} className="admin-waterfall-col">
                      <div className="admin-waterfall-bar-wrap">
                        <div className={`admin-waterfall-bar admin-waterfall-bar-${bar.type}`} style={{ height: `${Math.max((bar.value / maxVal) * 100, 4)}%` }} />
                      </div>
                      <span className="admin-waterfall-amount">{bar.type === "negative" ? "-" : ""}{formatCurrency(bar.value)}</span>
                      <span className="admin-waterfall-label">{bar.label}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </section>

          <div className="admin-section-grid">
            {/* Plan Distributie */}
            <section className="admin-panel">
              <div className="admin-panel-header">
                <div>
                  <p className="label">Abonnementen</p>
                  <h2 className="admin-panel-title">Plan distributie</h2>
                </div>
              </div>
              {analytics.planDistribution.length === 0 ? (
                <div className="admin-empty-state">Nog geen abonnementen actief.</div>
              ) : (
                <div className="admin-list">
                  {analytics.planDistribution.map((plan) => {
                    const totalSubs = analytics.totalActiveSubscriptions || 1;
                    const pct = Math.round((plan.count / totalSubs) * 100);
                    return (
                      <div key={plan.planId} className="admin-list-item" style={{ cursor: "default" }}>
                        <div className="admin-list-content">
                          <p className="admin-list-title">{plan.planName}</p>
                          <p className="admin-list-sub">{plan.count} abonnementen &middot; {pct}% van totaal</p>
                          <div className="admin-plan-bar-track">
                            <div className="admin-plan-bar-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className="mono-amount" style={{ fontWeight: 500, whiteSpace: "nowrap" }}>{formatCurrency(plan.revenue)}/mo</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Conversion Funnel */}
            <section className="admin-panel">
              <div className="admin-panel-header">
                <div>
                  <p className="label">Sales</p>
                  <h2 className="admin-panel-title">Conversie-funnel</h2>
                  <p className="admin-panel-description">Conversieratio: {analytics.conversionFunnel.conversionRate.toFixed(1)}%</p>
                </div>
              </div>
              <div className="admin-funnel">
                {[
                  { label: "Totaal leads", value: analytics.conversionFunnel.totalLeads },
                  { label: "Link verstuurd", value: analytics.conversionFunnel.linkSent },
                  { label: "Plan gekozen", value: analytics.conversionFunnel.planChosen },
                  { label: "Klant", value: analytics.conversionFunnel.customers },
                ].map((step, i, arr) => {
                  const maxVal = arr[0].value || 1;
                  const widthPct = Math.max((step.value / maxVal) * 100, 12);
                  const prevVal = i > 0 ? arr[i - 1].value : null;
                  const dropPct = prevVal && prevVal > 0 ? Math.round(((prevVal - step.value) / prevVal) * 100) : null;
                  return (
                    <div key={step.label} className="admin-funnel-step">
                      <div className="admin-funnel-bar-wrap">
                        <div className="admin-funnel-bar" style={{ width: `${widthPct}%` }} />
                      </div>
                      <div className="admin-funnel-meta">
                        <span className="admin-funnel-label">{step.label}</span>
                        <span className="admin-funnel-value">{step.value}</span>
                        {dropPct !== null && dropPct > 0 && <span className="admin-funnel-drop">-{dropPct}%</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Cohort Retention */}
          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <p className="label">Retentie</p>
                <h2 className="admin-panel-title">Cohort-analyse</h2>
                <p className="admin-panel-description">Retentie per signup-maand (laatste 6 maanden)</p>
              </div>
            </div>
            {analytics.cohortRetention.length === 0 ? (
              <div className="admin-empty-state">Nog geen cohortdata beschikbaar.</div>
            ) : (
              <div className="admin-cohort-table">
                <div className="admin-cohort-header">
                  <span>Cohort</span>
                  <span>Totaal</span>
                  <span>Actief</span>
                  <span>Retentie</span>
                </div>
                {analytics.cohortRetention.map((cohort) => (
                  <div key={cohort.cohort} className="admin-cohort-row">
                    <span className="admin-cohort-label">{cohort.cohort}</span>
                    <span className="mono-amount">{cohort.total}</span>
                    <span className="mono-amount">{cohort.active}</span>
                    <span className="admin-cohort-rate" data-health={cohort.retentionRate >= 80 ? "good" : cohort.retentionRate >= 50 ? "warn" : "bad"}>
                      {cohort.retentionRate}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Tab 2: Prognoses */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-section, 32px)" }}>
          {!forecast ? (
            <div className="admin-panel"><div className="admin-empty-state">Prognosedata kon niet worden geladen.</div></div>
          ) : (
            <>
              {/* Headline KPIs */}
              <div className="admin-stat-grid">
                <StatCard label="Geprojecteerde MRR" value={formatCurrency(forecast.mrrTrend[forecast.mrrTrend.length - 1]?.mrr ?? 0)} numericValue={forecast.mrrTrend[forecast.mrrTrend.length - 1]?.mrr ?? 0} sub="Over 3 maanden" compact />
                <StatCard label="Geprojecteerde ARR" value={formatCurrency(forecast.projectedArrIn3Months)} numericValue={forecast.projectedArrIn3Months} sub="Op basis van MRR-trend" compact />
                <StatCard label="Verwachte nieuwe klanten" value={String(forecast.projectedNewCustomersNext3Months)} numericValue={forecast.projectedNewCustomersNext3Months} isCurrency={false} sub="Komende 3 maanden" compact />
                <StatCard label="Verwacht churn-verlies" value={formatCurrency(forecast.projectedChurnMrr)} numericValue={forecast.projectedChurnMrr} sub={`${forecast.projectedChurnedCustomersNext3Months} klanten (3 mnd)`} compact />
              </div>

              {/* MRR Trend + Projectie */}
              {(() => {
                const maxForecastMrr = Math.max(...forecast.mrrTrend.map((m) => m.mrr), 1);
                return (
                  <section className="admin-panel">
                    <div className="admin-panel-header">
                      <div>
                        <p className="label">MRR Projectie</p>
                        <h2 className="admin-panel-title">Omzettrend + vooruitblik</h2>
                        <p className="admin-panel-description">6 maanden historisch (vast) + 3 maanden geprojecteerd (gestreept)</p>
                      </div>
                    </div>
                    <div className="admin-mrr-trend">
                      {forecast.mrrTrend.map((month) => (
                        <div key={month.month} className="admin-mrr-trend-col">
                          <div className="admin-mrr-trend-bar-wrap">
                            <div className={`admin-mrr-trend-bar ${month.isProjected ? "admin-mrr-trend-bar-projected" : ""}`} style={{ height: `${Math.max((month.mrr / maxForecastMrr) * 100, 4)}%` }} />
                          </div>
                          <span className="admin-mrr-trend-amount">{formatCurrency(month.mrr)}</span>
                          <span className="admin-mrr-trend-label">{month.month}</span>
                          {month.isProjected && <span className="admin-mrr-trend-sub" style={{ color: "var(--color-info)" }}>prognose</span>}
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })()}

              {/* Groei vs Churn */}
              <div className="admin-section-grid">
                <section className="admin-panel">
                  <div className="admin-panel-header">
                    <div>
                      <p className="label">Groei</p>
                      <h2 className="admin-panel-title">Verwachte klantgroei</h2>
                    </div>
                  </div>
                  <div className="admin-growth-stats">
                    <div className="admin-growth-stat-row"><span className="label">Huidige klanten</span><span className="mono-amount">{forecast.currentTotalCustomers}</span></div>
                    <div className="admin-growth-stat-row"><span className="label">Gem. nieuwe klanten/maand</span><span className="mono-amount">{forecast.monthlyGrowthRate}</span></div>
                    <div className="admin-growth-stat-row"><span className="label">Verwacht nieuw (3 mnd)</span><span className="mono-amount" style={{ fontWeight: 600 }}>+{forecast.projectedNewCustomersNext3Months}</span></div>
                    <div className="admin-growth-stat-row"><span className="label">Verwacht eind jaar</span><span className="mono-amount" style={{ fontWeight: 600 }}>{forecast.projectedTotalCustomersEoy}</span></div>
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
                    <div className="admin-growth-stat-row"><span className="label">Verwachte churn rate</span><span className="mono-amount" style={{ color: forecast.projectedChurnRate > 5 ? "var(--color-accent)" : undefined }}>{forecast.projectedChurnRate}%</span></div>
                    <div className="admin-growth-stat-row"><span className="label">Verwacht verlies (3 mnd)</span><span className="mono-amount" style={{ color: "var(--color-accent)" }}>-{forecast.projectedChurnedCustomersNext3Months} klanten</span></div>
                    <div className="admin-growth-stat-row"><span className="label">MRR-verlies (3 mnd)</span><span className="mono-amount" style={{ color: "var(--color-accent)", fontWeight: 600 }}>-{formatCurrency(forecast.projectedChurnMrr)}</span></div>
                    <div className="admin-growth-stat-row" style={{ borderTop: "0.5px solid rgba(0,0,0,0.08)", paddingTop: 16, marginTop: 8 }}>
                      <span className="label" style={{ fontWeight: 600 }}>Netto groei (3 mnd)</span>
                      <span className="mono-amount" style={{ fontWeight: 600, color: (forecast.projectedNewCustomersNext3Months - forecast.projectedChurnedCustomersNext3Months) >= 0 ? "var(--color-success)" : "var(--color-accent)" }}>
                        {forecast.projectedNewCustomersNext3Months - forecast.projectedChurnedCustomersNext3Months >= 0 ? "+" : ""}
                        {forecast.projectedNewCustomersNext3Months - forecast.projectedChurnedCustomersNext3Months} klanten
                      </span>
                    </div>
                  </div>
                </section>
              </div>

              {/* Scenario Snapshot */}
              <section>
                <div style={{ marginBottom: 24 }}>
                  <p className="label">Scenario-analyse</p>
                  <h2 className="admin-panel-title" style={{ margin: 0 }}>Waar staan we over 6 maanden?</h2>
                  <p className="admin-panel-description">Drie scenario&apos;s op basis van huidige groei- en churntrends</p>
                </div>
                <div className="admin-scenario-grid">
                  {forecast.scenarios.map((scenario) => (
                    <div key={scenario.type} className={`admin-scenario-card ${scenario.type === "realistic" ? "admin-scenario-card-highlight" : ""}`}>
                      <span className="label">{scenario.label}</span>
                      <div className="admin-scenario-metric"><span className="admin-scenario-value">{formatCurrency(scenario.mrrIn6Months)}</span><span className="admin-scenario-sub">MRR</span></div>
                      <div className="admin-scenario-metric"><span className="admin-scenario-value">{scenario.customersIn6Months}</span><span className="admin-scenario-sub">Klanten</span></div>
                      <div className="admin-scenario-metric"><span className="admin-scenario-value">{formatCurrency(scenario.mrrIn6Months * 12)}</span><span className="admin-scenario-sub">ARR</span></div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Cashflow Forecast */}
              <section className="admin-panel">
                <div className="admin-panel-header">
                  <div>
                    <p className="label">Cashflow</p>
                    <h2 className="admin-panel-title">Cashflow-prognose</h2>
                    <p className="admin-panel-description">Verwachte inkomsten vs kosten voor de komende 3 maanden</p>
                  </div>
                </div>
                <div className="admin-cohort-table">
                  <div className="admin-cohort-header"><span>Maand</span><span>Inkomsten</span><span>Kosten</span><span>Netto</span></div>
                  {forecast.cashflowForecast.map((month) => (
                    <div key={month.month} className="admin-cohort-row">
                      <span className="admin-cohort-label">{month.month}</span>
                      <span className="mono-amount" style={{ color: "var(--color-success)" }}>{formatCurrency(month.income)}</span>
                      <span className="mono-amount" style={{ color: "var(--color-accent)" }}>-{formatCurrency(month.expenses)}</span>
                      <span className="mono-amount" style={{ fontWeight: 600, color: month.net >= 0 ? "var(--color-success)" : "var(--color-accent)" }}>{month.net >= 0 ? "+" : ""}{formatCurrency(month.net)}</span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </GroeiTabs>
    </div>
  );
}
