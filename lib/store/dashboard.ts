import { create } from "zustand";
import type { DashboardLayout } from "@/lib/types";
import {
  DEFAULT_WIDGET_ORDER,
  DEFAULT_HIDDEN,
  ALL_WIDGET_IDS,
  type WidgetId,
} from "@/features/dashboard/widget-registry";

interface DashboardLayoutState {
  order: WidgetId[];
  hidden: WidgetId[];
  isEditMode: boolean;
  isDirty: boolean;
  initialized: boolean;

  initialize: (layout: DashboardLayout | null) => void;
  reorder: (newOrder: WidgetId[]) => void;
  toggleVisibility: (widgetId: WidgetId) => void;
  moveWidget: (widgetId: WidgetId, direction: "up" | "down") => void;
  enterEditMode: () => void;
  exitEditMode: () => void;
  resetToDefault: () => void;
  toLayout: () => DashboardLayout;
}

/**
 * Reconcile a stored layout with current widget IDs.
 * Ensures new widgets are appended and removed widgets are pruned.
 */
function reconcileOrder(stored: string[]): WidgetId[] {
  const valid = stored.filter((id) => ALL_WIDGET_IDS.has(id)) as WidgetId[];
  const missing = DEFAULT_WIDGET_ORDER.filter((id) => !valid.includes(id));
  return [...valid, ...missing];
}

function reconcileHidden(stored: string[]): WidgetId[] {
  return stored.filter((id) => ALL_WIDGET_IDS.has(id)) as WidgetId[];
}

export const useDashboardStore = create<DashboardLayoutState>((set, get) => ({
  order: [...DEFAULT_WIDGET_ORDER],
  hidden: [...DEFAULT_HIDDEN],
  isEditMode: false,
  isDirty: false,
  initialized: false,

  initialize: (layout) => {
    if (get().initialized) return;
    if (layout) {
      set({
        order: reconcileOrder(layout.order),
        hidden: reconcileHidden(layout.hidden),
        initialized: true,
        isDirty: false,
      });
    } else {
      set({
        order: [...DEFAULT_WIDGET_ORDER],
        hidden: [...DEFAULT_HIDDEN],
        initialized: true,
        isDirty: false,
      });
    }
  },

  reorder: (newOrder) => {
    set({ order: newOrder, isDirty: true });
  },

  toggleVisibility: (widgetId) => {
    const { hidden } = get();
    const next = hidden.includes(widgetId)
      ? hidden.filter((id) => id !== widgetId)
      : [...hidden, widgetId];
    set({ hidden: next, isDirty: true });
  },

  moveWidget: (widgetId, direction) => {
    const { order } = get();
    const idx = order.indexOf(widgetId);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= order.length) return;
    const next = [...order];
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    set({ order: next, isDirty: true });
  },

  enterEditMode: () => set({ isEditMode: true }),

  exitEditMode: () => set({ isEditMode: false }),

  resetToDefault: () => {
    set({
      order: [...DEFAULT_WIDGET_ORDER],
      hidden: [...DEFAULT_HIDDEN],
      isDirty: true,
    });
  },

  toLayout: () => {
    const { order, hidden } = get();
    return { order: [...order], hidden: [...hidden] };
  },
}));
