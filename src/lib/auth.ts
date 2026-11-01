import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  getAuth as getFirebaseAuth,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithPhoneNumber as firebaseSignInWithPhoneNumber,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth';

// Forced mock mode enabled for local development to bypass Firebase SMS billing/config blocks
const useMock = true;

type Listener = (user: unknown) => void;

// Mock state
let mockUser: unknown = null;
const listeners = new Set<Listener>();

function setMockUser(user: unknown) {
  mockUser = user;
  listeners.forEach((cb) => cb(user));
}

export function getAuth(): any {
  if (!useMock) {
    try {
      return getFirebaseAuth();
    } catch (e) {
      console.warn("Firebase Auth not ready yet", e);
      return {};
    }
  }
  return {};
}

export function onAuthStateChanged(auth: any, cb: Listener) {
  if (!useMock) {
    try {
      return firebaseOnAuthStateChanged(auth, cb as any);
    } catch (e) {
      console.warn("Firebase Auth not ready yet", e);
      return () => {};
    }
  }
  listeners.add(cb);
  cb(mockUser);
  return () => {
    listeners.delete(cb);
  };
}

export async function signInWithPhoneNumber(auth: any, phone: string) {
  if (!useMock) {
    try {
      return await firebaseSignInWithPhoneNumber(auth, phone);
    } catch (e) {
      console.warn("Firebase Auth not ready yet", e);
      throw e;
    }
  }
  return {
    confirm: async (code: string) => {
      setMockUser({ phoneNumber: phone });
      return true;
    },
  };
}

export async function signOut(auth: any) {
  if (!useMock) {
    try {
      return await firebaseSignOut(auth);
    } catch (e) {
      console.warn("Firebase Auth not ready yet", e);
      throw e;
    }
  }
  setMockUser(null);
}