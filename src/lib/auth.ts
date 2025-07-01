'use client';

import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from './firebase';
import { createUser, getUserByEmail, addTeamMember } from './db';
import type { User, TeamMember } from './types';

// Predefined tester accounts
const testerAccounts = {
  'tester1@t1.com': { userId: 'tester1', teamId: 't1', role: 'admin' as const },
  'tester2@t1.com': { userId: 'tester2', teamId: 't1', role: 'member' as const },
  'tester3@t2.com': { userId: 'tester3', teamId: 't2', role: 'admin' as const },
  'tester4@t2.com': { userId: 'tester4', teamId: 't2', role: 'member' as const },
};

export async function loginUser(email: string, password: string = 'password123'): Promise<User> {
  try {
    // Try to sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Get or create user data in database
    let user = await getUserByEmail(email);
    
    if (!user) {
      // Create new user if doesn't exist
      const testerData = testerAccounts[email as keyof typeof testerAccounts];
      const userData: Omit<User, 'id'> = {
        email,
        teamId: testerData?.teamId || 'custom'
      };
      
      const userId = await createUser(userData);
      user = { id: userId, ...userData };
      
      // Add to team if it's a tester account
      if (testerData) {
        const teamMember: TeamMember = {
          id: userId,
          email,
          role: testerData.role,
          joinedAt: new Date().toISOString()
        };
        await addTeamMember(testerData.teamId, teamMember);
      }
    }
    
    return user;
  } catch (error: any) {
    // If user doesn't exist, create them (for tester accounts)
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      return await createTesterAccount(email);
    }
    throw error;
  }
}

async function createTesterAccount(email: string): Promise<User> {
  const testerData = testerAccounts[email as keyof typeof testerAccounts];
  
  if (!testerData) {
    throw new Error('Invalid tester account');
  }
  
  // Create Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(auth, email, 'password123');
  const firebaseUser = userCredential.user;
  
  // Create user data in database
  const userData: Omit<User, 'id'> = {
    email,
    teamId: testerData.teamId
  };
  
  const userId = await createUser(userData);
  const user = { id: userId, ...userData };
  
  // Add to team
  const teamMember: TeamMember = {
    id: userId,
    email,
    role: testerData.role,
    joinedAt: new Date().toISOString()
  };
  await addTeamMember(testerData.teamId, teamMember);
  
  return user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuthState(callback: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function getCurrentUser(): Promise<User | null> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;
  
  return await getUserByEmail(firebaseUser.email!);
}