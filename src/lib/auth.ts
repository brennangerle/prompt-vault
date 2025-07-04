'use client';

import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from './firebase';
import { createUser, getUserByEmail, addTeamMember, verifyEmailExists, createEmailVerificationEntry, updateUser } from './db';
import type { User, TeamMember } from './types';

// Predefined tester accounts
const testerAccounts = {
  'tester1@t1.com': { userId: 'tester1', teamId: 't1', role: 'admin' as const },
  'tester2@t1.com': { userId: 'tester2', teamId: 't1', role: 'member' as const },
  'tester3@t2.com': { userId: 'tester3', teamId: 't2', role: 'admin' as const },
  'tester4@t2.com': { userId: 'tester4', teamId: 't2', role: 'member' as const },
};

// Super user account
const superUserAccount = {
  email: 'masterprompter@admin.com',
  password: 'password',
  userRole: 'super_user' as const
};

export async function loginUser(email: string, password: string = 'password123'): Promise<User> {
  console.log('Login attempt for:', email);
  try {
    // Check if it's the super user account
    if (email === superUserAccount.email && password === superUserAccount.password) {
      console.log('Super user login detected');
      // Try to sign in with Firebase Auth first, create if doesn't exist
      try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log('Super user Firebase auth successful');
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
          console.log('Creating Firebase auth for super user...');
          await createUserWithEmailAndPassword(auth, email, password);
          console.log('Super user Firebase auth created');
        } else {
          throw authError;
        }
      }
      return await createOrGetSuperUser();
    }
    
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
        teamId: testerData?.teamId || 'custom',
        role: 'user'
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
    } else {
      // Ensure existing users have a role (backward compatibility)
      if (!user.role) {
        user.role = 'user';
      }
    }
    
    return user;
  } catch (error: any) {
    console.error('Login error details:', error);
    
    // If user doesn't exist, check if it's super user or tester account
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      // Check if it's a super user trying to login
      if (email === superUserAccount.email && password === superUserAccount.password) {
        return await createOrGetSuperUser();
      }
      
      // Check if it's a tester account
      const testerData = testerAccounts[email as keyof typeof testerAccounts];
      if (testerData) {
        return await createTesterAccount(email);
      }
      
      // For regular users, check if they exist in database but not in Firebase Auth
      try {
        const dbUser = await getUserByEmail(email);
        if (dbUser) {
          throw new Error('User exists in database but no Firebase Auth account. Please use "First time login" to set up your password.');
        }
      } catch (dbError: any) {
        console.error('Database access error:', dbError);
        if (dbError.code === 'PERMISSION_DENIED') {
          throw new Error('Permission denied: Unable to verify user. Please check your authentication.');
        }
      }
    }
    
    // Provide more specific error messages
    if (error.code === 'PERMISSION_DENIED') {
      throw new Error('Permission denied: Database access forbidden. Please contact administrator.');
    } else if (error.code === 'auth/invalid-credential') {
      throw new Error('Invalid email or password. Please check your credentials.');
    } else if (error.code === 'auth/user-not-found') {
      throw new Error('User not found. Please contact your team admin to be added.');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Incorrect password. Please try again.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed login attempts. Please try again later.');
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
    teamId: testerData.teamId,
    role: 'user'
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

async function createOrGetSuperUser(): Promise<User> {
  try {
    console.log('Attempting to get super user from database...');
    // Check if super user already exists
    let user = await getUserByEmail(superUserAccount.email);
    
    if (!user) {
      console.log('Creating super user in database...');
      // Create super user in database
      const userData: Omit<User, 'id'> = {
        email: superUserAccount.email,
        role: 'super_user'
      };
      
      const userId = await createUser(userData);
      user = { id: userId, ...userData };
      console.log('Super user created with ID:', userId);
    } else {
      console.log('Super user found:', user);
      // Ensure the role is set correctly
      if (user.role !== 'super_user') {
        console.log('Correcting super user role in database...');
        await updateUser(user.id, { ...user, role: 'super_user' });
        user.role = 'super_user';
      }
      
      // Check if email verification entry exists, create if missing
      const emailVerification = await verifyEmailExists(superUserAccount.email);
      if (!emailVerification.exists) {
        console.log('Creating missing email verification entry for super user...');
        await createEmailVerificationEntry(superUserAccount.email, user.id);
      }
    }
    
    return user;
  } catch (error) {
    console.error('Error in createOrGetSuperUser:', error);
    throw error;
  }
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

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}