import type { User, Prompt } from './types';

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

// Updated permission functions for prompt editing and deletion
export function canEditPrompt(user: User | null, prompt: Prompt): boolean {
  if (isSuperUser(user)) return true;
  if (!user) return false;
  
  // User can edit their own prompts
  if (prompt.createdBy === user.id) return true;
  
  // For team prompts, user must be in the same team
  if (prompt.sharing === 'team' && prompt.teamId === user.teamId) return true;
  
  return false;
}

export function canDeletePrompt(user: User | null, prompt: Prompt): boolean {
  if (isSuperUser(user)) return true;
  if (!user) return false;
  
  // User can delete their own prompts
  if (prompt.createdBy === user.id) return true;
  
  // For team prompts, user must be in the same team
  if (prompt.sharing === 'team' && prompt.teamId === user.teamId) return true;
  
  return false;
}

export function canManagePrompts(user: User | null): boolean {
  return isSuperUser(user);
}

// New function to check if user can view a prompt
export function canViewPrompt(user: User | null, prompt: Prompt): boolean {
  if (isSuperUser(user)) return true;
  if (!user) return false;
  
  // User can always view their own prompts
  if (prompt.createdBy === user.id) return true;
  
  // Community prompts are visible to everyone
  if (prompt.sharing === 'global') return true;
  
  // Team prompts are only visible to team members
  if (prompt.sharing === 'team' && prompt.teamId === user.teamId) return true;
  
  return false;
}