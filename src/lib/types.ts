export interface Prompt {
  id: string;
  title: string;
  content: string;
  tags: string[];
  software?: string;
  sharing: 'private' | 'team' | 'global';
  createdBy?: string;
  teamId?: string;
  createdAt?: string;
  // Enhanced fields for prompt management
  lastModified?: string;
  modifiedBy?: string;
  usageCount?: number;
  lastUsed?: string | null;
  assignedTeams?: string[]; // For multi-team assignment
  metadata?: {
    version: number;
    changelog: ChangelogEntry[];
  };
}

export interface ChangelogEntry {
  timestamp: string;
  userId: string;
  action: 'created' | 'updated' | 'deleted' | 'tagged' | 'assigned' | 'unassigned';
  changes: Record<string, { old: any; new: any }>;
}

export interface PromptUsageLog {
  id: string;
  promptId: string;
  userId: string;
  teamId: string | null;
  timestamp: string;
  action: 'viewed' | 'copied' | 'used' | 'optimized';
}

export interface PromptUsageAnalytics {
  totalUsage: number;
  lastUsed: string | null;
  usageByTeam: Record<string, number>;
  usageByUser: Record<string, number>;
  usageTrend: UsageDataPoint[];
}

export interface UsageDataPoint {
  date: string;
  count: number;
}

export interface TeamPromptAssignment {
  teamId: string;
  promptId: string;
  assignedBy: string;
  assignedAt: string;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canReassign: boolean;
  };
}

export interface PromptDeletionImpact {
  promptId: string;
  prompt: Prompt;
  affectedTeams: {
    teamId: string;
    teamName: string;
    memberCount: number;
    assignment: TeamPromptAssignment;
  }[];
  affectedUsers: {
    userId: string;
    userEmail: string;
    teamId?: string;
    usageCount: number;
    lastUsed?: string;
  }[];
  usageAnalytics: PromptUsageAnalytics;
  totalImpactScore: number;
  canDelete: boolean;
  warnings: string[];
}

export interface DeletionBackup {
  promptId: string;
  promptData: Prompt;
  teamAssignments: TeamPromptAssignment[];
  deletedBy: string;
  deletedAt: string;
}

export interface User {
  id: string;
  email: string;
  teamId?: string;
  role?: 'super_user' | 'user';
}

export interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  createdBy?: string;
  createdAt?: string;
}

export interface TeamMember {
  id: string;
  email: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

// Import/Export types
export interface PromptExportData {
  version: string;
  exportedAt: string;
  exportedBy: string;
  prompts: Prompt[];
  teamAssignments: TeamPromptAssignment[];
  metadata: {
    totalPrompts: number;
    teamsIncluded: string[];
    exportScope: 'global' | 'team' | 'selected';
    selectedTeamId?: string;
  };
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: ImportError[];
  conflicts: ConflictResolution[];
}

export interface ImportError {
  type: 'validation' | 'permission' | 'conflict' | 'system';
  message: string;
  promptId?: string;
  promptTitle?: string;
}

export interface ConflictResolution {
  promptId: string;
  existingPrompt: Prompt;
  importedPrompt: Prompt;
  resolution: 'skip' | 'overwrite' | 'create_new';
  reason: string;
}

export interface ImportPreview {
  totalPrompts: number;
  newPrompts: Prompt[];
  conflictingPrompts: ConflictResolution[];
  invalidPrompts: ImportError[];
  teamsToAssign: string[];
  estimatedChanges: {
    creates: number;
    updates: number;
    skips: number;
  };
}
