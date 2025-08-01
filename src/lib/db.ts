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
  TeamPromptAssignment,
  PromptExportData,
  ImportResult,
  ImportError,
  ConflictResolution,
  ImportPreview
} from './types';
import { canEditPrompt, canDeletePrompt } from './permissions';
import { getCurrentUser } from './auth';
import { addUserToResendAudience } from './resend-server';

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
  
  // Add user to Resend audience
  if (process.env.RESEND_AUDIENCE_ID) {
    try {
      await addUserToResendAudience(userData.email);
      console.log('User added to Resend audience');
    } catch (error) {
      console.error('Failed to add user to Resend audience:', error);
    }
  }
  
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
  
  // Add user to Resend audience
  if (process.env.RESEND_AUDIENCE_ID) {
    try {
      await addUserToResendAudience(userData.email);
      console.log('User added to Resend audience');
    } catch (error) {
      console.error('Failed to add user to Resend audience:', error);
    }
  }
  
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
  console.log('User deleted with ID:', userId);

  const emailKey = user.email.replace(/[.@]/g, '_');
  const verificationRef = ref(database, `email-verification/${emailKey}`);
  await remove(verificationRef);
}

// Function to add user to Resend audience - imported from resend.ts

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

export async function createTeam(teamData: Omit<Team, 'id' | 'members' | 'createdAt'>): Promise<string> {
  const teamsRef = ref(database, 'teams');
  const newTeamRef = push(teamsRef);
  await set(newTeamRef, {
    ...teamData,
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
  
  // Remove any undefined values before saving to Firebase
  const cleanedPrompt = JSON.parse(JSON.stringify(promptWithTimestamp, (key, value) => 
    value === undefined ? null : value
  ));
  
  await set(newPromptRef, cleanedPrompt);
  
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
  const currentUser = await getCurrentUser();
  const promptRef = ref(database, `prompts/${promptId}`);
  const snapshot = await get(promptRef);
  
  if (snapshot.exists()) {
    const currentData = snapshot.val();
    const prompt = { id: promptId, ...currentData };
    
    // Check if current user has permission to edit this specific prompt
    if (!canEditPrompt(currentUser, prompt)) {
      throw new Error('Unauthorized: Only the prompt keeper can edit prompts');
    }
    
    const now = new Date().toISOString();
    const modifiedBy = userId || currentUser?.id || 'system';
    
    // Calculate changes for changelog
    const changes: Record<string, { old: any; new: any }> = {};
    Object.keys(updates).forEach(key => {
      if (currentData[key] !== updates[key as keyof Prompt]) {
        const oldValue = currentData[key] ?? null; // Convert undefined to null
        const newValue = updates[key as keyof Prompt] ?? null; // Convert undefined to null
        changes[key] = { old: oldValue, new: newValue };
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
    
    // Remove any undefined values before saving to Firebase
    const cleanedPrompt = JSON.parse(JSON.stringify(updatedPrompt, (key, value) => 
      value === undefined ? null : value
    ));
    
    await set(promptRef, cleanedPrompt);
    
    // Log the update
    await logPromptUsage(promptId, modifiedBy, currentData.teamId || null, 'updated');
  }
}

export async function deletePrompt(promptId: string): Promise<void> {
  const currentUser = await getCurrentUser();
  const promptRef = ref(database, `prompts/${promptId}`);
  const snapshot = await get(promptRef);
  
  if (snapshot.exists()) {
    const currentData = snapshot.val();
    const prompt = { id: promptId, ...currentData };
    
    // Check if current user has permission to delete this specific prompt
    if (!canDeletePrompt(currentUser, prompt)) {
      throw new Error('Unauthorized: Only the prompt keeper can delete prompts');
    }
    
    await remove(promptRef);
  }
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

export async function getAllPrompts(): Promise<Prompt[]> {
  const promptsRef = ref(database, 'prompts');
  const snapshot = await get(promptsRef);
  
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
}

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
// Tag-based search and filtering functions
export async function searchPromptsByTags(
  tags: string[],
  options?: {
    teamId?: string;
    sharing?: 'private' | 'team' | 'global';
    matchAll?: boolean; // true = AND logic, false = OR logic
  }
): Promise<Prompt[]> {
  if (tags.length === 0) return [];

  const promptsRef = ref(database, 'prompts');
  const snapshot = await get(promptsRef);
  
  if (!snapshot.exists()) return [];

  const promptsData = snapshot.val();
  let prompts = Object.keys(promptsData).map(promptId => ({
    id: promptId,
    ...promptsData[promptId]
  })) as Prompt[];

  // Apply sharing filter
  if (options?.sharing) {
    prompts = prompts.filter(p => p.sharing === options.sharing);
  }

  // Apply team filter
  if (options?.teamId) {
    prompts = prompts.filter(p => 
      p.assignedTeams?.includes(options.teamId!) || p.teamId === options.teamId
    );
  }

  // Apply tag filter
  const normalizedSearchTags = tags.map(tag => tag.toLowerCase().trim());
  
  prompts = prompts.filter(prompt => {
    if (!prompt.tags || !Array.isArray(prompt.tags)) return false;
    
    const promptTags = prompt.tags.map(tag => tag.toLowerCase().trim());
    
    if (options?.matchAll) {
      // AND logic: prompt must have ALL search tags
      return normalizedSearchTags.every(searchTag => 
        promptTags.some(promptTag => promptTag.includes(searchTag))
      );
    } else {
      // OR logic: prompt must have ANY search tag
      return normalizedSearchTags.some(searchTag => 
        promptTags.some(promptTag => promptTag.includes(searchTag))
      );
    }
  });

  return prompts;
}

export async function getPromptsByTagPattern(
  pattern: string,
  options?: {
    teamId?: string;
    sharing?: 'private' | 'team' | 'global';
    limit?: number;
  }
): Promise<Prompt[]> {
  const promptsRef = ref(database, 'prompts');
  const snapshot = await get(promptsRef);
  
  if (!snapshot.exists()) return [];

  const promptsData = snapshot.val();
  let prompts = Object.keys(promptsData).map(promptId => ({
    id: promptId,
    ...promptsData[promptId]
  })) as Prompt[];

  // Apply sharing filter
  if (options?.sharing) {
    prompts = prompts.filter(p => p.sharing === options.sharing);
  }

  // Apply team filter
  if (options?.teamId) {
    prompts = prompts.filter(p => 
      p.assignedTeams?.includes(options.teamId!) || p.teamId === options.teamId
    );
  }

  // Apply pattern matching
  const patternLower = pattern.toLowerCase();
  prompts = prompts.filter(prompt => {
    if (!prompt.tags || !Array.isArray(prompt.tags)) return false;
    
    return prompt.tags.some(tag => 
      tag.toLowerCase().includes(patternLower)
    );
  });

  // Apply limit
  if (options?.limit) {
    prompts = prompts.slice(0, options.limit);
  }

  return prompts;
}

export async function getAllTags(options?: {
  teamId?: string;
  sharing?: 'private' | 'team' | 'global';
  minUsageCount?: number;
}): Promise<{ tag: string; count: number; prompts: string[] }[]> {
  const promptsRef = ref(database, 'prompts');
  const snapshot = await get(promptsRef);
  
  if (!snapshot.exists()) return [];

  const promptsData = snapshot.val();
  let prompts = Object.keys(promptsData).map(promptId => ({
    id: promptId,
    ...promptsData[promptId]
  })) as Prompt[];

  // Apply filters
  if (options?.sharing) {
    prompts = prompts.filter(p => p.sharing === options.sharing);
  }

  if (options?.teamId) {
    prompts = prompts.filter(p => 
      p.assignedTeams?.includes(options.teamId!) || p.teamId === options.teamId
    );
  }

  // Collect and count tags
  const tagMap = new Map<string, { count: number; prompts: string[] }>();
  
  prompts.forEach(prompt => {
    if (prompt.tags && Array.isArray(prompt.tags)) {
      prompt.tags.forEach(tag => {
        const normalizedTag = tag.toLowerCase().trim();
        if (!tagMap.has(normalizedTag)) {
          tagMap.set(normalizedTag, { count: 0, prompts: [] });
        }
        const tagData = tagMap.get(normalizedTag)!;
        tagData.count++;
        tagData.prompts.push(prompt.id);
      });
    }
  });

  // Convert to array and apply minimum usage filter
  let tagArray = Array.from(tagMap.entries()).map(([tag, data]) => ({
    tag,
    count: data.count,
    prompts: data.prompts
  }));

  if (options?.minUsageCount) {
    tagArray = tagArray.filter(tag => tag.count >= options.minUsageCount!);
  }

  // Sort by count descending
  return tagArray.sort((a, b) => b.count - a.count);
}

// Prompt deletion impact analysis functions
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
  totalImpactScore: number; // Higher score = more impact
  canDelete: boolean;
  warnings: string[];
}

export async function analyzePromptDeletionImpact(promptId: string): Promise<PromptDeletionImpact | null> {
  // Get the prompt
  const prompt = await getPrompt(promptId);
  if (!prompt) return null;

  // Get team assignments
  const teamAssignments = await getPromptTeamAssignments(promptId);
  
  // Get usage analytics
  const usageAnalytics = await getPromptUsageAnalytics(promptId);
  
  // Get all teams and users for detailed impact analysis
  const allTeams = await getAllTeams();
  const allUsers = await getAllUsers();
  
  // Analyze affected teams
  const affectedTeams = await Promise.all(
    teamAssignments.map(async (assignment) => {
      const team = allTeams.find(t => t.id === assignment.teamId);
      return {
        teamId: assignment.teamId,
        teamName: team?.name || 'Unknown Team',
        memberCount: team?.members.length || 0,
        assignment
      };
    })
  );

  // Analyze affected users based on usage logs
  const usageLogs = await getPromptUsageLogs(promptId);
  const userUsageMap = new Map<string, { count: number; lastUsed?: string }>();
  
  usageLogs.forEach(log => {
    if (!userUsageMap.has(log.userId)) {
      userUsageMap.set(log.userId, { count: 0 });
    }
    const userData = userUsageMap.get(log.userId)!;
    userData.count++;
    if (!userData.lastUsed || log.timestamp > userData.lastUsed) {
      userData.lastUsed = log.timestamp;
    }
  });

  const affectedUsers = Array.from(userUsageMap.entries()).map(([userId, usage]) => {
    const user = allUsers.find(u => u.id === userId);
    return {
      userId,
      userEmail: user?.email || 'Unknown User',
      teamId: user?.teamId,
      usageCount: usage.count,
      lastUsed: usage.lastUsed
    };
  }).filter(user => user.usageCount > 0);

  // Calculate impact score
  let impactScore = 0;
  impactScore += affectedTeams.length * 10; // 10 points per affected team
  impactScore += affectedUsers.length * 5; // 5 points per affected user
  impactScore += (usageAnalytics.totalUsage || 0) * 0.1; // 0.1 points per usage
  
  // Recent usage increases impact
  if (usageAnalytics.lastUsed) {
    const daysSinceLastUse = (Date.now() - new Date(usageAnalytics.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastUse < 7) impactScore += 20; // Recently used
    else if (daysSinceLastUse < 30) impactScore += 10; // Used this month
  }

  // Generate warnings
  const warnings: string[] = [];
  
  if (affectedTeams.length > 0) {
    warnings.push(`This prompt is assigned to ${affectedTeams.length} team(s)`);
  }
  
  if (usageAnalytics.totalUsage > 50) {
    warnings.push(`This prompt has high usage (${usageAnalytics.totalUsage} times)`);
  }
  
  if (usageAnalytics.lastUsed) {
    const daysSinceLastUse = (Date.now() - new Date(usageAnalytics.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastUse < 7) {
      warnings.push('This prompt was used recently (within 7 days)');
    }
  }

  if (prompt.sharing === 'global') {
    warnings.push('This is a global prompt visible to all users');
  }

  // Determine if deletion is allowed (super users can always delete, but we show warnings)
  const canDelete = true; // Super users have full deletion rights

  return {
    promptId,
    prompt,
    affectedTeams,
    affectedUsers,
    usageAnalytics,
    totalImpactScore: impactScore,
    canDelete,
    warnings
  };
}

export async function analyzeBulkPromptDeletionImpact(promptIds: string[]): Promise<{
  impacts: PromptDeletionImpact[];
  totalImpactScore: number;
  totalAffectedTeams: number;
  totalAffectedUsers: number;
  highImpactPrompts: string[];
  canDeleteAll: boolean;
  warnings: string[];
}> {
  const impacts = await Promise.all(
    promptIds.map(id => analyzePromptDeletionImpact(id))
  );
  
  const validImpacts = impacts.filter(Boolean) as PromptDeletionImpact[];
  
  const totalImpactScore = validImpacts.reduce((sum, impact) => sum + impact.totalImpactScore, 0);
  
  const allAffectedTeams = new Set<string>();
  const allAffectedUsers = new Set<string>();
  
  validImpacts.forEach(impact => {
    impact.affectedTeams.forEach(team => allAffectedTeams.add(team.teamId));
    impact.affectedUsers.forEach(user => allAffectedUsers.add(user.userId));
  });
  
  const highImpactPrompts = validImpacts
    .filter(impact => impact.totalImpactScore > 50)
    .map(impact => impact.promptId);
  
  const canDeleteAll = validImpacts.every(impact => impact.canDelete);
  
  const warnings: string[] = [];
  if (validImpacts.length !== promptIds.length) {
    warnings.push(`${promptIds.length - validImpacts.length} prompt(s) not found`);
  }
  
  if (highImpactPrompts.length > 0) {
    warnings.push(`${highImpactPrompts.length} prompt(s) have high impact scores`);
  }
  
  if (allAffectedTeams.size > 0) {
    warnings.push(`${allAffectedTeams.size} team(s) will be affected`);
  }
  
  const globalPrompts = validImpacts.filter(impact => impact.prompt.sharing === 'global');
  if (globalPrompts.length > 0) {
    warnings.push(`${globalPrompts.length} global prompt(s) will be deleted`);
  }

  return {
    impacts: validImpacts,
    totalImpactScore,
    totalAffectedTeams: allAffectedTeams.size,
    totalAffectedUsers: allAffectedUsers.size,
    highImpactPrompts,
    canDeleteAll,
    warnings
  };
}

// Enhanced deletion functions with cascade handling
export async function deletePromptWithCascade(promptId: string, deletedBy?: string): Promise<void> {
  const currentUser = await getCurrentUser();
  const userId = deletedBy || currentUser?.id || 'system';
  
  // Get prompt data before deletion for logging
  const prompt = await getPrompt(promptId);
  if (!prompt) {
    throw new Error('Prompt not found');
  }

  // Check if current user has permission to delete this specific prompt
  if (!canDeletePrompt(currentUser, prompt)) {
    throw new Error('Unauthorized: Only the prompt keeper can delete prompts');
  }

  // Remove all team assignments
  const teamAssignments = await getPromptTeamAssignments(promptId);
  await Promise.all(
    teamAssignments.map(assignment => 
      unassignPromptFromTeam(promptId, assignment.teamId, userId)
    )
  );

  // Log the deletion before removing the prompt
  await logPromptUsage(promptId, userId, prompt.teamId || null, 'deleted' as any);
  
  // Create deletion backup for potential rollback
  await createDeletionBackup(promptId, prompt, userId);
  
  // Delete the prompt
  const promptRef = ref(database, `prompts/${promptId}`);
  await remove(promptRef);
}

export async function bulkDeletePromptsWithCascade(promptIds: string[], deletedBy?: string): Promise<{
  successful: string[];
  failed: { promptId: string; error: string }[];
}> {
  const currentUser = await getCurrentUser();
  const userId = deletedBy || currentUser?.id || 'system';
  const successful: string[] = [];
  const failed: { promptId: string; error: string }[] = [];

  // Process deletions sequentially to avoid overwhelming the database
  for (const promptId of promptIds) {
    try {
      const prompt = await getPrompt(promptId);
      if (!prompt) {
        failed.push({ promptId, error: 'Prompt not found' });
        continue;
      }

      // Check if current user has permission to delete this specific prompt
      if (!canDeletePrompt(currentUser, prompt)) {
        failed.push({ promptId, error: 'Unauthorized: Only the prompt keeper can delete prompts' });
        continue;
      }

      await deletePromptWithCascade(promptId, userId);
      successful.push(promptId);
    } catch (error) {
      failed.push({
        promptId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return { successful, failed };
}

// Rollback functionality
interface DeletionBackup {
  promptId: string;
  promptData: Prompt;
  teamAssignments: TeamPromptAssignment[];
  deletedBy: string;
  deletedAt: string;
}

export async function createDeletionBackup(
  promptId: string, 
  promptData: Prompt, 
  deletedBy: string
): Promise<void> {
  const teamAssignments = await getPromptTeamAssignments(promptId);
  
  const backup: DeletionBackup = {
    promptId,
    promptData,
    teamAssignments,
    deletedBy,
    deletedAt: new Date().toISOString()
  };

  const backupRef = ref(database, `deletion-backups/${promptId}`);
  await set(backupRef, backup);
}

export async function getDeletionBackup(promptId: string): Promise<DeletionBackup | null> {
  const backupRef = ref(database, `deletion-backups/${promptId}`);
  const snapshot = await get(backupRef);
  
  if (snapshot.exists()) {
    return snapshot.val() as DeletionBackup;
  }
  
  return null;
}

export async function restoreDeletedPrompt(promptId: string, restoredBy?: string): Promise<void> {
  const currentUser = await getCurrentUser();
  const backup = await getDeletionBackup(promptId);
  if (!backup) {
    throw new Error('No backup found for this prompt');
  }

  // Check if current user has permission to edit this specific prompt
  const prompt = { ...backup.promptData, id: promptId };
  if (!canEditPrompt(currentUser, prompt)) {
    throw new Error('Unauthorized: Only the prompt keeper can restore prompts');
  }

  const userId = restoredBy || currentUser?.id || 'system';
  
  // Restore the prompt
  const promptRef = ref(database, `prompts/${promptId}`);
  const restoredPrompt = {
    ...backup.promptData,
    lastModified: new Date().toISOString(),
    modifiedBy: userId,
    metadata: {
      ...backup.promptData.metadata,
      version: (backup.promptData.metadata?.version || 1) + 1,
      changelog: [
        ...(backup.promptData.metadata?.changelog || []),
        {
          timestamp: new Date().toISOString(),
          userId,
          action: 'restored' as const,
          changes: { restored: { old: null, new: true } }
        }
      ]
    }
  };
  
  await set(promptRef, restoredPrompt);
  
  // Restore team assignments
  await Promise.all(
    backup.teamAssignments.map(assignment =>
      assignPromptToTeam(promptId, assignment.teamId, userId, assignment.permissions)
    )
  );
  
  // Log the restoration
  await logPromptUsage(promptId, userId, backup.promptData.teamId || null, 'restored' as any);
  
  // Remove the backup
  const backupRef = ref(database, `deletion-backups/${promptId}`);
  await remove(backupRef);
}

export async function listDeletionBackups(limit?: number): Promise<DeletionBackup[]> {
  const backupsRef = ref(database, 'deletion-backups');
  const snapshot = await get(backupsRef);
  
  if (!snapshot.exists()) return [];
  
  const backupsData = snapshot.val();
  let backups = Object.values(backupsData) as DeletionBackup[];
  
  // Sort by deletion date descending
  backups = backups.sort((a, b) => 
    new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
  );
  
  if (limit) {
    backups = backups.slice(0, limit);
  }
  
  return backups;
}

export async function cleanupOldDeletionBackups(olderThanDays: number = 30): Promise<number> {
  const backups = await listDeletionBackups();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  const oldBackups = backups.filter(backup => 
    new Date(backup.deletedAt) < cutoffDate
  );
  
  await Promise.all(
    oldBackups.map(backup => {
      const backupRef = ref(database, `deletion-backups/${backup.promptId}`);
      return remove(backupRef);
    })
  );
  
  return oldBackups.length;
}

export async function getTagSuggestions(
  existingTags: string[],
  options?: {
    teamId?: string;
    sharing?: 'private' | 'team' | 'global';
    limit?: number;
  }
): Promise<string[]> {
  if (existingTags.length === 0) return [];

  const promptsRef = ref(database, 'prompts');
  const snapshot = await get(promptsRef);
  
  if (!snapshot.exists()) return [];

  const promptsData = snapshot.val();
  let prompts = Object.keys(promptsData).map(promptId => ({
    id: promptId,
    ...promptsData[promptId]
  })) as Prompt[];

  // Apply filters
  if (options?.sharing) {
    prompts = prompts.filter(p => p.sharing === options.sharing);
  }

  if (options?.teamId) {
    prompts = prompts.filter(p => 
      p.assignedTeams?.includes(options.teamId!) || p.teamId === options.teamId
    );
  }

  // Find prompts that contain any of the existing tags
  const normalizedExistingTags = existingTags.map(tag => tag.toLowerCase().trim());
  const relatedPrompts = prompts.filter(prompt => {
    if (!prompt.tags || !Array.isArray(prompt.tags)) return false;
    
    const promptTags = prompt.tags.map(tag => tag.toLowerCase().trim());
    return normalizedExistingTags.some(existingTag => 
      promptTags.includes(existingTag)
    );
  });

  // Collect all tags from related prompts
  const suggestionMap = new Map<string, number>();
  
  relatedPrompts.forEach(prompt => {
    if (prompt.tags && Array.isArray(prompt.tags)) {
      prompt.tags.forEach(tag => {
        const normalizedTag = tag.toLowerCase().trim();
        if (normalizedTag && !normalizedExistingTags.includes(normalizedTag)) {
          suggestionMap.set(normalizedTag, (suggestionMap.get(normalizedTag) || 0) + 1);
        }
      });
    }
  });

  // Convert to array and sort by frequency
  let suggestions = Array.from(suggestionMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);

  // Apply limit
  if (options?.limit) {
    suggestions = suggestions.slice(0, options.limit);
  }

  return suggestions;
}

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

// Import/Export functions
export async function exportPrompts(options: {
  scope: 'global' | 'team' | 'selected';
  teamId?: string;
  selectedPromptIds?: string[];
  exportedBy: string;
}): Promise<PromptExportData> {
  let prompts: Prompt[] = [];
  let teamAssignments: TeamPromptAssignment[] = [];
  let teamsIncluded: string[] = [];

  const { scope, teamId, selectedPromptIds, exportedBy } = options;

  if (scope === 'global') {
    // Export all prompts
    prompts = await getAllPrompts();
    
    // Get all team assignments
    const assignmentsRef = ref(database, 'team-prompt-assignments');
    const assignmentsSnapshot = await get(assignmentsRef);
    
    if (assignmentsSnapshot.exists()) {
      const allAssignments = assignmentsSnapshot.val();
      Object.keys(allAssignments).forEach(teamId => {
        const teamAssignmentsData = allAssignments[teamId];
        Object.keys(teamAssignmentsData).forEach(promptId => {
          teamAssignments.push(teamAssignmentsData[promptId]);
        });
      });
      teamsIncluded = Object.keys(allAssignments);
    }
  } else if (scope === 'team' && teamId) {
    // Export team-specific prompts and global prompts
    const allPrompts = await getAllPrompts();
    prompts = allPrompts.filter(p => 
      p.sharing === 'global' || 
      (p.sharing === 'team' && p.teamId === teamId) ||
      p.assignedTeams?.includes(teamId)
    );
    
    // Get team assignments for this team
    teamAssignments = await getTeamPromptAssignments(teamId);
    teamsIncluded = [teamId];
  } else if (scope === 'selected' && selectedPromptIds) {
    // Export selected prompts
    const promptPromises = selectedPromptIds.map(id => getPrompt(id));
    const promptResults = await Promise.all(promptPromises);
    prompts = promptResults.filter(p => p !== null) as Prompt[];
    
    // Get team assignments for selected prompts
    for (const promptId of selectedPromptIds) {
      const assignments = await getPromptTeamAssignments(promptId);
      teamAssignments.push(...assignments);
    }
    
    teamsIncluded = Array.from(new Set(teamAssignments.map(a => a.teamId)));
  }

  const exportData: PromptExportData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    exportedBy,
    prompts,
    teamAssignments,
    metadata: {
      totalPrompts: prompts.length,
      teamsIncluded,
      exportScope: scope,
      selectedTeamId: teamId
    }
  };

  return exportData;
}

export async function validateImportData(data: any): Promise<{ valid: boolean; errors: ImportError[] }> {
  const errors: ImportError[] = [];

  // Check if data has required structure
  if (!data || typeof data !== 'object') {
    errors.push({
      type: 'validation',
      message: 'Invalid file format: not a valid JSON object'
    });
    return { valid: false, errors };
  }

  // Check version
  if (!data.version) {
    errors.push({
      type: 'validation',
      message: 'Missing version information'
    });
  }

  // Check prompts array
  if (!Array.isArray(data.prompts)) {
    errors.push({
      type: 'validation',
      message: 'Invalid prompts data: must be an array'
    });
    return { valid: false, errors };
  }

  // Validate each prompt
  data.prompts.forEach((prompt: any, index: number) => {
    if (!prompt.id || typeof prompt.id !== 'string') {
      errors.push({
        type: 'validation',
        message: `Prompt at index ${index}: missing or invalid ID`,
        promptId: prompt.id,
        promptTitle: prompt.title
      });
    }

    if (!prompt.title || typeof prompt.title !== 'string') {
      errors.push({
        type: 'validation',
        message: `Prompt at index ${index}: missing or invalid title`,
        promptId: prompt.id,
        promptTitle: prompt.title
      });
    }

    if (!prompt.content || typeof prompt.content !== 'string') {
      errors.push({
        type: 'validation',
        message: `Prompt at index ${index}: missing or invalid content`,
        promptId: prompt.id,
        promptTitle: prompt.title
      });
    }

    if (!prompt.sharing || !['private', 'team', 'global'].includes(prompt.sharing)) {
      errors.push({
        type: 'validation',
        message: `Prompt at index ${index}: invalid sharing setting`,
        promptId: prompt.id,
        promptTitle: prompt.title
      });
    }

    if (!Array.isArray(prompt.tags)) {
      errors.push({
        type: 'validation',
        message: `Prompt at index ${index}: tags must be an array`,
        promptId: prompt.id,
        promptTitle: prompt.title
      });
    }
  });

  // Validate team assignments if present
  if (data.teamAssignments && !Array.isArray(data.teamAssignments)) {
    errors.push({
      type: 'validation',
      message: 'Invalid team assignments data: must be an array'
    });
  }

  return { valid: errors.length === 0, errors };
}

export async function previewImport(data: PromptExportData, targetTeamId?: string): Promise<ImportPreview> {
  const { valid, errors } = await validateImportData(data);
  
  if (!valid) {
    return {
      totalPrompts: 0,
      newPrompts: [],
      conflictingPrompts: [],
      invalidPrompts: errors,
      teamsToAssign: [],
      estimatedChanges: { creates: 0, updates: 0, skips: 0 }
    };
  }

  const existingPrompts = await getAllPrompts();
  const existingPromptsMap = new Map(existingPrompts.map(p => [p.id, p]));
  
  const newPrompts: Prompt[] = [];
  const conflictingPrompts: ConflictResolution[] = [];
  const invalidPrompts: ImportError[] = [];
  
  let creates = 0;
  let updates = 0;
  let skips = 0;

  for (const importedPrompt of data.prompts) {
    const existingPrompt = existingPromptsMap.get(importedPrompt.id);
    
    if (!existingPrompt) {
      // New prompt
      newPrompts.push(importedPrompt);
      creates++;
    } else {
      // Conflicting prompt - check if content differs
      const hasChanges = 
        existingPrompt.title !== importedPrompt.title ||
        existingPrompt.content !== importedPrompt.content ||
        JSON.stringify(existingPrompt.tags?.sort()) !== JSON.stringify(importedPrompt.tags?.sort()) ||
        existingPrompt.sharing !== importedPrompt.sharing;

      if (hasChanges) {
        conflictingPrompts.push({
          promptId: importedPrompt.id,
          existingPrompt,
          importedPrompt,
          resolution: 'skip', // Default resolution
          reason: 'Prompt with same ID exists but has different content'
        });
        updates++;
      } else {
        skips++;
      }
    }
  }

  // Determine teams that will be assigned
  const teamsToAssign = targetTeamId 
    ? [targetTeamId]
    : Array.from(new Set(data.teamAssignments?.map(a => a.teamId) || []));

  return {
    totalPrompts: data.prompts.length,
    newPrompts,
    conflictingPrompts,
    invalidPrompts,
    teamsToAssign,
    estimatedChanges: { creates, updates, skips }
  };
}

export async function importPrompts(
  data: PromptExportData,
  options: {
    conflictResolutions: Record<string, 'skip' | 'overwrite' | 'create_new'>;
    targetTeamId?: string;
    importedBy: string;
  }
): Promise<ImportResult> {
  const { conflictResolutions, targetTeamId, importedBy } = options;
  
  const { valid, errors } = await validateImportData(data);
  if (!valid) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors,
      conflicts: []
    };
  }

  const existingPrompts = await getAllPrompts();
  const existingPromptsMap = new Map(existingPrompts.map(p => [p.id, p]));
  
  let imported = 0;
  let skipped = 0;
  const importErrors: ImportError[] = [];
  const conflicts: ConflictResolution[] = [];

  for (const importedPrompt of data.prompts) {
    try {
      const existingPrompt = existingPromptsMap.get(importedPrompt.id);
      
      if (!existingPrompt) {
        // New prompt - create it
        const promptToCreate = {
          ...importedPrompt,
          createdBy: importedBy,
          teamId: targetTeamId || importedPrompt.teamId,
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          modifiedBy: importedBy,
          usageCount: 0,
          lastUsed: null,
          assignedTeams: targetTeamId ? [targetTeamId] : (importedPrompt.assignedTeams || []),
          metadata: {
            version: 1,
            changelog: [{
              timestamp: new Date().toISOString(),
              userId: importedBy,
              action: 'created' as const,
              changes: {}
            }]
          }
        };
        
        const promptRef = ref(database, `prompts/${importedPrompt.id}`);
        await set(promptRef, promptToCreate);
        imported++;
        
        // Log the import
        await logPromptUsage(importedPrompt.id, importedBy, targetTeamId || null, 'created');
        
      } else {
        // Handle conflict based on resolution
        const resolution = conflictResolutions[importedPrompt.id] || 'skip';
        
        const conflict: ConflictResolution = {
          promptId: importedPrompt.id,
          existingPrompt,
          importedPrompt,
          resolution,
          reason: 'Prompt with same ID exists'
        };
        conflicts.push(conflict);
        
        if (resolution === 'overwrite') {
          // Update existing prompt
          const updatedPrompt = {
            ...existingPrompt,
            ...importedPrompt,
            lastModified: new Date().toISOString(),
            modifiedBy: importedBy,
            metadata: {
              version: (existingPrompt.metadata?.version || 1) + 1,
              changelog: [
                ...(existingPrompt.metadata?.changelog || []),
                {
                  timestamp: new Date().toISOString(),
                  userId: importedBy,
                  action: 'updated' as const,
                  changes: { source: { old: 'existing', new: 'imported' } }
                }
              ]
            }
          };
          
          const promptRef = ref(database, `prompts/${importedPrompt.id}`);
          await set(promptRef, updatedPrompt);
          imported++;
          
          // Log the update
          await logPromptUsage(importedPrompt.id, importedBy, targetTeamId || null, 'updated');
          
        } else if (resolution === 'create_new') {
          // Create with new ID
          const newId = `${importedPrompt.id}_imported_${Date.now()}`;
          const promptToCreate = {
            ...importedPrompt,
            id: newId,
            createdBy: importedBy,
            teamId: targetTeamId || importedPrompt.teamId,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            modifiedBy: importedBy,
            usageCount: 0,
            lastUsed: null,
            assignedTeams: targetTeamId ? [targetTeamId] : (importedPrompt.assignedTeams || []),
            metadata: {
              version: 1,
              changelog: [{
                timestamp: new Date().toISOString(),
                userId: importedBy,
                action: 'created' as const,
                changes: { source: { old: null, new: 'imported_as_new' } }
              }]
            }
          };
          
          const promptRef = ref(database, `prompts/${newId}`);
          await set(promptRef, promptToCreate);
          imported++;
          
          // Log the creation
          await logPromptUsage(newId, importedBy, targetTeamId || null, 'created');
          
        } else {
          // Skip
          skipped++;
        }
      }
    } catch (error) {
      importErrors.push({
        type: 'system',
        message: `Failed to import prompt: ${error instanceof Error ? error.message : 'Unknown error'}`,
        promptId: importedPrompt.id,
        promptTitle: importedPrompt.title
      });
      skipped++;
    }
  }

  // Import team assignments if specified
  if (targetTeamId && imported > 0) {
    try {
      const importedPromptIds = data.prompts.map(p => p.id);
      await bulkAssignPromptsToTeam(importedPromptIds, targetTeamId, importedBy);
    } catch (error) {
      importErrors.push({
        type: 'system',
        message: `Failed to assign prompts to team: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  return {
    success: importErrors.length === 0,
    imported,
    skipped,
    errors: importErrors,
    conflicts
  };
}

// Bulk Operations Functions

export interface BulkOperationResult {
  successful: string[];
  failed: { promptId: string; error: string }[];
}

export async function bulkDeletePrompts(
  promptIds: string[],
  deletedBy: string,
  onProgress?: (completed: number, total: number, current?: string) => void
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    successful: [],
    failed: []
  };

  for (let i = 0; i < promptIds.length; i++) {
    const promptId = promptIds[i];
    
    try {
      onProgress?.(i, promptIds.length, promptId);
      
      // Get prompt data for logging
      const prompt = await getPrompt(promptId);
      if (!prompt) {
        result.failed.push({
          promptId,
          error: 'Prompt not found'
        });
        continue;
      }

      // Check permissions
      const currentUser = await getCurrentUser();
      if (!canDeletePrompt(currentUser, prompt)) {
        result.failed.push({
          promptId,
          error: 'Unauthorized: Only super users can delete prompts'
        });
        continue;
      }

      // Remove team assignments first
      if (prompt.assignedTeams && prompt.assignedTeams.length > 0) {
        for (const teamId of prompt.assignedTeams) {
          await unassignPromptFromTeam(promptId, teamId, deletedBy);
        }
      }

      // Delete the prompt
      const promptRef = ref(database, `prompts/${promptId}`);
      await remove(promptRef);

      // Log the deletion
      await logPromptUsage(promptId, deletedBy, prompt.teamId || null, 'deleted' as any);

      result.successful.push(promptId);
    } catch (error) {
      result.failed.push({
        promptId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  onProgress?.(promptIds.length, promptIds.length);
  return result;
}

export async function bulkAddTagsToPrompts(
  promptIds: string[],
  tagsToAdd: string[],
  modifiedBy: string,
  onProgress?: (completed: number, total: number, current?: string) => void
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    successful: [],
    failed: []
  };

  // Normalize tags
  const normalizedTags = tagsToAdd.map(tag => tag.toLowerCase().trim());

  for (let i = 0; i < promptIds.length; i++) {
    const promptId = promptIds[i];
    
    try {
      onProgress?.(i, promptIds.length, promptId);
      
      const prompt = await getPrompt(promptId);
      if (!prompt) {
        result.failed.push({
          promptId,
          error: 'Prompt not found'
        });
        continue;
      }

      // Check permissions
      const currentUser = await getCurrentUser();
      if (!canEditPrompt(currentUser, prompt)) {
        result.failed.push({
          promptId,
          error: 'Unauthorized: Only super users can edit prompts'
        });
        continue;
      }

      // Add new tags (avoid duplicates)
      const currentTags = prompt.tags || [];
      const currentTagsLower = currentTags.map(tag => tag.toLowerCase());
      const newTags = normalizedTags.filter(tag => !currentTagsLower.includes(tag));
      
      if (newTags.length === 0) {
        result.successful.push(promptId);
        continue;
      }

      const updatedTags = [...currentTags, ...newTags];
      
      // Update the prompt
      await updatePrompt(promptId, { tags: updatedTags }, modifiedBy);
      
      result.successful.push(promptId);
    } catch (error) {
      result.failed.push({
        promptId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  onProgress?.(promptIds.length, promptIds.length);
  return result;
}

export async function bulkRemoveTagsFromPrompts(
  promptIds: string[],
  tagsToRemove: string[],
  modifiedBy: string,
  onProgress?: (completed: number, total: number, current?: string) => void
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    successful: [],
    failed: []
  };

  // Normalize tags
  const normalizedTagsToRemove = tagsToRemove.map(tag => tag.toLowerCase().trim());

  for (let i = 0; i < promptIds.length; i++) {
    const promptId = promptIds[i];
    
    try {
      onProgress?.(i, promptIds.length, promptId);
      
      const prompt = await getPrompt(promptId);
      if (!prompt) {
        result.failed.push({
          promptId,
          error: 'Prompt not found'
        });
        continue;
      }

      // Check permissions
      const currentUser = await getCurrentUser();
      if (!canEditPrompt(currentUser, prompt)) {
        result.failed.push({
          promptId,
          error: 'Unauthorized: Only super users can edit prompts'
        });
        continue;
      }

      // Remove specified tags
      const currentTags = prompt.tags || [];
      const updatedTags = currentTags.filter(tag => 
        !normalizedTagsToRemove.includes(tag.toLowerCase())
      );
      
      if (updatedTags.length === currentTags.length) {
        // No tags were removed
        result.successful.push(promptId);
        continue;
      }

      // Update the prompt
      await updatePrompt(promptId, { tags: updatedTags }, modifiedBy);
      
      result.successful.push(promptId);
    } catch (error) {
      result.failed.push({
        promptId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  onProgress?.(promptIds.length, promptIds.length);
  return result;
}

export async function bulkAssignPromptsToTeamWithProgress(
  promptIds: string[],
  teamId: string,
  assignedBy: string,
  permissions: { canEdit: boolean; canDelete: boolean; canReassign: boolean } = {
    canEdit: false,
    canDelete: false,
    canReassign: false
  },
  onProgress?: (completed: number, total: number, current?: string) => void
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    successful: [],
    failed: []
  };

  for (let i = 0; i < promptIds.length; i++) {
    const promptId = promptIds[i];
    
    try {
      onProgress?.(i, promptIds.length, promptId);
      
      // Check if prompt exists
      const prompt = await getPrompt(promptId);
      if (!prompt) {
        result.failed.push({
          promptId,
          error: 'Prompt not found'
        });
        continue;
      }

      // Check if already assigned
      if (prompt.assignedTeams && prompt.assignedTeams.includes(teamId)) {
        result.successful.push(promptId);
        continue;
      }

      await assignPromptToTeam(promptId, teamId, assignedBy, permissions);
      result.successful.push(promptId);
    } catch (error) {
      result.failed.push({
        promptId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  onProgress?.(promptIds.length, promptIds.length);
  return result;
}

export async function bulkUnassignPromptsFromTeamWithProgress(
  promptIds: string[],
  teamId: string,
  unassignedBy: string,
  onProgress?: (completed: number, total: number, current?: string) => void
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    successful: [],
    failed: []
  };

  for (let i = 0; i < promptIds.length; i++) {
    const promptId = promptIds[i];
    
    try {
      onProgress?.(i, promptIds.length, promptId);
      
      // Check if prompt exists
      const prompt = await getPrompt(promptId);
      if (!prompt) {
        result.failed.push({
          promptId,
          error: 'Prompt not found'
        });
        continue;
      }

      // Check if assigned to this team
      if (!prompt.assignedTeams || !prompt.assignedTeams.includes(teamId)) {
        result.successful.push(promptId);
        continue;
      }

      await unassignPromptFromTeam(promptId, teamId, unassignedBy);
      result.successful.push(promptId);
    } catch (error) {
      result.failed.push({
        promptId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  onProgress?.(promptIds.length, promptIds.length);
  return result;
}

// Utility function to execute bulk operations with progress tracking
export async function executeBulkOperation(
  operation: {
    type: 'delete' | 'add-tags' | 'remove-tags' | 'assign-team' | 'unassign-team';
    data?: any;
  },
  promptIds: string[],
  userId: string,
  onProgress?: (completed: number, total: number, current?: string) => void
): Promise<BulkOperationResult> {
  switch (operation.type) {
    case 'delete':
      return await bulkDeletePrompts(promptIds, userId, onProgress);
      
    case 'add-tags':
      if (!operation.data || !Array.isArray(operation.data)) {
        throw new Error('Tags data is required for add-tags operation');
      }
      return await bulkAddTagsToPrompts(promptIds, operation.data, userId, onProgress);
      
    case 'remove-tags':
      if (!operation.data || !Array.isArray(operation.data)) {
        throw new Error('Tags data is required for remove-tags operation');
      }
      return await bulkRemoveTagsFromPrompts(promptIds, operation.data, userId, onProgress);
      
    case 'assign-team':
      if (!operation.data) {
        throw new Error('Team ID is required for assign-team operation');
      }
      return await bulkAssignPromptsToTeamWithProgress(
        promptIds, 
        operation.data, 
        userId, 
        { canEdit: false, canDelete: false, canReassign: false },
        onProgress
      );
      
    case 'unassign-team':
      if (!operation.data) {
        throw new Error('Team ID is required for unassign-team operation');
      }
      return await bulkUnassignPromptsFromTeamWithProgress(
        promptIds, 
        operation.data, 
        userId, 
        onProgress
      );
      
    default:
      throw new Error(`Unknown bulk operation type: ${operation.type}`);
  }
}