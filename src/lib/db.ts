import { 
  ref, 
  push, 
  set, 
  get, 
  remove, 
  onValue, 
  off,
  query,
  orderByChild,
  equalTo,
  Query,
  DatabaseReference
} from 'firebase/database';
import { database } from './firebase';
import type { 
  Prompt, 
  User, 
  TeamMember, 
  Team, 
  PromptUsageLog, 
  PromptUsageAnalytics, 
  TeamPromptAssignment 
} from './types';
import { canEditPrompt, canDeletePrompt } from './permissions';
import { getCurrentUser } from './auth';

// Database structure:
// /users/{userId} -> User
// /teams/{teamId} -> Team
// /teams/{teamId}/members/{userId} -> TeamMember
// /prompts/{promptId} -> Prompt

// User operations
export async function createUser(userData: Omit<User, 'id'>): Promise<string> {
  console.log('Creating user with data:', userData);
  const usersRef = ref(database, 'users');
  const newUserRef = push(usersRef);
  await set(newUserRef, userData);
  console.log('User created with ID:', newUserRef.key);
  
  // Also create email verification entry for first-time login
  console.log('Creating email verification entry for user:', userData.email);
  await createEmailVerificationEntry(userData.email, newUserRef.key!, userData.teamId);
  
  return newUserRef.key!;
}

export async function createUserWithId(userId: string, userData: Omit<User, 'id'>): Promise<string> {
  console.log('Creating user with specific ID:', userId, userData);
  const userRef = ref(database, `users/${userId}`);
  await set(userRef, userData);
  console.log('User created with specified ID:', userId);
  
  // Also create email verification entry for first-time login
  console.log('Creating email verification entry for user:', userData.email);
  await createEmailVerificationEntry(userData.email, userId, userData.teamId);
  
  return userId;
}

export async function getUser(userId: string): Promise<User | null> {
  const userRef = ref(database, `users/${userId}`);
  const snapshot = await get(userRef);
  if (snapshot.exists()) {
    return { id: userId, ...snapshot.val() };
  }
  return null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const usersRef = ref(database, 'users');
  const userQuery = query(usersRef, orderByChild('email'), equalTo(email));
  const snapshot = await get(userQuery);
  
  if (snapshot.exists()) {
    const userData = snapshot.val();
    const userId = Object.keys(userData)[0];
    return { id: userId, ...userData[userId] };
  }
  return null;
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<void> {
  const userRef = ref(database, `users/${userId}`);
  
  // Filter out undefined values to prevent Firebase errors
  const filteredUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, value]) => value !== undefined)
  );
  
  await set(userRef, filteredUpdates);
}

export async function deleteUser(userId: string): Promise<void> {
  const user = await getUser(userId);
  if (!user) return;

  const userRef = ref(database, `users/${userId}`);
  await remove(userRef);

  const emailKey = user.email.replace(/[.@]/g, '_');
  const verificationRef = ref(database, `email-verification/${emailKey}`);
  await remove(verificationRef);
}

// Team operations
export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const teamRef = ref(database, `teams/${teamId}/members`);
  const snapshot = await get(teamRef);
  
  if (snapshot.exists()) {
    const membersData = snapshot.val();
    return Object.keys(membersData).map(userId => ({
      id: userId,
      ...membersData[userId]
    }));
  }
  return [];
}

export async function addTeamMember(teamId: string, member: TeamMember): Promise<void> {
  const memberRef = ref(database, `teams/${teamId}/members/${member.id}`);
  await set(memberRef, {
    email: member.email,
    role: member.role,
    joinedAt: member.joinedAt
  });
}

export async function removeTeamMember(teamId: string, memberId: string): Promise<void> {
  const memberRef = ref(database, `teams/${teamId}/members/${memberId}`);
  await remove(memberRef);
}

// Team operations
export async function createTeam(team: Omit<Team, 'id' | 'members'>): Promise<string> {
  const teamsRef = ref(database, 'teams');
  const newTeamRef = push(teamsRef);
  await set(newTeamRef, {
    ...team,
    createdAt: new Date().toISOString()
  });
  return newTeamRef.key!;
}

export async function getTeam(teamId: string): Promise<Team | null> {
  const teamRef = ref(database, `teams/${teamId}`);
  const snapshot = await get(teamRef);
  
  if (snapshot.exists()) {
    const teamData = snapshot.val();
    const members = teamData.members ? Object.keys(teamData.members).map(userId => ({
      id: userId,
      ...teamData.members[userId]
    })) : [];
    
    return {
      id: teamId,
      name: teamData.name,
      members,
      createdBy: teamData.createdBy,
      createdAt: teamData.createdAt
    };
  }
  return null;
}

export async function getAllTeams(): Promise<Team[]> {
  const teamsRef = ref(database, 'teams');
  const snapshot = await get(teamsRef);
  
  if (snapshot.exists()) {
    const teamsData = snapshot.val();
    return Object.keys(teamsData).map(teamId => {
      const teamData = teamsData[teamId];
      const members = teamData.members ? Object.keys(teamData.members).map(userId => ({
        id: userId,
        ...teamData.members[userId]
      })) : [];
      
      return {
        id: teamId,
        name: teamData.name,
        members,
        createdBy: teamData.createdBy,
        createdAt: teamData.createdAt
      };
    });
  }
  return [];
}

export async function deleteTeam(teamId: string): Promise<void> {
  const teamRef = ref(database, `teams/${teamId}`);
  await remove(teamRef);
}

export async function getAllUsers(): Promise<User[]> {
  const usersRef = ref(database, 'users');
  const snapshot = await get(usersRef);
  
  if (snapshot.exists()) {
    const usersData = snapshot.val();
    return Object.keys(usersData).map(userId => ({
      id: userId,
      ...usersData[userId]
    }));
  }
  return [];
}

// Special function for email verification during first-time login
// This creates a copy of user email data in a publicly readable location
export async function createEmailVerificationEntry(email: string, userId: string, teamId?: string): Promise<void> {
  const emailKey = email.replace(/[.@]/g, '_'); // Firebase keys can't contain . or @
  const verificationRef = ref(database, `email-verification/${emailKey}`);
  
  // Create data object, only including teamId if it exists
  const verificationData: any = {
    email: email,
    userId: userId,
    createdAt: new Date().toISOString()
  };
  
  // Only add teamId if it's defined
  if (teamId) {
    verificationData.teamId = teamId;
  }
  
  console.log('Creating email verification entry:', { email, emailKey, userId, teamId, verificationData });
  await set(verificationRef, verificationData);
  console.log('Email verification entry created successfully');
}

export async function verifyEmailExists(email: string): Promise<{ exists: boolean; userId?: string; email?: string; teamId?: string }> {
  const emailKey = email.replace(/[.@]/g, '_');
  const verificationRef = ref(database, `email-verification/${emailKey}`);
  console.log('Checking email verification for:', { email, emailKey, path: `email-verification/${emailKey}` });
  
  const snapshot = await get(verificationRef);
  console.log('Email verification snapshot exists:', snapshot.exists());
  
  if (snapshot.exists()) {
    const data = snapshot.val();
    console.log('Email verification data found:', data);
    return { 
      exists: true, 
      userId: data.userId,
      email: data.email,
      teamId: data.teamId
    };
  }
  
  console.log('Email verification entry not found');
  return { exists: false };
}

// Utility function to ensure all users have email verification entries
export async function ensureEmailVerificationEntries(): Promise<void> {
  const users = await getAllUsers();
  console.log('Checking email verification entries for', users.length, 'users');
  
  for (const user of users) {
    console.log('Checking user:', user.email);
    const emailVerification = await verifyEmailExists(user.email);
    if (!emailVerification.exists) {
      console.log(`Creating missing email verification entry for user: ${user.email}`);
      await createEmailVerificationEntry(user.email, user.id, user.teamId);
    } else {
      console.log(`Email verification entry already exists for user: ${user.email}`);
    }
  }
}

// Utility function to list all email verification entries
export async function listEmailVerificationEntries(): Promise<any[]> {
  const emailVerificationRef = ref(database, 'email-verification');
  const snapshot = await get(emailVerificationRef);
  
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Object.entries(data).map(([key, value]) => ({ key, ...(value as any) }));
  }
  return [];
}

export async function isUserAdmin(userId: string, teamId: string): Promise<boolean> {
  const memberRef = ref(database, `teams/${teamId}/members/${userId}`);
  const snapshot = await get(memberRef);
  
  if (snapshot.exists()) {
    return snapshot.val().role === 'admin';
  }
  return false;
}

// Prompt operations
export async function createPrompt(prompt: Omit<Prompt, 'id'>): Promise<string> {
  const promptsRef = ref(database, 'prompts');
  const newPromptRef = push(promptsRef);
  const now = new Date().toISOString();
  const promptWithTimestamp = {
    ...prompt,
    createdAt: now,
    lastModified: now,
    modifiedBy: prompt.createdBy,
    usageCount: 0,
    lastUsed: null,
    assignedTeams: prompt.teamId ? [prompt.teamId] : [],
    metadata: {
      version: 1,
      changelog: [{
        timestamp: now,
        userId: prompt.createdBy || 'system',
        action: 'created' as const,
        changes: {}
      }]
    }
  };
  await set(newPromptRef, promptWithTimestamp);
  
  // Log the creation
  await logPromptUsage(newPromptRef.key!, prompt.createdBy || 'system', prompt.teamId || null, 'created');
  
  return newPromptRef.key!;
}

export async function getPrompt(promptId: string): Promise<Prompt | null> {
  const promptRef = ref(database, `prompts/${promptId}`);
  const snapshot = await get(promptRef);
  
  if (snapshot.exists()) {
    return { id: promptId, ...snapshot.val() };
  }
  return null;
}

export async function updatePrompt(promptId: string, updates: Partial<Prompt>, userId?: string): Promise<void> {
  // Check if current user has permission to edit prompts
  const currentUser = await getCurrentUser();
  if (!canEditPrompt(currentUser)) {
    throw new Error('Unauthorized: Only the prompt keeper can edit prompts');
  }

  const promptRef = ref(database, `prompts/${promptId}`);
  const snapshot = await get(promptRef);
  
  if (snapshot.exists()) {
    const currentData = snapshot.val();
    const now = new Date().toISOString();
    const modifiedBy = userId || currentUser?.id || 'system';
    
    // Calculate changes for changelog
    const changes: Record<string, { old: any; new: any }> = {};
    Object.keys(updates).forEach(key => {
      if (currentData[key] !== updates[key as keyof Prompt]) {
        changes[key] = { old: currentData[key], new: updates[key as keyof Prompt] };
      }
    });
    
    // Update metadata
    const currentMetadata = currentData.metadata || { version: 1, changelog: [] };
    const newMetadata = {
      version: currentMetadata.version + 1,
      changelog: [
        ...currentMetadata.changelog,
        {
          timestamp: now,
          userId: modifiedBy,
          action: 'updated' as const,
          changes
        }
      ]
    };
    
    const updatedPrompt = {
      ...currentData,
      ...updates,
      lastModified: now,
      modifiedBy,
      metadata: newMetadata
    };
    
    await set(promptRef, updatedPrompt);
    
    // Log the update
    await logPromptUsage(promptId, modifiedBy, currentData.teamId || null, 'updated');
  }
}

export async function deletePrompt(promptId: string): Promise<void> {
  // Check if current user has permission to delete prompts
  const currentUser = await getCurrentUser();
  if (!canDeletePrompt(currentUser)) {
    throw new Error('Unauthorized: Only the prompt keeper can delete prompts');
  }

  const promptRef = ref(database, `prompts/${promptId}`);
  await remove(promptRef);
}

export async function getPromptsByUser(userId: string): Promise<Prompt[]> {
  const promptsRef = ref(database, 'prompts');
  const userPromptsQuery = query(promptsRef, orderByChild('createdBy'), equalTo(userId));
  const snapshot = await get(userPromptsQuery);
  
  if (snapshot.exists()) {
    const promptsData = snapshot.val();
    return Object.keys(promptsData).map(promptId => ({
      id: promptId,
      ...promptsData[promptId]
    }));
  }
  return [];
}

export async function getPromptsBySharing(
  sharing: 'private' | 'team' | 'global',
  teamId?: string
): Promise<Prompt[]> {
  const promptsRef = ref(database, 'prompts');
  let snapshot;
  
  if (sharing === 'private') {
    // Private: only prompts with 'private' sharing
    const sharingQuery = query(promptsRef, orderByChild('sharing'), equalTo('private'));
    snapshot = await get(sharingQuery);
  } else if (sharing === 'team') {
    // Team: prompts with 'team' OR 'global' sharing (cascading access)
    snapshot = await get(promptsRef);
  } else if (sharing === 'global') {
    // Community: only prompts with 'global' sharing
    const sharingQuery = query(promptsRef, orderByChild('sharing'), equalTo('global'));
    snapshot = await get(sharingQuery);
  }
  
  if (snapshot && snapshot.exists()) {
    const promptsData = snapshot.val();
    let prompts = Object.keys(promptsData).map(promptId => ({
      id: promptId,
      ...promptsData[promptId]
    }));
    
    // Filter for team view to include team prompts from same team and global prompts
    if (sharing === 'team' && teamId) {
      prompts = prompts.filter(p => 
        p.sharing === 'global' || 
        (p.sharing === 'team' && p.teamId === teamId)
      );
    }
    
    return prompts;
  }
  return [];
}

// Real-time listeners
export function subscribeToPrompts(
  callback: (prompts: Prompt[]) => void,
  userId?: string,
  sharing?: 'private' | 'team' | 'global',
  userTeamId?: string
): () => void {
  let promptsRef: Query | DatabaseReference;

  if (userId) {
    // For private/personal view: only user's own prompts
    promptsRef = query(ref(database, 'prompts'), orderByChild('createdBy'), equalTo(userId));
    const unsubscribe = onValue(promptsRef, (snapshot) => {
      if (snapshot.exists()) {
        const promptsData = snapshot.val();
        const prompts = Object.keys(promptsData).map(promptId => ({
          id: promptId,
          ...promptsData[promptId]
        }));
        callback(prompts);
      } else {
        callback([]);
      }
    });
    return () => off(promptsRef, 'value', unsubscribe);
  }

  if (sharing === 'team' && userTeamId) {
    const teamPromptsRef = query(ref(database, 'prompts'), orderByChild('teamId'), equalTo(userTeamId));
    const globalPromptsRef = query(ref(database, 'prompts'), orderByChild('sharing'), equalTo('global'));

    let teamPrompts: Prompt[] = [];
    let globalPrompts: Prompt[] = [];

    const handleUpdate = () => {
      const allPrompts = [...teamPrompts, ...globalPrompts];
      const uniquePrompts = Array.from(new Map(allPrompts.map(p => [p.id, p])).values());
      callback(uniquePrompts);
    };

    const teamUnsubscribe = onValue(teamPromptsRef, (snapshot) => {
      if (snapshot.exists()) {
        const promptsData = snapshot.val();
        teamPrompts = Object.keys(promptsData).map(promptId => ({
          id: promptId,
          ...promptsData[promptId]
        })).filter(p => p.sharing === 'team');
      } else {
        teamPrompts = [];
      }
      handleUpdate();
    });

    const globalUnsubscribe = onValue(globalPromptsRef, (snapshot) => {
      if (snapshot.exists()) {
        const promptsData = snapshot.val();
        globalPrompts = Object.keys(promptsData).map(promptId => ({
          id: promptId,
          ...promptsData[promptId]
        }));
      } else {
        globalPrompts = [];
      }
      handleUpdate();
    });

    return () => {
      off(teamPromptsRef, 'value', teamUnsubscribe);
      off(globalPromptsRef, 'value', globalUnsubscribe);
    };
  }

  if (sharing === 'global') {
    promptsRef = query(ref(database, 'prompts'), orderByChild('sharing'), equalTo('global'));
    const unsubscribe = onValue(promptsRef, (snapshot) => {
      if (snapshot.exists()) {
        const promptsData = snapshot.val();
        const prompts = Object.keys(promptsData).map(promptId => ({
          id: promptId,
          ...promptsData[promptId]
        }));
        callback(prompts);
      } else {
        callback([]);
      }
    });
    return () => off(promptsRef, 'value', unsubscribe);
  }

  // Fallback for any other case
  promptsRef = ref(database, 'prompts');
  const unsubscribe = onValue(promptsRef, (snapshot) => {
    if (snapshot.exists()) {
      const promptsData = snapshot.val();
      let prompts = Object.keys(promptsData).map(promptId => ({
        id: promptId,
        ...promptsData[promptId]
      }));
      callback(prompts);
    } else {
      callback([]);
    }
  });
  return () => off(promptsRef, 'value', unsubscribe);
}""

export function subscribeToTeamMembers(
  teamId: string,
  callback: (members: TeamMember[]) => void
): () => void {
  const teamRef = ref(database, `teams/${teamId}/members`);
  
  const unsubscribe = onValue(teamRef, (snapshot) => {
    if (snapshot.exists()) {
      const membersData = snapshot.val();
      const members = Object.keys(membersData).map(userId => ({
        id: userId,
        ...membersData[userId]
      }));
      callback(members);
    } else {
      callback([]);
    }
  });
  
  return () => off(teamRef, 'value', unsubscribe);
}

// Enhanced Prompt Management Functions

// Usage tracking functions
export async function logPromptUsage(
  promptId: string, 
  userId: string, 
  teamId: string | null, 
  action: 'viewed' | 'copied' | 'used' | 'optimized' | 'created' | 'updated'
): Promise<void> {
  const usageLogsRef = ref(database, 'prompt-usage-logs');
  const newLogRef = push(usageLogsRef);
  
  const usageLog = {
    promptId,
    userId,
    teamId,
    timestamp: new Date().toISOString(),
    action
  };
  
  await set(newLogRef, usageLog);
  
  // Update prompt usage count if it's a usage action
  if (['viewed', 'copied', 'used', 'optimized'].includes(action)) {
    await incrementPromptUsageCount(promptId);
  }
}

export async function incrementPromptUsageCount(promptId: string): Promise<void> {
  const promptRef = ref(database, `prompts/${promptId}`);
  const snapshot = await get(promptRef);
  
  if (snapshot.exists()) {
    const currentData = snapshot.val();
    const currentCount = currentData.usageCount || 0;
    const now = new Date().toISOString();
    
    await set(promptRef, {
      ...currentData,
      usageCount: currentCount + 1,
      lastUsed: now
    });
  }
}

export async function getPromptUsageAnalytics(promptId: string): Promise<PromptUsageAnalytics> {
  const usageLogsRef = ref(database, 'prompt-usage-logs');
  const promptLogsQuery = query(usageLogsRef, orderByChild('promptId'), equalTo(promptId));
  const snapshot = await get(promptLogsQuery);
  
  const analytics: PromptUsageAnalytics = {
    totalUsage: 0,
    lastUsed: null,
    usageByTeam: {},
    usageByUser: {},
    usageTrend: []
  };
  
  if (snapshot.exists()) {
    const logsData = snapshot.val();
    const logs = Object.values(logsData) as PromptUsageLog[];
    
    // Filter for usage actions only
    const usageLogs = logs.filter(log => 
      ['viewed', 'copied', 'used', 'optimized'].includes(log.action)
    );
    
    analytics.totalUsage = usageLogs.length;
    
    // Find last used date
    const sortedLogs = usageLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    analytics.lastUsed = sortedLogs.length > 0 ? sortedLogs[0].timestamp : null;
    
    // Calculate usage by team
    usageLogs.forEach(log => {
      const teamKey = log.teamId || 'no-team';
      analytics.usageByTeam[teamKey] = (analytics.usageByTeam[teamKey] || 0) + 1;
    });
    
    // Calculate usage by user
    usageLogs.forEach(log => {
      analytics.usageByUser[log.userId] = (analytics.usageByUser[log.userId] || 0) + 1;
    });
    
    // Calculate usage trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentLogs = usageLogs.filter(log => 
      new Date(log.timestamp) >= thirtyDaysAgo
    );
    
    const dailyUsage: Record<string, number> = {};
    recentLogs.forEach(log => {
      const date = log.timestamp.split('T')[0]; // Get YYYY-MM-DD
      dailyUsage[date] = (dailyUsage[date] || 0) + 1;
    });
    
    analytics.usageTrend = Object.entries(dailyUsage)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  
  return analytics;
}

export async function getPromptUsageLogs(
  promptId?: string,
  userId?: string,
  teamId?: string,
  limit?: number
): Promise<PromptUsageLog[]> {
  const usageLogsRef = ref(database, 'prompt-usage-logs');
  let logsQuery: Query = usageLogsRef;
  
  if (promptId) {
    logsQuery = query(usageLogsRef, orderByChild('promptId'), equalTo(promptId));
  } else if (userId) {
    logsQuery = query(usageLogsRef, orderByChild('userId'), equalTo(userId));
  } else if (teamId) {
    logsQuery = query(usageLogsRef, orderByChild('teamId'), equalTo(teamId));
  }
  
  const snapshot = await get(logsQuery);
  
  if (snapshot.exists()) {
    const logsData = snapshot.val();
    let logs = Object.keys(logsData).map(logId => ({
      id: logId,
      ...logsData[logId]
    })) as PromptUsageLog[];
    
    // Sort by timestamp descending
    logs = logs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Apply limit if specified
    if (limit) {
      logs = logs.slice(0, limit);
    }
    
    return logs;
  }
  
  return [];
}

// Team assignment functions
export async function assignPromptToTeam(
  promptId: string, 
  teamId: string, 
  assignedBy: string,
  permissions: { canEdit: boolean; canDelete: boolean; canReassign: boolean } = {
    canEdit: false,
    canDelete: false,
    canReassign: false
  }
): Promise<void> {
  const assignmentRef = ref(database, `team-prompt-assignments/${teamId}/${promptId}`);
  const assignment: TeamPromptAssignment = {
    teamId,
    promptId,
    assignedBy,
    assignedAt: new Date().toISOString(),
    permissions
  };
  
  await set(assignmentRef, assignment);
  
  // Update prompt's assignedTeams array
  const promptRef = ref(database, `prompts/${promptId}`);
  const promptSnapshot = await get(promptRef);
  
  if (promptSnapshot.exists()) {
    const promptData = promptSnapshot.val();
    const currentAssignedTeams = promptData.assignedTeams || [];
    
    if (!currentAssignedTeams.includes(teamId)) {
      const updatedAssignedTeams = [...currentAssignedTeams, teamId];
      await set(promptRef, {
        ...promptData,
        assignedTeams: updatedAssignedTeams,
        lastModified: new Date().toISOString(),
        modifiedBy: assignedBy
      });
      
      // Log the assignment
      await logPromptUsage(promptId, assignedBy, teamId, 'assigned' as any);
    }
  }
}

export async function unassignPromptFromTeam(
  promptId: string, 
  teamId: string, 
  unassignedBy: string
): Promise<void> {
  const assignmentRef = ref(database, `team-prompt-assignments/${teamId}/${promptId}`);
  await remove(assignmentRef);
  
  // Update prompt's assignedTeams array
  const promptRef = ref(database, `prompts/${promptId}`);
  const promptSnapshot = await get(promptRef);
  
  if (promptSnapshot.exists()) {
    const promptData = promptSnapshot.val();
    const currentAssignedTeams = promptData.assignedTeams || [];
    const updatedAssignedTeams = currentAssignedTeams.filter((id: string) => id !== teamId);
    
    await set(promptRef, {
      ...promptData,
      assignedTeams: updatedAssignedTeams,
      lastModified: new Date().toISOString(),
      modifiedBy: unassignedBy
    });
    
    // Log the unassignment
    await logPromptUsage(promptId, unassignedBy, teamId, 'unassigned' as any);
  }
}

export async function getTeamPromptAssignments(teamId: string): Promise<TeamPromptAssignment[]> {
  const assignmentsRef = ref(database, `team-prompt-assignments/${teamId}`);
  const snapshot = await get(assignmentsRef);
  
  if (snapshot.exists()) {
    const assignmentsData = snapshot.val();
    return Object.keys(assignmentsData).map(promptId => ({
      ...assignmentsData[promptId]
    }));
  }
  
  return [];
}

export async function getPromptTeamAssignments(promptId: string): Promise<TeamPromptAssignment[]> {
  const assignmentsRef = ref(database, 'team-prompt-assignments');
  const snapshot = await get(assignmentsRef);
  
  const assignments: TeamPromptAssignment[] = [];
  
  if (snapshot.exists()) {
    const allAssignments = snapshot.val();
    
    // Search through all teams for this prompt
    Object.keys(allAssignments).forEach(teamId => {
      const teamAssignments = allAssignments[teamId];
      if (teamAssignments[promptId]) {
        assignments.push(teamAssignments[promptId]);
      }
    });
  }
  
  return assignments;
}

export async function bulkAssignPromptsToTeam(
  promptIds: string[], 
  teamId: string, 
  assignedBy: string,
  permissions: { canEdit: boolean; canDelete: boolean; canReassign: boolean } = {
    canEdit: false,
    canDelete: false,
    canReassign: false
  }
): Promise<void> {
  const promises = promptIds.map(promptId => 
    assignPromptToTeam(promptId, teamId, assignedBy, permissions)
  );
  
  await Promise.all(promises);
}

export async function bulkUnassignPromptsFromTeam(
  promptIds: string[], 
  teamId: string, 
  unassignedBy: string
): Promise<void> {
  const promises = promptIds.map(promptId => 
    unassignPromptFromTeam(promptId, teamId, unassignedBy)
  );
  
  await Promise.all(promises);
}

// Enhanced prompt queries with analytics
export async function getPromptsWithAnalytics(
  filters?: {
    teamId?: string;
    sharing?: 'private' | 'team' | 'global';
    tags?: string[];
    createdBy?: string;
    hasUsage?: boolean;
  }
): Promise<(Prompt & { analytics: PromptUsageAnalytics })[]> {
  let prompts: Prompt[] = [];
  
  if (filters?.sharing) {
    prompts = await getPromptsBySharing(filters.sharing, filters.teamId);
  } else {
    const promptsRef = ref(database, 'prompts');
    const snapshot = await get(promptsRef);
    
    if (snapshot.exists()) {
      const promptsData = snapshot.val();
      prompts = Object.keys(promptsData).map(promptId => ({
        id: promptId,
        ...promptsData[promptId]
      }));
    }
  }
  
  // Apply additional filters
  if (filters?.teamId) {
    prompts = prompts.filter(p => 
      p.assignedTeams?.includes(filters.teamId!) || p.teamId === filters.teamId
    );
  }
  
  if (filters?.tags && filters.tags.length > 0) {
    prompts = prompts.filter(p => 
      filters.tags!.some(tag => p.tags.includes(tag))
    );
  }
  
  if (filters?.createdBy) {
    prompts = prompts.filter(p => p.createdBy === filters.createdBy);
  }
  
  if (filters?.hasUsage !== undefined) {
    prompts = prompts.filter(p => {
      const hasUsage = (p.usageCount || 0) > 0;
      return filters.hasUsage ? hasUsage : !hasUsage;
    });
  }
  
  // Get analytics for each prompt
  const promptsWithAnalytics = await Promise.all(
    prompts.map(async (prompt) => {
      const analytics = await getPromptUsageAnalytics(prompt.id);
      return { ...prompt, analytics };
    })
  );
  
  return promptsWithAnalytics;
}