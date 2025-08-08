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
import { createUser, createUserWithUid, getUserByEmail, addTeamMember, verifyEmailExists, createEmailVerificationEntry, updateUser } from './db';
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
  email: 'masterkeeper@admin.com',
  password: 'password',
  userRole: 'super_user' as const
};

export async function loginUser(email: string, password: string = 'password123'): Promise<User> {
  console.log('Login attempt for:', email);
  try {
    // Check if it's the super user account
    if (email === superUserAccount.email && password === superUserAccount.password) {
      console.log('Super user login detected');
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
          await createUserWithEmailAndPassword(auth, email, password);
        } else {
          throw authError;
        }
      }
      return await createOrGetSuperUser();
    }
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    let user = await getUserByEmail(email);
    
    if (!user) {
      const testerData = testerAccounts[email as keyof typeof testerAccounts];
      const userData: Omit<User, 'id'> = {
        email,
        teamId: testerData?.teamId || 'custom',
        role: 'user'
      };
      
      await createUserWithUid(firebaseUser.uid, userData);
      user = { id: firebaseUser.uid, ...userData };
      
      if (testerData) {
        const teamMember: TeamMember = {
          id: firebaseUser.uid,
          email,
          role: testerData.role,
          joinedAt: new Date().toISOString()
        };
        await addTeamMember(testerData.teamId, teamMember);
      }
    } else {
      if (!user.role) {
        user.role = 'user';
      }
    }
    
    return user;
  } catch (error: any) {
    console.error('Login error details:', error);
    
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      const testerData = testerAccounts[email as keyof typeof testerAccounts];
      if (testerData) {
        return await createTesterAccount(email);
      }
      
      const dbUser = await getUserByEmail(email);
      if (dbUser) {
        throw new Error('User exists in database but no Firebase Auth account. Please use "First time login" to set up your password.');
      }
    }
    
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
  
  const userCredential = await createUserWithEmailAndPassword(auth, email, 'password123');
  const firebaseUser = userCredential.user;
  
  const userData: Omit<User, 'id'> = {
    email,
    teamId: testerData.teamId,
    role: 'user'
  };
  
  await createUserWithUid(firebaseUser.uid, userData);
  const user = { id: firebaseUser.uid, ...userData };
  
  const teamMember: TeamMember = {
    id: firebaseUser.uid,
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
    let user = await getUserByEmail(superUserAccount.email);
    
    if (!user) {
      console.log('Creating super user in database...');
      const userData: Omit<User, 'id'> = {
        email: superUserAccount.email,
        role: 'super_user'
      };
      
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error('Super user not authenticated after creation/sign-in');
      }
      await createUserWithUid(firebaseUser.uid, userData);
      user = { id: firebaseUser.uid, ...userData };
      console.log('Super user created with ID:', firebaseUser.uid);
    } else {
      console.log('Super user found:', user);
      if (user.role !== 'super_user') {
        console.log('Correcting super user role in database...');
        await updateUser(user.id, { role: 'super_user' });
        user.role = 'super_user';
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
