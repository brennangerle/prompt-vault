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
import type { Prompt, User, TeamMember, Team } from './types';
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
  // Check if current user has permission to edit prompts
  const currentUser = await getCurrentUser();
  if (!canEditPrompt(currentUser)) {
    throw new Error('Unauthorized: Only the prompt keeper can edit prompts');
  }

  const promptRef = ref(database, `prompts/${promptId}`);
  const snapshot = await get(promptRef);
  
  if (snapshot.exists()) {
    const currentData = snapshot.val();
    await set(promptRef, { ...currentData, ...updates });
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

""// Real-time listeners
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