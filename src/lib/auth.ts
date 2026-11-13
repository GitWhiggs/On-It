
import {getApp} from '@react-native-firebase/app';
import {
  getAuth as getFirebaseAuth,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithPhoneNumber as firebaseSignInWithPhoneNumber,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth';
import {
  getFunctions,
  httpsCallable,
} from '@react-native-firebase/functions';

type Listener = (
  user: ReturnType<typeof getFirebaseAuth>['currentUser']
) => void;

export function getAuth() {
  return getFirebaseAuth();
}

export function onAuthStateChanged(
  auth: ReturnType<typeof getFirebaseAuth>,
  cb: Listener
) {
  return firebaseOnAuthStateChanged(auth, cb as any);
}

export async function signInWithPhoneNumber(
  auth: ReturnType<typeof getFirebaseAuth>,
  phone: string
) {
  try {
    return await firebaseSignInWithPhoneNumber(auth, phone);
  } catch (error: any) {
    console.error('[On-It] Firebase error code:', error?.code);
    console.error('[On-It] Firebase error message:', error?.message);
    console.error('[On-It] Native error code:', error?.nativeErrorCode);
    console.error('[On-It] Native error message:', error?.nativeErrorMessage);
    throw error;
  }
}

export async function ensureSupabaseRole(): Promise<void> {
  const user = getFirebaseAuth().currentUser;

  if (!user) {
    throw new Error('You must be signed in to connect to Supabase.');
  }

  const functions = getFunctions(getApp(), 'us-central1');
  const ensureRole = httpsCallable<
    Record<string, never>,
    {success: boolean}
  >(functions, 'ensureSupabaseRole');

  const result = await ensureRole({});

  if (!result.data.success) {
    throw new Error('Could not configure your Supabase authentication.');
  }

  // Fetch a fresh token containing the authenticated role claim.
  await user.getIdToken(true);
}

export async function signOut(auth: ReturnType<typeof getFirebaseAuth>) {
  return firebaseSignOut(auth);
}

export function getUid(): string | null {
  return getFirebaseAuth().currentUser?.uid ?? null;
}
