/**
 * Production-safe logging utility
 * Only logs in development mode unless explicitly forced
 */

const isDev = process.env.NODE_ENV === 'development';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  /** Force logging even in production (use sparingly) */
  force?: boolean;
  /** Additional context data */
  context?: Record<string, unknown>;
}

function formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * Debug level logging - only in development
 */
export function logDebug(message: string, options?: LogOptions): void {
  if (isDev || options?.force) {
    console.log(formatMessage('debug', message, options?.context));
  }
}

/**
 * Info level logging - only in development
 */
export function logInfo(message: string, options?: LogOptions): void {
  if (isDev || options?.force) {
    console.info(formatMessage('info', message, options?.context));
  }
}

/**
 * Warning level logging - always logged
 */
export function logWarn(message: string, options?: LogOptions): void {
  console.warn(formatMessage('warn', message, options?.context));
}

/**
 * Error level logging - always logged
 */
export function logError(message: string, error?: unknown, options?: LogOptions): void {
  const context = {
    ...options?.context,
    ...(error instanceof Error ? { errorMessage: error.message, stack: error.stack } : { error }),
  };
  console.error(formatMessage('error', message, context));
}

/**
 * Security-related logging - always logged with special prefix
 */
export function logSecurity(message: string, options?: LogOptions): void {
  console.warn(formatMessage('warn', `[SECURITY] ${message}`, options?.context));
}

export const logger = {
  debug: logDebug,
  info: logInfo,
  warn: logWarn,
  error: logError,
  security: logSecurity,
};

export default logger;
