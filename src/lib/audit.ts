/**
 * Audit logging system for tracking admin and security-relevant actions
 */

import { ref, push, set, query, orderByChild, limitToLast, get } from 'firebase/database';
import { database } from './firebase';
import { logger } from './logger';

export type AuditAction =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'TEAM_CREATED'
  | 'TEAM_DELETED'
  | 'TEAM_MEMBER_ADDED'
  | 'TEAM_MEMBER_REMOVED'
  | 'TEAM_MEMBER_ROLE_CHANGED'
  | 'PROMPT_CREATED'
  | 'PROMPT_UPDATED'
  | 'PROMPT_DELETED'
  | 'PROMPT_SHARING_CHANGED'
  | 'SUPER_USER_LOGIN'
  | 'PERMISSION_DENIED'
  | 'SECURITY_WARNING';

export interface AuditEntry {
  id?: string;
  action: AuditAction;
  userId: string;
  userEmail?: string;
  targetId?: string;
  targetType?: 'user' | 'team' | 'prompt';
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

/**
 * Log an audit entry to the database
 */
export async function logAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<string | null> {
  try {
    const auditRef = ref(database, 'audit-logs');
    const newAuditRef = push(auditRef);

    const auditEntry: Omit<AuditEntry, 'id'> = {
      ...entry,
      timestamp: new Date().toISOString(),
      // Try to get user agent if in browser
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    };

    await set(newAuditRef, auditEntry);

    logger.debug('Audit logged', { context: { action: entry.action, userId: entry.userId } });

    return newAuditRef.key;
  } catch (error) {
    // Don't throw - audit logging should not break the main operation
    logger.error('Failed to log audit entry', error, { context: { action: entry.action } });
    return null;
  }
}

/**
 * Get recent audit logs (requires super_user permission via Firebase rules)
 */
export async function getRecentAuditLogs(limit: number = 100): Promise<AuditEntry[]> {
  try {
    const auditRef = ref(database, 'audit-logs');
    const auditQuery = query(auditRef, orderByChild('timestamp'), limitToLast(limit));
    const snapshot = await get(auditQuery);

    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.entries(data)
        .map(([id, entry]) => ({ id, ...(entry as Omit<AuditEntry, 'id'>) }))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    return [];
  } catch (error) {
    logger.error('Failed to fetch audit logs', error);
    return [];
  }
}

/**
 * Helper to create audit context from user info
 */
export function createAuditContext(userId: string, userEmail?: string): Pick<AuditEntry, 'userId' | 'userEmail'> {
  return {
    userId,
    userEmail,
  };
}

// Convenience functions for common audit actions

export async function auditUserLogin(userId: string, userEmail: string, isSuperUser: boolean = false): Promise<void> {
  await logAudit({
    action: isSuperUser ? 'SUPER_USER_LOGIN' : 'USER_LOGIN',
    userId,
    userEmail,
  });
}

export async function auditUserCreated(
  actorId: string,
  actorEmail: string | undefined,
  newUserId: string,
  newUserEmail: string
): Promise<void> {
  await logAudit({
    action: 'USER_CREATED',
    userId: actorId,
    userEmail: actorEmail,
    targetId: newUserId,
    targetType: 'user',
    details: { newUserEmail },
  });
}

export async function auditTeamCreated(
  actorId: string,
  actorEmail: string | undefined,
  teamId: string,
  teamName: string
): Promise<void> {
  await logAudit({
    action: 'TEAM_CREATED',
    userId: actorId,
    userEmail: actorEmail,
    targetId: teamId,
    targetType: 'team',
    details: { teamName },
  });
}

export async function auditTeamDeleted(
  actorId: string,
  actorEmail: string | undefined,
  teamId: string,
  teamName: string
): Promise<void> {
  await logAudit({
    action: 'TEAM_DELETED',
    userId: actorId,
    userEmail: actorEmail,
    targetId: teamId,
    targetType: 'team',
    details: { teamName },
  });
}

export async function auditTeamMemberAdded(
  actorId: string,
  actorEmail: string | undefined,
  teamId: string,
  memberId: string,
  memberEmail: string
): Promise<void> {
  await logAudit({
    action: 'TEAM_MEMBER_ADDED',
    userId: actorId,
    userEmail: actorEmail,
    targetId: teamId,
    targetType: 'team',
    details: { memberId, memberEmail },
  });
}

export async function auditTeamMemberRemoved(
  actorId: string,
  actorEmail: string | undefined,
  teamId: string,
  memberId: string,
  memberEmail?: string
): Promise<void> {
  await logAudit({
    action: 'TEAM_MEMBER_REMOVED',
    userId: actorId,
    userEmail: actorEmail,
    targetId: teamId,
    targetType: 'team',
    details: { memberId, memberEmail },
  });
}

export async function auditPromptSharingChanged(
  actorId: string,
  actorEmail: string | undefined,
  promptId: string,
  oldSharing: string,
  newSharing: string
): Promise<void> {
  await logAudit({
    action: 'PROMPT_SHARING_CHANGED',
    userId: actorId,
    userEmail: actorEmail,
    targetId: promptId,
    targetType: 'prompt',
    details: { oldSharing, newSharing },
  });
}

export async function auditSecurityWarning(
  userId: string,
  userEmail: string | undefined,
  message: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    action: 'SECURITY_WARNING',
    userId,
    userEmail,
    details: { message, ...details },
  });
}
