import {
  getAuth as getFirebaseAuth,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithPhoneNumber as firebaseSignInWithPhoneNumber,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth';

type Listener = (user: unknown) => void;

/**
 * Returns the React Native Firebase Auth instance.
 * Phone verification is handled by Firebase; there is no mock-code fallback.
 */
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

    console.error(
      '[On-It] Firebase userInfo:',
      error?.userInfo
    );

    console.error(
      '[On-It] Firebase customData:',
      error?.customData
    );

    console.error(
      '[On-It] Firebase userInfo JSON:',
      JSON.stringify(error?.userInfo, null, 2)
    );

    throw error;
  }
}

export async function signOut(auth: ReturnType<typeof getFirebaseAuth>) {
  return firebaseSignOut(auth);
}

export function getUid(): string | null {
  return getFirebaseAuth().currentUser?.uid ?? null;
}