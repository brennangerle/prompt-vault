'use client';

import { logPromptUsage } from './db';
import { getCurrentUser } from './auth';

/**
 * Usage tracking utility for prompt interactions
 */
export class UsageTracker {
  private static instance: UsageTracker;
  private trackingEnabled = true;
  private batchQueue: Array<{
    promptId: string;
    action: 'viewed' | 'copied' | 'used' | 'optimized';
    userId: string;
    teamId: string | null;
  }> = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 2000; // 2 seconds

  private constructor() {}

  static getInstance(): UsageTracker {
    if (!UsageTracker.instance) {
      UsageTracker.instance = new UsageTracker();
    }
    return UsageTracker.instance;
  }

  /**
   * Enable or disable usage tracking
   */
  setTrackingEnabled(enabled: boolean): void {
    this.trackingEnabled = enabled;
  }

  /**
   * Track a prompt usage event
   */
  async track(
    promptId: string,
    action: 'viewed' | 'copied' | 'used' | 'optimized',
    options?: {
      userId?: string;
      teamId?: string | null;
      immediate?: boolean;
    }
  ): Promise<void> {
    if (!this.trackingEnabled || !promptId) return;

    try {
      const currentUser = await getCurrentUser();
      const userId = options?.userId || currentUser?.id;
      const teamId = options?.teamId !== undefined ? options.teamId : currentUser?.teamId || null;

      if (!userId) {
        console.warn('Cannot track usage: no user ID available');
        return;
      }

      if (options?.immediate) {
        // Track immediately
        await logPromptUsage(promptId, userId, teamId, action);
      } else {
        // Add to batch queue
        this.batchQueue.push({ promptId, action, userId, teamId });
        this.scheduleBatchProcess();
      }
    } catch (error) {
      console.error('Error tracking usage:', error);
    }
  }

  /**
   * Track prompt view
   */
  async trackView(promptId: string, options?: { userId?: string; teamId?: string | null }): Promise<void> {
    await this.track(promptId, 'viewed', options);
  }

  /**
   * Track prompt copy
   */
  async trackCopy(promptId: string, options?: { userId?: string; teamId?: string | null }): Promise<void> {
    await this.track(promptId, 'copied', options);
  }

  /**
   * Track prompt usage
   */
  async trackUse(promptId: string, options?: { userId?: string; teamId?: string | null }): Promise<void> {
    await this.track(promptId, 'used', options);
  }

  /**
   * Track prompt optimization
   */
  async trackOptimize(promptId: string, options?: { userId?: string; teamId?: string | null }): Promise<void> {
    await this.track(promptId, 'optimized', options);
  }

  /**
   * Schedule batch processing of tracking events
   */
  private scheduleBatchProcess(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);
  }

  /**
   * Process batched tracking events
   */
  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    try {
      // Group by prompt and action to avoid duplicate tracking
      const uniqueEvents = new Map<string, typeof batch[0]>();
      
      batch.forEach(event => {
        const key = `${event.promptId}-${event.action}-${event.userId}`;
        if (!uniqueEvents.has(key)) {
          uniqueEvents.set(key, event);
        }
      });

      // Process unique events
      const promises = Array.from(uniqueEvents.values()).map(event =>
        logPromptUsage(event.promptId, event.userId, event.teamId, event.action)
      );

      await Promise.all(promises);
    } catch (error) {
      console.error('Error processing usage tracking batch:', error);
      // Re-queue failed events
      this.batchQueue.unshift(...batch);
    }
  }

  /**
   * Flush any pending tracking events immediately
   */
  async flush(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    await this.processBatch();
  }

  /**
   * Get tracking statistics
   */
  getStats(): {
    trackingEnabled: boolean;
    queueSize: number;
    hasPendingBatch: boolean;
  } {
    return {
      trackingEnabled: this.trackingEnabled,
      queueSize: this.batchQueue.length,
      hasPendingBatch: this.batchTimeout !== null
    };
  }
}

// Export singleton instance
export const usageTracker = UsageTracker.getInstance();

// Convenience functions for direct usage
export const trackPromptView = (promptId: string, options?: { userId?: string; teamId?: string | null }) =>
  usageTracker.trackView(promptId, options);

export const trackPromptCopy = (promptId: string, options?: { userId?: string; teamId?: string | null }) =>
  usageTracker.trackCopy(promptId, options);

export const trackPromptUse = (promptId: string, options?: { userId?: string; teamId?: string | null }) =>
  usageTracker.trackUse(promptId, options);

export const trackPromptOptimize = (promptId: string, options?: { userId?: string; teamId?: string | null }) =>
  usageTracker.trackOptimize(promptId, options);

// Auto-flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    usageTracker.flush();
  });

  // Also flush periodically
  setInterval(() => {
    usageTracker.flush();
  }, 30000); // Every 30 seconds
}