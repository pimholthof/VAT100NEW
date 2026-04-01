import * as Sentry from "@sentry/nextjs";

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  action: string;
  adminId?: string;
  targetId?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  error?: unknown;
}

function formatEntry(entry: LogEntry): string {
  const parts = [
    `[Admin]`,
    `[${entry.level.toUpperCase()}]`,
    entry.action,
  ];
  if (entry.adminId) parts.push(`admin=${entry.adminId.substring(0, 8)}`);
  if (entry.targetId) parts.push(`target=${entry.targetId.substring(0, 8)}`);
  if (entry.duration !== undefined) parts.push(`${entry.duration}ms`);
  return parts.join(" ");
}

export const adminLogger = {
  info(action: string, metadata?: Record<string, unknown>) {
    const entry: LogEntry = { level: "info", action, metadata };
    console.log(formatEntry(entry), metadata ? JSON.stringify(metadata) : "");
    Sentry.addBreadcrumb({
      category: "admin",
      message: action,
      level: "info",
      data: metadata,
    });
  },

  warn(action: string, metadata?: Record<string, unknown>) {
    const entry: LogEntry = { level: "warn", action, metadata };
    console.warn(formatEntry(entry), metadata ? JSON.stringify(metadata) : "");
    Sentry.addBreadcrumb({
      category: "admin",
      message: action,
      level: "warning",
      data: metadata,
    });
  },

  error(action: string, error: unknown, metadata?: Record<string, unknown>) {
    const entry: LogEntry = { level: "error", action, error, metadata };
    console.error(formatEntry(entry), error);
    Sentry.captureException(error, {
      tags: { area: "admin", action },
      extra: metadata,
    });
  },

  /**
   * Wraps an async function with automatic duration tracking and error logging
   */
  async timed<T>(action: string, fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.info(action, { ...metadata, duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(action, error, { ...metadata, duration });
      throw error;
    }
  },
};
