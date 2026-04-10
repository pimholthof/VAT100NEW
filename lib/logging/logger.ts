/**
 * Structured Logger met Correlation IDs
 *
 * Gestructureerde JSON-logs voor productie-debugging.
 * Elke log bevat een correlation ID zodat een request door het hele systeem
 * gevolgd kan worden.
 */

import { randomUUID } from "crypto";

type LogLevel = "info" | "warn" | "error";

interface LogContext {
  correlationId?: string;
  userId?: string;
  area: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  correlationId: string;
  area: string;
  message: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

let _currentCorrelationId: string | null = null;

/**
 * Genereer of hergebruik een correlation ID voor de huidige request.
 */
export function getCorrelationId(): string {
  if (!_currentCorrelationId) {
    _currentCorrelationId = randomUUID();
  }
  return _currentCorrelationId;
}

/**
 * Stel een specifiek correlation ID in (bijv. van een request header).
 */
export function setCorrelationId(id: string): void {
  _currentCorrelationId = id;
}

/**
 * Reset het correlation ID (voor de volgende request).
 */
export function resetCorrelationId(): void {
  _currentCorrelationId = null;
}

function formatLog(level: LogLevel, message: string, context: LogContext): LogEntry {
  const { correlationId, userId, area, ...rest } = context;
  return {
    timestamp: new Date().toISOString(),
    level,
    correlationId: correlationId || getCorrelationId(),
    area,
    message,
    ...(userId ? { userId } : {}),
    ...(Object.keys(rest).length > 0 ? { metadata: rest } : {}),
  };
}

function emit(entry: LogEntry): void {
  const line = JSON.stringify(entry);
  switch (entry.level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    default:
      console.log(line);
  }
}

export const logger = {
  info(message: string, context: LogContext): void {
    emit(formatLog("info", message, context));
  },

  warn(message: string, context: LogContext): void {
    emit(formatLog("warn", message, context));
  },

  error(message: string, context: LogContext & { error?: unknown }): void {
    const { error, ...rest } = context;
    const errorInfo: Record<string, unknown> = { ...rest };
    if (error instanceof Error) {
      errorInfo.errorMessage = error.message;
      errorInfo.errorStack = error.stack?.split("\n").slice(0, 5).join("\n");
    } else if (error !== undefined) {
      errorInfo.errorMessage = String(error);
    }
    emit(formatLog("error", message, errorInfo as LogContext));
  },

  /**
   * Maak een child-logger met vooraf ingestelde context.
   */
  child(baseContext: Partial<LogContext>) {
    return {
      info: (message: string, context?: Partial<LogContext>) =>
        logger.info(message, { area: "", ...baseContext, ...context } as LogContext),
      warn: (message: string, context?: Partial<LogContext>) =>
        logger.warn(message, { area: "", ...baseContext, ...context } as LogContext),
      error: (message: string, context?: Partial<LogContext> & { error?: unknown }) =>
        logger.error(message, { area: "", ...baseContext, ...context } as LogContext & { error?: unknown }),
    };
  },
};
