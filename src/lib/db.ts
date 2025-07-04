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
  equalTo
} from 'firebase/database';
import { database } from './firebase';
import type { Prompt, User, TeamMember, Team } from './types';

// Database structure:
// /users/{userId} -> User
// /teams/{teamId} -> Team
// /teams/{teamId}/members/{userId} -> TeamMember
// /prompts/{promptId} -> Prompt

// User operations
export async function createUser(userData: Omit<User, 'id'>): Promise<string> {
  // Normalize email to lowercase for consistency
  const normalizedUserData = {
    ...userData,
    email: userData.email.toLowerCase()
  };
  
  const usersRef = ref(database, 'users');
  const newUserRef = push(usersRef);
  await set(newUserRef, normalizedUserData);
  
  // Also create email verification entry for first-time login
  await createEmailVerificationEntry(normalizedUserData.email, newUserRef.key!, normalizedUserData.teamId);
  
  return newUserRef.key!;
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
  // Normalize email to lowercase for consistent lookup
  const normalizedEmail = email.toLowerCase();
  const usersRef = ref(database, 'users');
  const userQuery = query(usersRef, orderByChild('email'), equalTo(normalizedEmail));
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
  await set(userRef, updates);
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
  // Normalize email to lowercase for consistency
  const normalizedEmail = email.toLowerCase();
  const emailKey = normalizedEmail.replace(/[.@]/g, '_'); // Firebase keys can't contain . or @
  const verificationRef = ref(database, `email-verification/${emailKey}`);
  await set(verificationRef, {
    email: normalizedEmail,
    userId: userId,
    teamId: teamId,
    createdAt: new Date().toISOString()
  });
}

// Utility function to create missing email verification entries for all existing users
export async function createMissingEmailVerificationEntries(): Promise<{ created: number; errors: string[] }> {
  const users = await getAllUsers();
  let created = 0;
  const errors: string[] = [];
  
  for (const user of users) {
    try {
      // Check if verification entry already exists
      const emailKey = user.email.replace(/[.@]/g, '_');
      const verificationRef = ref(database, `email-verification/${emailKey}`);
      const snapshot = await get(verificationRef);
      
      if (!snapshot.exists()) {
        // Create missing verification entry
        await createEmailVerificationEntry(user.email, user.id, user.teamId);
        created++;
        console.log(`Created verification entry for ${user.email}`);
      }
    } catch (error) {
      const errorMsg = `Failed to create verification entry for ${user.email}: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }
  
  return { created, errors };
}

export async function verifyEmailExists(email: string): Promise<{ exists: boolean; userId?: string; email?: string; teamId?: string }> {
  // Normalize email to lowercase for consistent checking
  const normalizedEmail = email.toLowerCase();
  
  // Check if it's the super user account first
  if (normalizedEmail === 'masterprompter@admin.com') {
    return {
      exists: true,
      userId: 'super_user',
      email: normalizedEmail,
      teamId: undefined // Super user doesn't belong to a specific team
    };
  }
  
  // First, check email verification table
  const emailKey = normalizedEmail.replace(/[.@]/g, '_');
  const verificationRef = ref(database, `email-verification/${emailKey}`);
  const snapshot = await get(verificationRef);
  
  if (snapshot.exists()) {
    const data = snapshot.val();
    return { 
      exists: true, 
      userId: data.userId,
      email: data.email,
      teamId: data.teamId
    };
  }
  
  // If not found in verification table, check if user exists in main users table
  // This handles cases where users were added but verification entry failed
  const user = await getUserByEmail(normalizedEmail);
  if (user) {
    console.log(`Found user ${normalizedEmail} in users table but missing verification entry. Creating it now...`);
    
    // Create the missing verification entry
    try {
      await createEmailVerificationEntry(user.email, user.id, user.teamId);
      return {
        exists: true,
        userId: user.id,
        email: user.email,
        teamId: user.teamId
      };
    } catch (error) {
      console.error('Failed to create verification entry for existing user:', error);
      // Still return that the user exists, even if verification entry creation failed
      return {
        exists: true,
        userId: user.id,
        email: user.email,
        teamId: user.teamId
      };
    }
  }
  
  return { exists: false };
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
  await set(newPromptRef, prompt);
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
  
  if (snapshot.exists()) {
    const currentData = snapshot.val();
    await set(promptRef, { ...currentData, ...updates });
  }
}

export async function deletePrompt(promptId: string): Promise<void> {
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
  let promptsRef;
  
  if (userId) {
    // For private/personal view: only user's own prompts
    promptsRef = query(ref(database, 'prompts'), orderByChild('createdBy'), equalTo(userId));
  } else {
    // For team/community views: subscribe to all prompts and filter client-side
    promptsRef = ref(database, 'prompts');
  }
  
  const unsubscribe = onValue(promptsRef, (snapshot) => {
    if (snapshot.exists()) {
      const promptsData = snapshot.val();
      let prompts = Object.keys(promptsData).map(promptId => ({
        id: promptId,
        ...promptsData[promptId]
      }));
      
      // Apply cascading visibility filter
      if (sharing === 'team') {
        // Team view: show team prompts (only from same team) AND global prompts
        prompts = prompts.filter(p => 
          p.sharing === 'global' || 
          (p.sharing === 'team' && p.teamId === userTeamId)
        );
      } else if (sharing === 'global') {
        // Community view: only global prompts
        prompts = prompts.filter(p => p.sharing === 'global');
      }
      // For userId queries (private view), no additional filtering needed
      
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