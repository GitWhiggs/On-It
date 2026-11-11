
import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import * as functions from "firebase-functions/v1";
import {setGlobalOptions} from "firebase-functions";
import {HttpsError, onCall} from "firebase-functions/v2/https";

initializeApp();

setGlobalOptions({maxInstances: 10});

// Automatically assign the Supabase role to newly created accounts.
export const setSupabaseRoleOnUserCreate = functions.auth
  .user()
  .onCreate(async (user) => {
    const auth = getAuth();
    const userRecord = await auth.getUser(user.uid);
    const existingClaims = userRecord.customClaims ?? {};

    if (existingClaims.role === "authenticated") {
      return;
    }

    await auth.setCustomUserClaims(user.uid, {
      ...existingClaims,
      role: "authenticated",
    });
  });

// Allow an already authenticated user to receive the required claim.
export const ensureSupabaseRole = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be signed in to continue."
    );
  }

  const auth = getAuth();
  const uid = request.auth.uid;
  const userRecord = await auth.getUser(uid);
  const existingClaims = userRecord.customClaims ?? {};

  if (existingClaims.role !== "authenticated") {
    await auth.setCustomUserClaims(uid, {
      ...existingClaims,
      role: "authenticated",
    });
  }

  return {success: true};
});
