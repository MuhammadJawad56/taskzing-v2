import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type AuthError,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseAuthConfigured } from "@/lib/firebase/client";
import { SocialAuthError } from "@/lib/auth/socialAuthError";
import type { GoogleWebTokens } from "@/lib/auth/googleSignInWeb";

function mapFirebaseAuthError(err: AuthError): SocialAuthError {
  switch (err.code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return new SocialAuthError("Google sign-in was cancelled.", err.code);
    case "auth/popup-blocked":
      return new SocialAuthError(
        "Popup was blocked. Allow popups for this site and try again.",
        err.code
      );
    case "auth/unauthorized-domain":
      return new SocialAuthError(
        "This domain is not authorized for Firebase Auth. Add it under Firebase Console → Authentication → Settings → Authorized domains.",
        err.code
      );
    case "auth/operation-not-allowed":
      return new SocialAuthError(
        "Google sign-in is not enabled. Enable Google in Firebase Console → Authentication → Sign-in method.",
        err.code
      );
    default:
      return new SocialAuthError(err.message || "Google sign-in failed.", err.code);
  }
}

/**
 * Same approach as Flutter web `google_auth.dart` (`signInWithPopup`).
 * Firebase manages OAuth redirect URIs per authorized domain — avoids GIS origin_mismatch.
 */
export async function requestGoogleTokensViaFirebase(): Promise<GoogleWebTokens> {
  if (!isFirebaseAuthConfigured()) {
    throw new SocialAuthError(
      "Firebase is not configured for Google sign-in.",
      "auth/configuration-error"
    );
  }

  const auth = getFirebaseAuth();
  if (!auth) {
    throw new SocialAuthError(
      "Google sign-in is only available in the browser.",
      "auth/invalid-environment"
    );
  }

  try {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    const cred = GoogleAuthProvider.credentialFromResult(result);
    const idToken = cred?.idToken?.trim();
    if (!idToken) {
      throw new SocialAuthError(
        "Google did not return an ID token.",
        "auth/configuration-error"
      );
    }

    const accessToken = cred?.accessToken?.trim() || idToken;
    await signOut(auth).catch(() => undefined);

    return { idToken, accessToken };
  } catch (err) {
    const code = (err as AuthError)?.code;
    if (code?.startsWith("auth/")) {
      throw mapFirebaseAuthError(err as AuthError);
    }
    if (err instanceof SocialAuthError) throw err;
    throw new SocialAuthError(
      err instanceof Error ? err.message : "Google sign-in failed.",
      "auth/unknown"
    );
  }
}
