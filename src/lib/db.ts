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
import type { Prompt, User, TeamMember } from './types';

// Database structure:
// /users/{userId} -> User
// /teams/{teamId}/members/{userId} -> TeamMember
// /prompts/{promptId} -> Prompt

// User operations
export async function createUser(userData: Omit<User, 'id'>): Promise<string> {
  const usersRef = ref(database, 'users');
  const newUserRef = push(usersRef);
  await set(newUserRef, userData);
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