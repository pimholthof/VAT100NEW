// Re-export all admin server actions for backwards compatibility.
// Each sub-module has its own "use server" directive.
// Import from specific modules for better code splitting:
//   import { getUsers } from "@/features/admin/actions/users"

export { getPlatformStats, getRevenueMetrics, getAdminDashboardData, getCustomerKpis, getUserKpis, getWaitlistKpis } from "./stats";

export { getAdminOverview, getUsers, getUserDetail, suspendUser, reactivateUser } from "./users";

export { getCustomerOverview, getCustomerDetail, updateCustomerProfile, updateInvoiceStatusAsAdmin, exportCustomerInvoicesCSV, exportCustomerReceiptsCSV, exportAllCustomersCSV } from "./customers";

export { getLeads, updateLeadStage, getLeadDetail, getLeadActivities, getLeadTasks, toggleLeadTask, initializeLeadTasks, updateLeadPlan, autoProvisionAccount, getLeadByToken, initiateLeadPayment, checkLeadActivation } from "./leads";

export { getWaitlist, getWaitlistCount } from "./waitlist";

export { getAuditLog } from "./audit";

// Type re-exports
export type { RevenueMetrics, AdminAlert, AdminLeadRow, AdminCustomerRow, AdminDashboardData, PageKpis } from "./stats";
export type { CustomerOverviewItem, CustomerDetail } from "./customers";
export type { WaitlistEntry } from "./waitlist";
export type { AuditLogEntry } from "./audit";
