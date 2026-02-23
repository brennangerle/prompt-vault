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
import { createUserWithUid, getUserByEmail, addTeamMember, updateUser, getUser, deleteUserRecord } from './db';
import type { User, TeamMember } from './types';
import { logger } from './logger';
import { checkLoginRateLimit, checkPasswordResetRateLimit, resetRateLimit } from './rate-limit';
import { auditUserLogin } from './audit';

// SECURITY WARNING: Tester accounts should be disabled in production
// These accounts auto-create with weak passwords for development/testing only
const ENABLE_TESTER_ACCOUNTS = process.env.NEXT_PUBLIC_ENABLE_TESTER_ACCOUNTS === 'true';

const testerAccounts = ENABLE_TESTER_ACCOUNTS ? {
  'tester1@t1.com': { userId: 'tester1', teamId: 't1', role: 'admin' as const },
  'tester2@t1.com': { userId: 'tester2', teamId: 't1', role: 'member' as const },
  'tester3@t2.com': { userId: 'tester3', teamId: 't2', role: 'admin' as const },
  'tester4@t2.com': { userId: 'tester4', teamId: 't2', role: 'member' as const },
} : {};

// SECURITY WARNING: Super user credentials MUST be set via environment variables in production
// Never use default/hardcoded credentials in a production environment
const superUserAccount = {
  email: process.env.NEXT_PUBLIC_SUPER_USER_EMAIL || 'masterkeeper@admin.com',
  password: process.env.SUPER_USER_PASSWORD || 'password',
  userRole: 'super_user' as const
};

// Log warning if using default credentials (development only)
if (typeof window !== 'undefined' && superUserAccount.password === 'password') {
  logger.security('Using default super user credentials. Set SUPER_USER_PASSWORD env var for production.');
}

export async function loginUser(email: string, password: string = 'password123'): Promise<User> {
  logger.debug('Login attempt', { context: { email } });

  // Check rate limit before attempting login
  const rateLimit = checkLoginRateLimit(email);
  if (rateLimit.isLimited) {
    const resetMinutes = Math.ceil(rateLimit.resetIn / 60000);
    logger.security('Login rate limit exceeded', { context: { email, resetIn: rateLimit.resetIn } });
    throw new Error(`Too many login attempts. Please try again in ${resetMinutes} minutes.`);
  }

  try {
    // Check if it's the super user account
    if (email === superUserAccount.email && password === superUserAccount.password) {
      logger.debug('Super user login detected');
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (authError: unknown) {
        const authErr = authError as { code?: string };
        if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
          await createUserWithEmailAndPassword(auth, email, password);
        } else {
          throw authError;
        }
      }
      const superUser = await createOrGetSuperUser();
      // Reset rate limit on successful login
      resetRateLimit(email, 'login');
      // Audit log super user login
      await auditUserLogin(superUser.id, superUser.email, true);
      return superUser;
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Prefer UID-based lookup after sign-in to avoid collection query permissions
    let user = await getUser(firebaseUser.uid);
    if (!user) {
      // Fallback to email-based lookup if needed
      user = await getUserByEmail(email);
    }

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

    // Reset rate limit on successful login
    resetRateLimit(email, 'login');
    // Audit log successful login
    await auditUserLogin(user.id, user.email, user.role === 'super_user');

    return user;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    logger.error('Login failed', error, { context: { email, errorCode: err.code } });

    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
      const testerData = testerAccounts[email as keyof typeof testerAccounts];
      if (testerData) {
        return await createTesterAccount(email);
      }

      const dbUser = await getUserByEmail(email);
      if (dbUser) {
        throw new Error('User exists in database but no Firebase Auth account. Please use "First time login" to set up your password.');
      }
    }

    if (err.code === 'PERMISSION_DENIED') {
      throw new Error('Permission denied: Database access forbidden. Please contact administrator.');
    } else if (err.code === 'auth/invalid-credential') {
      throw new Error('Invalid email or password. Please check your credentials.');
    } else if (err.code === 'auth/user-not-found') {
      throw new Error('User not found. Please contact your team admin to be added.');
    } else if (err.code === 'auth/wrong-password') {
      throw new Error('Incorrect password. Please try again.');
    } else if (err.code === 'auth/too-many-requests') {
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
    logger.debug('Attempting to get super user from database');
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      throw new Error('Super user not authenticated after creation/sign-in');
    }

    // Prefer fetching by UID to ensure we operate on the auth-backed record
    let user = await getUser(firebaseUser.uid);

    if (!user) {
      user = await getUserByEmail(superUserAccount.email);
    }

    if (!user) {
      logger.debug('Creating super user in database');
      const userData: Omit<User, 'id'> = {
        email: superUserAccount.email,
        role: 'super_user'
      };
      await createUserWithUid(firebaseUser.uid, userData);
      logger.info('Super user created', { context: { userId: firebaseUser.uid } });
      return { id: firebaseUser.uid, ...userData };
    }

    if (user.id !== firebaseUser.uid) {
      logger.debug('Migrating super user record to auth UID');
      const { id: legacyId, ...legacyData } = user;
      const normalizedData: Omit<User, 'id'> = {
        ...legacyData,
        email: superUserAccount.email,
        role: 'super_user'
      };
      await createUserWithUid(firebaseUser.uid, normalizedData);
      logger.info('Super user data migrated', { context: { newUid: firebaseUser.uid } });

      try {
        await deleteUserRecord(legacyId);
        logger.debug('Removed legacy super user record', { context: { legacyId } });
      } catch (migrationError) {
        logger.warn('Failed to remove legacy super user entry', { context: { error: migrationError } });
      }

      return { id: firebaseUser.uid, ...normalizedData };
    }

    if (user.role !== 'super_user') {
      logger.debug('Correcting super user role in database');
      await updateUser(user.id, { role: 'super_user' });
      user.role = 'super_user';
    }

    return user;
  } catch (error) {
    logger.error('Error in createOrGetSuperUser', error);
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
  if (!firebaseUser || !firebaseUser.email) return null;
  
  // Prefer UID read
  const byUid = await getUser(firebaseUser.uid);
  if (byUid) return byUid;
  
  // Fallback to email query
  return await getUserByEmail(firebaseUser.email!);
}

export async function sendPasswordReset(email: string): Promise<void> {
  // Check rate limit before sending password reset
  const rateLimit = checkPasswordResetRateLimit(email);
  if (rateLimit.isLimited) {
    const resetMinutes = Math.ceil(rateLimit.resetIn / 60000);
    logger.security('Password reset rate limit exceeded', { context: { email } });
    throw new Error(`Too many password reset attempts. Please try again in ${resetMinutes} minutes.`);
  }

  logger.debug('Sending password reset email', { context: { email } });
  await sendPasswordResetEmail(auth, email);
}
