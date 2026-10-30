// Real Firebase in a custom build. Fake (mock) login in Expo Go and web.
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const useMock = Platform.OS === 'web' || Constants.appOwnership === 'expo';

type Confirmation = { confirm: (code: string) => Promise<unknown> };
type Listener = (user: unknown) => void;

let real: any = null;
if (!useMock) {
  real = require('@react-native-firebase/auth');
}

// Mock state, only used in Expo Go and web
let mockUser: unknown = null;
const listeners = new Set<Listener>();
function setMockUser(user: unknown) {
  mockUser = user;
  listeners.forEach((cb) => cb(user));
}

export function getAuth(): any {
  return real ? real.getAuth() : {};
}

export function onAuthStateChanged(auth: any, cb: Listener) {
  if (real) return real.onAuthStateChanged(auth, cb);
  listeners.add(cb);
  cb(mockUser);
  return () => {
    listeners.delete(cb);
  };
}

export async function signInWithPhoneNumber(auth: any, phone: string): Promise<Confirmation> {
  if (real) return real.signInWithPhoneNumber(auth, phone);
  // Mock: any 6-digit code works
  return {
    confirm: async () => {
      setMockUser({ phoneNumber: phone });
      return true;
    },
  };
}

export async function signOut(auth: any) {
  if (real) return real.signOut(auth);
  setMockUser(null);
}