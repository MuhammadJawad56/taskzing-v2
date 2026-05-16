import { SocialAuthError } from "@/lib/auth/socialAuthError";

export type GoogleWebTokens = {
  idToken: string;
  accessToken: string;
};

const REQUEST_EVENT = "taskzing:google-signin-request";
const SUCCESS_EVENT = "taskzing:google-success";
const ERROR_EVENT = "taskzing:google-error";

/** Dispatched from auth pages; resolved by `GoogleSignInHost` (GIS credential). */
export function requestGoogleWebTokens(): Promise<GoogleWebTokens> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new SocialAuthError(
        "Google sign-in is only available in the browser.",
        "auth/invalid-environment"
      )
    );
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new SocialAuthError("Google sign-in timed out. Try again.", "auth/unknown"));
    }, 120_000);

    const onSuccess = (event: Event) => {
      const detail = (event as CustomEvent<GoogleWebTokens>).detail;
      cleanup();
      if (!detail?.idToken?.trim()) {
        reject(
          new SocialAuthError(
            "Google did not return an ID token.",
            "auth/configuration-error"
          )
        );
        return;
      }
      resolve({
        idToken: detail.idToken.trim(),
        accessToken: (detail.accessToken || detail.idToken).trim(),
      });
    };

    const onError = (event: Event) => {
      cleanup();
      const detail = (event as CustomEvent<{ message?: string; code?: string }>).detail;
      if (detail instanceof SocialAuthError) {
        reject(detail);
        return;
      }
      reject(
        new SocialAuthError(
          detail?.message || "Google sign-in failed.",
          detail?.code || "auth/unknown"
        )
      );
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      window.removeEventListener(SUCCESS_EVENT, onSuccess);
      window.removeEventListener(ERROR_EVENT, onError);
    };

    window.addEventListener(SUCCESS_EVENT, onSuccess);
    window.addEventListener(ERROR_EVENT, onError);
    window.dispatchEvent(new CustomEvent(REQUEST_EVENT));
  });
}

export function emitGoogleSignInSuccess(tokens: GoogleWebTokens): void {
  window.dispatchEvent(new CustomEvent(SUCCESS_EVENT, { detail: tokens }));
}

export function emitGoogleSignInError(
  err: SocialAuthError | { message: string; code?: string }
): void {
  window.dispatchEvent(new CustomEvent(ERROR_EVENT, { detail: err }));
}

export const GOOGLE_SIGNIN_REQUEST_EVENT = REQUEST_EVENT;
