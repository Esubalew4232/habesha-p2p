/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Habesha P2P - Firebase SDK Configuration & Persistence Initialization
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Firestore with specific databaseId if provided
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export function signOutFirebaseUser() {
  return firebaseSignOut(auth);
}

/**
 * Sign in with Google Popup using official Firebase Authentication
 */
export async function signInWithFirebaseGoogle(): Promise<{
  firebaseUser: FirebaseUser;
  email: string;
  displayName: string;
  photoURL: string;
}> {
  const result = await signInWithPopup(auth, googleProvider);
  const u = result.user;
  return {
    firebaseUser: u,
    email: u.email || 'esubalewtezera4@gmail.com',
    displayName: u.displayName || 'Esubalew Tezera',
    photoURL: u.photoURL || '',
  };
}

/**
 * Persist or update user profile to Firestore
 */
export async function saveUserToFirestore(userData: {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isSuspended?: boolean;
  tradingRestricted?: boolean;
  withdrawalRestricted?: boolean;
  avatarUrl?: string;
}) {
  try {
    const userRef = doc(db, 'users', userData.id);
    await setDoc(userRef, {
      ...userData,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.warn('[Firestore] Note: User profile sync:', error);
  }
}

/**
 * Synchronize and keep track of live user documents from Firestore
 */
export function subscribeToFirestoreUser(userId: string, onUpdate: (data: any) => void) {
  try {
    const userRef = doc(db, 'users', userId);
    return onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data());
      }
    }, (err) => {
      console.warn('[Firestore] User listener error:', err);
    });
  } catch (err) {
    console.warn('[Firestore] Listener error:', err);
    return () => {};
  }
}

export { firebaseSignOut, onAuthStateChanged };
