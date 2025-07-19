import type { User } from './types';

export function isSuperUser(user: User | null): boolean {
  return user?.role === 'super_user';
}

export function isTeamAdmin(user: User | null): boolean {
  return user?.role === 'super_user' || user?.teamId !== undefined;
}

export function canManageTeams(user: User | null): boolean {
  return isSuperUser(user);
}

export function canCreateCommunityPrompts(user: User | null): boolean {
  return isSuperUser(user);
}

export function canManageAllUsers(user: User | null): boolean {
  return isSuperUser(user);
}

export function canAccessSuperAdmin(user: User | null): boolean {
  return isSuperUser(user);
}

export function canCreateTeamPrompts(user: User | null, targetTeamId?: string): boolean {
  if (isSuperUser(user)) return true;
  if (!user?.teamId) return false;
  return !targetTeamId || user.teamId === targetTeamId;
}

export function canManageTeamMembers(user: User | null, targetTeamId?: string): boolean {
  if (isSuperUser(user)) return true;
  if (!user?.teamId) return false;
  return !targetTeamId || user.teamId === targetTeamId;
}

// New permission functions for prompt editing and deletion
export function canEditPrompt(user: User | null): boolean {
  return isSuperUser(user);
}

export function canDeletePrompt(user: User | null): boolean {
  return isSuperUser(user);
}

export function canManagePrompts(user: User | null): boolean {
  return isSuperUser(user);
}