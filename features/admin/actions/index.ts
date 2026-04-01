// Re-export all admin actions for backwards compatibility
// Import from specific modules for better code splitting:
//   import { getUsers } from "@/features/admin/actions/users"

export { getPlatformStats, getRevenueMetrics, getAdminDashboardData, getCustomerKpis, getUserKpis, getWaitlistKpis } from "./stats";
export type { RevenueMetrics, AdminAlert, AdminLeadRow, AdminCustomerRow, AdminDashboardData, PageKpis } from "./stats";

export { getUsers, getUserDetail, suspendUser, reactivateUser } from "./users";

export { getCustomerOverview, getCustomerDetail, updateCustomerProfile, updateInvoiceStatusAsAdmin, exportCustomerInvoicesCSV, exportCustomerReceiptsCSV, exportAllCustomersCSV } from "./customers";
export type { CustomerOverviewItem, CustomerDetail } from "./customers";

export { getLeads, updateLeadStage, getLeadDetail, getLeadActivities, getLeadTasks, toggleLeadTask, initializeLeadTasks, updateLeadPlan, autoProvisionAccount, getLeadByToken, initiateLeadPayment, checkLeadActivation } from "./leads";

export { getWaitlist, getWaitlistCount } from "./waitlist";
export type { WaitlistEntry } from "./waitlist";

export { getAuditLog } from "./audit";
export type { AuditLogEntry } from "./audit";
