/**
 * Gestructureerde Agent Logger
 *
 * Consistent logging format voor alle agents met agent name,
 * event ID, user ID, en execution timing.
 */

import * as Sentry from "@sentry/nextjs";

interface AgentLogContext {
  eventId?: string;
  userId?: string;
  [key: string]: unknown;
}

export interface AgentLogger {
  info: (msg: string, meta?: AgentLogContext) => void;
  warn: (msg: string, meta?: AgentLogContext) => void;
  error: (msg: string, error: unknown, meta?: AgentLogContext) => void;
  /** Start een timer. Retourneert een functie die de duration (ms) logt. */
  startTimer: (operation: string) => () => void;
}

export function createAgentLogger(agentName: string): AgentLogger {
  const prefix = `[${agentName}]`;

  function formatMeta(meta?: AgentLogContext): string {
    if (!meta) return "";
    const parts: string[] = [];
    if (meta.eventId) parts.push(`event=${meta.eventId}`);
    if (meta.userId) parts.push(`user=${meta.userId}`);
    // Voeg overige keys toe
    for (const [key, value] of Object.entries(meta)) {
      if (key !== "eventId" && key !== "userId" && value !== undefined) {
        parts.push(`${key}=${JSON.stringify(value)}`);
      }
    }
    return parts.length > 0 ? ` {${parts.join(", ")}}` : "";
  }

  return {
    info(msg: string, meta?: AgentLogContext) {
      console.log(`${prefix} ${msg}${formatMeta(meta)}`);
      Sentry.addBreadcrumb({
        category: "agent",
        message: `${prefix} ${msg}`,
        level: "info",
        data: meta,
      });
    },

    warn(msg: string, meta?: AgentLogContext) {
      console.warn(`${prefix} ⚠ ${msg}${formatMeta(meta)}`);
      Sentry.addBreadcrumb({
        category: "agent",
        message: `${prefix} ${msg}`,
        level: "warning",
        data: meta,
      });
    },

    error(msg: string, error: unknown, meta?: AgentLogContext) {
      console.error(`${prefix} ✗ ${msg}${formatMeta(meta)}`, error);
      Sentry.captureException(error, {
        tags: { agent: agentName },
        extra: meta,
      });
    },

    startTimer(operation: string) {
      const start = performance.now();
      return () => {
        const duration = Math.round(performance.now() - start);
        console.log(`${prefix} ${operation} completed in ${duration}ms`);
        Sentry.addBreadcrumb({
          category: "agent.timing",
          message: `${prefix} ${operation}: ${duration}ms`,
          level: "info",
          data: { duration, operation },
        });
      };
    },
  };
}
