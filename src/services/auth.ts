/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import legacyFirebaseConfig from '../../firebase-applet-config.json';
import { GoogleUserProfile } from '../types/blogger';

const firebaseConfig = {
  ...legacyFirebaseConfig,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || legacyFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || legacyFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || legacyFirebaseConfig.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || legacyFirebaseConfig.appId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || legacyFirebaseConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || legacyFirebaseConfig.messagingSenderId,
};

const missingFirebaseConfig = ['apiKey', 'authDomain', 'projectId', 'appId'].filter(
  (key) => !firebaseConfig[key as keyof typeof firebaseConfig]
);
if (missingFirebaseConfig.length > 0) {
  throw new Error(`Firebase configuration is incomplete: ${missingFirebaseConfig.join(', ')}.`);
}

// Initialize Firebase App instance safely (prevent duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Required Blogger and Profile Scopes
provider.addScope('https://www.googleapis.com/auth/blogger');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');

// STRICT SECURITY RULE: Access token is cached in memory ONLY. Never in localStorage or sessionStorage!
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: GoogleUserProfile, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) {
        onAuthSuccess(
          {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
          },
          cachedAccessToken
        );
      }
    } else if (!isSigningIn) {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign in with Google using popup and request official Blogger scopes
 */
export const googleSignIn = async (): Promise<{
  user: GoogleUserProfile;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google OAuth access token from credential result.');
    }

    // In-memory token storage
    cachedAccessToken = credential.accessToken;

    const userProfile: GoogleUserProfile = {
      uid: result.user.uid,
      displayName: result.user.displayName,
      email: result.user.email,
      photoURL: result.user.photoURL,
    };

    return { user: userProfile, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Get current in-memory access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Sign out and clear cached token from memory
 */
export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (e) {
    console.error('SignOut error:', e);
  } finally {
    cachedAccessToken = null;
  }
};
