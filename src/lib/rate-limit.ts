/**
 * Client-side rate limiting utility
 *
 * NOTE: This provides basic protection but can be bypassed by sophisticated attackers.
 * For true rate limiting, implement server-side checks via Firebase Cloud Functions.
 */

import { logger } from './logger';

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
}

interface RateLimitConfig {
  /** Maximum attempts allowed in the window */
  maxAttempts: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Optional key prefix for namespacing */
  keyPrefix?: string;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically (every 5 minutes)
if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      // Remove entries older than 1 hour
      if (now - entry.lastAttempt > 60 * 60 * 1000) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Check if an action is rate limited
 * @returns Object with isLimited boolean and remaining attempts
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { isLimited: boolean; remainingAttempts: number; resetIn: number } {
  const fullKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key;
  const now = Date.now();
  const entry = rateLimitStore.get(fullKey);

  if (!entry) {
    // First attempt
    rateLimitStore.set(fullKey, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
    });
    return {
      isLimited: false,
      remainingAttempts: config.maxAttempts - 1,
      resetIn: config.windowMs,
    };
  }

  // Check if window has expired
  if (now - entry.firstAttempt > config.windowMs) {
    // Reset the window
    rateLimitStore.set(fullKey, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
    });
    return {
      isLimited: false,
      remainingAttempts: config.maxAttempts - 1,
      resetIn: config.windowMs,
    };
  }

  // Within window, check count
  if (entry.count >= config.maxAttempts) {
    const resetIn = config.windowMs - (now - entry.firstAttempt);
    logger.warn('Rate limit exceeded', {
      context: { key: fullKey, count: entry.count, maxAttempts: config.maxAttempts },
    });
    return {
      isLimited: true,
      remainingAttempts: 0,
      resetIn,
    };
  }

  // Increment count
  entry.count++;
  entry.lastAttempt = now;
  rateLimitStore.set(fullKey, entry);

  return {
    isLimited: false,
    remainingAttempts: config.maxAttempts - entry.count,
    resetIn: config.windowMs - (now - entry.firstAttempt),
  };
}

/**
 * Reset rate limit for a specific key
 */
export function resetRateLimit(key: string, keyPrefix?: string): void {
  const fullKey = keyPrefix ? `${keyPrefix}:${key}` : key;
  rateLimitStore.delete(fullKey);
}

// Pre-configured rate limiters for common operations

/**
 * Rate limiter for login attempts
 * 5 attempts per 15 minutes per email
 */
export function checkLoginRateLimit(email: string): ReturnType<typeof checkRateLimit> {
  return checkRateLimit(email.toLowerCase(), {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyPrefix: 'login',
  });
}

/**
 * Rate limiter for password reset requests
 * 3 attempts per hour per email
 */
export function checkPasswordResetRateLimit(email: string): ReturnType<typeof checkRateLimit> {
  return checkRateLimit(email.toLowerCase(), {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'password-reset',
  });
}

/**
 * Rate limiter for account creation
 * 3 accounts per hour per IP (using a placeholder since we can't get real IP client-side)
 */
export function checkAccountCreationRateLimit(identifier: string): ReturnType<typeof checkRateLimit> {
  return checkRateLimit(identifier, {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'account-create',
  });
}

/**
 * Rate limiter for prompt creation
 * 30 prompts per hour per user
 */
export function checkPromptCreationRateLimit(userId: string): ReturnType<typeof checkRateLimit> {
  return checkRateLimit(userId, {
    maxAttempts: 30,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'prompt-create',
  });
}

/**
 * Rate limiter for API calls (general)
 * 100 calls per minute per user
 */
export function checkApiRateLimit(userId: string): ReturnType<typeof checkRateLimit> {
  return checkRateLimit(userId, {
    maxAttempts: 100,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'api',
  });
}
