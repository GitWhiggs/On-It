import { Platform } from 'react-native';
import Constants from 'expo-constants';
// Expo Go doesn't include Firebase, so only load it in a custom build
const fb: any = Constants.appOwnership === 'expo' ? {} : require('@react-native-firebase/auth');
const {
  getAuth: getFirebaseAuth,
  onAuthStateChanged: firebaseOnAuthStateChanged,
  signInWithPhoneNumber: firebaseSignInWithPhoneNumber,
  signOut: firebaseSignOut,
} = fb;

// Mock mode on: any phone number and code gets in. Needed to test on web (Firebase only runs in the phone app).
// Set to false for real Firebase phone login.
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
      setMockUser({ uid: `mock-${phone}`, phoneNumber: phone });
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

export function getUid(): string | null {
  if (useMock) return (mockUser as { uid?: string } | null)?.uid ?? null;
  try {
    return getFirebaseAuth().currentUser?.uid ?? null;
  } catch {
    return null;
  }
}