export const WIDGET_IDS = {
  KPI_GRID: "kpi-grid",
  HEALTH_SCORE: "health-score",
  CASHFLOW_FORECAST: "cashflow-forecast",
  AI_ASSISTANT: "ai-assistant",
  OPEN_INVOICES: "open-invoices",
} as const;

export type WidgetId = (typeof WIDGET_IDS)[keyof typeof WIDGET_IDS];

export const DEFAULT_WIDGET_ORDER: WidgetId[] = [
  WIDGET_IDS.KPI_GRID,
  WIDGET_IDS.HEALTH_SCORE,
  WIDGET_IDS.CASHFLOW_FORECAST,
  WIDGET_IDS.AI_ASSISTANT,
  WIDGET_IDS.OPEN_INVOICES,
];

export const ALL_WIDGET_IDS = new Set<string>(DEFAULT_WIDGET_ORDER);

export interface WidgetMeta {
  id: WidgetId;
  labelKey: string;
}

export const WIDGET_META: Record<WidgetId, WidgetMeta> = {
  [WIDGET_IDS.KPI_GRID]: { id: WIDGET_IDS.KPI_GRID, labelKey: "kpiGrid" },
  [WIDGET_IDS.HEALTH_SCORE]: { id: WIDGET_IDS.HEALTH_SCORE, labelKey: "healthScore" },
  [WIDGET_IDS.CASHFLOW_FORECAST]: { id: WIDGET_IDS.CASHFLOW_FORECAST, labelKey: "cashflowForecast" },
  [WIDGET_IDS.AI_ASSISTANT]: { id: WIDGET_IDS.AI_ASSISTANT, labelKey: "aiAssistant" },
  [WIDGET_IDS.OPEN_INVOICES]: { id: WIDGET_IDS.OPEN_INVOICES, labelKey: "openInvoices" },
};
