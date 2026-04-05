// Re-export all admin server actions for backwards compatibility.
// Each sub-module has its own "use server" directive.
// Import from specific modules for better code splitting:
//   import { getUsers } from "@/features/admin/actions/users"

export { getPlatformStats, getRevenueMetrics, getAdminDashboardData, getCustomerKpis, getUserKpis, getWaitlistKpis, getRecentActivityFeed } from "./stats";

export { getAdminOverview, getUsers, getUserDetail, suspendUser, reactivateUser } from "./users";

export { getCustomerOverview, getCustomerDetail, updateCustomerProfile, updateInvoiceStatusAsAdmin, updateInvoiceAsAdmin, deleteInvoiceAsAdmin, updateClientAsAdmin, deleteClientAsAdmin, updateReceiptAsAdmin, deleteReceiptAsAdmin, exportCustomerInvoicesCSV, exportCustomerReceiptsCSV, exportAllCustomersCSV, getCustomerBenchmarks } from "./customers";

export { getLeads, updateLeadStage, getLeadDetail, getLeadActivities, getLeadTasks, toggleLeadTask, initializeLeadTasks, updateLeadPlan, autoProvisionAccount, getLeadByToken, initiateLeadPayment, checkLeadActivation } from "./leads";

export { getWaitlist, getWaitlistCount } from "./waitlist";

export { getAuditLog } from "./audit";

export { getPlatformInvoices, getPlatformBankConnections, getPlatformExpenses, getSubscriptionPayments } from "./platform";
export type { PlatformInvoice, PlatformInvoiceStats, PlatformBankConnection, PlatformBankStats, PlatformExpenseStats, SubscriptionPaymentRow, SubscriptionPaymentStats } from "./platform";

export { getChatConversations, getChatConversationMessages, sendAdminChatMessage, getChatKpis } from "./chat";

export { getForecasts } from "./forecasts";
export type { ForecastData, MrrProjection } from "./forecasts";

export { getSubscriptionAnalytics } from "./analytics";
export type { SubscriptionAnalytics } from "./analytics";

// Type re-exports
export type { RevenueMetrics, AdminAlert, AdminLeadRow, AdminCustomerRow, AdminDashboardData, PageKpis, ActivityFeedItem } from "./stats";
export type { CustomerOverviewItem, CustomerDetail, CustomerBenchmarks } from "./customers";
export type { WaitlistEntry } from "./waitlist";
export type { AuditLogEntry } from "./audit";
export type { ChatConversationWithUser } from "./chat";
