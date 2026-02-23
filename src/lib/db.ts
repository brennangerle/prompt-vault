import {
  ref,
  push,
  set,
  get,
  remove,
  onValue,
  query,
  orderByChild,
  equalTo,
  Query,
  DatabaseReference,
  update
} from 'firebase/database';
import { database } from './firebase';
import type { Prompt, User, TeamMember, Team } from './types';
import { canEditPrompt, canDeletePrompt } from './permissions';
import { getCurrentUser } from './auth';
import { logger } from './logger';

// Email verification expiration time (7 days in milliseconds)
const EMAIL_VERIFICATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// Database structure:
// /users/{userId} -> User
// /teams/{teamId} -> Team
// /teams/{teamId}/members/{userId} -> TeamMember
// /prompts/{promptId} -> Prompt

// User operations
export async function createUser(userData: Omit<User, 'id'>): Promise<string> {
  logger.debug('Creating user', { context: { email: userData.email } });
  const usersRef = ref(database, 'users');
  const newUserRef = push(usersRef);
  const normalizedUserData: Omit<User, 'id'> = {
    ...userData,
    email: userData.email.toLowerCase()
  };
  await set(newUserRef, normalizedUserData);
  logger.debug('User created', { context: { userId: newUserRef.key } });

  // Also create email verification entry for first-time login
  await createEmailVerificationEntry(normalizedUserData.email, newUserRef.key!, normalizedUserData.teamId);

  return newUserRef.key!;
}

export async function createUserWithUid(userId: string, userData: Omit<User, 'id'>): Promise<void> {
  logger.debug('Creating user with UID', { context: { userId, email: userData.email } });
  const userRef = ref(database, `users/${userId}`);
  const normalizedUserData: Omit<User, 'id'> = {
    ...userData,
    email: userData.email.toLowerCase()
  };
  await set(userRef, normalizedUserData);
  logger.debug('User created', { context: { userId } });

  // Also create email verification entry for first-time login
  await createEmailVerificationEntry(normalizedUserData.email, userId, normalizedUserData.teamId);
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
  try {
    const normalizedEmail = email.toLowerCase();
    // Try direct query first (works when authenticated)
    const usersRef = ref(database, 'users');
    const userQuery = query(usersRef, orderByChild('email'), equalTo(normalizedEmail));
    const snapshot = await get(userQuery);
    
    if (snapshot.exists()) {
      const userData = snapshot.val();
      const userId = Object.keys(userData)[0];
      return { id: userId, ...userData[userId] };
    }
    return null;
  } catch (error: any) {
    // If permission denied, try email verification lookup (works without auth)
    if (error.code === 'PERMISSION_DENIED') {
      console.log('Permission denied on users query, trying email verification lookup');
      const emailVerification = await verifyEmailExists(email);
      
      if (emailVerification.exists && emailVerification.userId) {
        // Now try to get the user data directly if we have the userId
        try {
          const userRef = ref(database, `users/${emailVerification.userId}`);
          const userSnapshot = await get(userRef);
          
          if (userSnapshot.exists()) {
            return { id: emailVerification.userId, ...userSnapshot.val() };
          }
        } catch (userError) {
          // If we still can't access user data, return a minimal user object
          return {
            id: emailVerification.userId,
            email: emailVerification.email!,
            teamId: emailVerification.teamId,
            role: 'user'
          } as User;
        }
      }
      return null;
    }
    
    // Re-throw other errors
    throw error;
  }
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<void> {
  const userRef = ref(database, `users/${userId}`);
  
  // Filter out undefined values to prevent Firebase errors
  const filteredUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, value]) => value !== undefined)
  ) as Partial<User>;

  // Normalize email if present
  if (filteredUpdates.email) {
    filteredUpdates.email = filteredUpdates.email.toLowerCase();
  }
  
  await update(userRef, filteredUpdates as any);
}

export async function deleteUserRecord(userId: string): Promise<void> {
  const userRef = ref(database, `users/${userId}`);
  await remove(userRef);
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
// SECURITY NOTE: This data is publicly readable. The userId is required for the
// first-time login flow but exposes user mapping. Consider adding server-side
// verification in the future.
export async function createEmailVerificationEntry(email: string, userId: string, teamId?: string): Promise<void> {
  const normalizedEmail = email.toLowerCase();
  const emailKey = normalizedEmail.replace(/[.@]/g, '_'); // Firebase keys can't contain . or @
  const verificationRef = ref(database, `email-verification/${emailKey}`);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + EMAIL_VERIFICATION_EXPIRY_MS);

  // Create data object with expiration
  const verificationData: {
    email: string;
    userId: string;
    createdAt: string;
    expiresAt: string;
    teamId?: string;
  } = {
    email: normalizedEmail,
    userId: userId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  // Only add teamId if it's defined
  if (teamId) {
    verificationData.teamId = teamId;
  }

  logger.debug('Creating email verification entry', { context: { email: normalizedEmail } });
  await set(verificationRef, verificationData);
  logger.debug('Email verification entry created');
}

export async function verifyEmailExists(email: string): Promise<{
  exists: boolean;
  expired?: boolean;
  userId?: string;
  email?: string;
  teamId?: string;
}> {
  const normalizedEmail = email.toLowerCase();
  const emailKey = normalizedEmail.replace(/[.@]/g, '_');
  const verificationRef = ref(database, `email-verification/${emailKey}`);
  logger.debug('Checking email verification', { context: { email: normalizedEmail } });

  const snapshot = await get(verificationRef);

  if (snapshot.exists()) {
    const data = snapshot.val();

    // Check if entry has expired
    if (data.expiresAt) {
      const expiresAt = new Date(data.expiresAt);
      if (expiresAt < new Date()) {
        logger.debug('Email verification entry expired', { context: { email: normalizedEmail } });
        return { exists: true, expired: true };
      }
    }

    logger.debug('Email verification found', { context: { email: normalizedEmail } });
    return {
      exists: true,
      expired: false,
      userId: data.userId,
      email: data.email,
      teamId: data.teamId
    };
  }

  logger.debug('Email verification entry not found', { context: { email: normalizedEmail } });
  return { exists: false };
}

// Utility function to ensure all users have email verification entries
export async function ensureEmailVerificationEntries(): Promise<void> {
  const users = await getAllUsers();
  logger.info('Checking email verification entries', { context: { userCount: users.length } });

  // Batch fetch all existing verification entries to avoid N+1 queries
  const existingEntries = await listEmailVerificationEntries();
  const entryMap = new Map(existingEntries.map(entry => [entry.email.toLowerCase(), entry]));

  for (const user of users) {
    const normalizedEmail = user.email.toLowerCase();
    const entry = entryMap.get(normalizedEmail);

    if (!entry || entry.expired) {
      logger.debug('Creating/refreshing email verification entry', { context: { email: user.email } });
      await createEmailVerificationEntry(user.email, user.id, user.teamId);
    }
  }
  logger.info('Email verification entries check complete');
}

// Utility function to list all email verification entries
export async function listEmailVerificationEntries(): Promise<Array<{
  key: string;
  email: string;
  createdAt?: string;
  expiresAt?: string;
  teamId?: string;
  expired: boolean;
}>> {
  const emailVerificationRef = ref(database, 'email-verification');
  const snapshot = await get(emailVerificationRef);

  if (snapshot.exists()) {
    const data = snapshot.val();
    const now = new Date();
    return Object.entries(data).map(([key, value]) => {
      const entry = value as { email: string; createdAt?: string; expiresAt?: string; teamId?: string };
      const expired = entry.expiresAt ? new Date(entry.expiresAt) < now : false;
      return { key, ...entry, expired };
    });
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
  const promptWithTimestamp = {
    ...prompt,
    createdAt: new Date().toISOString()
  };
  await set(newPromptRef, promptWithTimestamp);
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

export async function updatePrompt(promptId: string, updates: Partial<Prompt>): Promise<void> {
  const promptRef = ref(database, `prompts/${promptId}`);
  const snapshot = await get(promptRef);
  
  if (!snapshot.exists()) {
    throw new Error('Prompt not found');
  }

  const currentData = snapshot.val();
  const prompt = { id: promptId, ...currentData };

  // Check if current user has permission to edit this specific prompt
  const currentUser = await getCurrentUser();
  if (!canEditPrompt(currentUser, prompt)) {
    throw new Error('Unauthorized: You can only edit prompts you created');
  }

  await set(promptRef, { ...currentData, ...updates });
}

export async function deletePrompt(promptId: string): Promise<void> {
  // Get the prompt first to check ownership
  const prompt = await getPrompt(promptId);
  if (!prompt) {
    throw new Error('Prompt not found');
  }

  // Check if current user has permission to delete this specific prompt
  const currentUser = await getCurrentUser();
  if (!canDeletePrompt(currentUser, prompt)) {
    throw new Error('Unauthorized: You can only delete prompts you created');
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
  sharing: 'private' | 'team' | 'global'
): Promise<Prompt[]> {
  const promptsRef = ref(database, 'prompts');
  const sharingQuery = query(promptsRef, orderByChild('sharing'), equalTo(sharing));
  const snapshot = await get(sharingQuery);

  if (snapshot && snapshot.exists()) {
    const promptsData = snapshot.val();
    let prompts = Object.keys(promptsData).map(promptId => ({
      id: promptId,
      ...promptsData[promptId]
    }));
    return prompts;
  }
  return [];
}

// Real-time listeners
export function subscribeToPrompts(
  callback: (prompts: Prompt[]) => void,
  userId?: string,
  sharing?: 'private' | 'team' | 'global'
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
    return unsubscribe;
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
    return unsubscribe;
  }

  if (sharing === 'team') {
    // For team view: prompts with team sharing
    promptsRef = query(ref(database, 'prompts'), orderByChild('sharing'), equalTo('team'));
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
    return unsubscribe;
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
  return unsubscribe;
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
  
  return unsubscribe;
}