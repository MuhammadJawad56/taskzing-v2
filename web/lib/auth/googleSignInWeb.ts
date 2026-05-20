import { requestGoogleTokensViaFirebase } from "@/lib/auth/googleSignInFirebase";
import { SocialAuthError } from "@/lib/auth/socialAuthError";

export type GoogleWebTokens = {
  idToken: string;
  accessToken: string;
};

/** Google tokens for `POST /auth/google` (Flutter `toGoogleLoginJson` parity). */
export function requestGoogleWebTokens(): Promise<GoogleWebTokens> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new SocialAuthError(
        "Google sign-in is only available in the browser.",
        "auth/invalid-environment"
      )
    );
  }
  return requestGoogleTokensViaFirebase();
}
