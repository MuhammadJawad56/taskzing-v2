"use client";

import { useCallback, useEffect, useRef } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { SocialAuthError } from "@/lib/auth/socialAuthError";
import {
  emitGoogleSignInError,
  emitGoogleSignInSuccess,
  GOOGLE_SIGNIN_REQUEST_EVENT,
  type GoogleWebTokens,
} from "@/lib/auth/googleSignInWeb";

const MAX_GIS_CLICK_ATTEMPTS = 30;
const GIS_CLICK_INTERVAL_MS = 100;

/**
 * Hidden GIS button triggered when the user taps "Continue with Google".
 * Must live under `GoogleOAuthProvider` (see `SocialAuthProviders`).
 */
export function GoogleSignInHost() {
  const hostRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);

  const releaseBusy = useCallback(() => {
    busyRef.current = false;
  }, []);

  const finishWithTokens = useCallback(
    (tokens: GoogleWebTokens) => {
      releaseBusy();
      emitGoogleSignInSuccess(tokens);
    },
    [releaseBusy]
  );

  const finishWithError = useCallback(
    (err: SocialAuthError) => {
      releaseBusy();
      emitGoogleSignInError(err);
    },
    [releaseBusy]
  );

  const triggerGoogleButton = useCallback(() => {
    const root = hostRef.current;
    if (!root) {
      finishWithError(
        new SocialAuthError("Google sign-in is not ready.", "auth/configuration-error")
      );
      return;
    }

    const tryClick = (attempt: number) => {
      const btn =
        root.querySelector<HTMLElement>('[role="button"]') ??
        root.querySelector<HTMLElement>("div[id^='container']") ??
        root.querySelector<HTMLElement>("iframe");

      if (btn) {
        btn.click();
        return;
      }

      if (attempt < MAX_GIS_CLICK_ATTEMPTS) {
        window.setTimeout(() => tryClick(attempt + 1), GIS_CLICK_INTERVAL_MS);
        return;
      }

      finishWithError(
        new SocialAuthError("Could not open Google sign-in.", "auth/configuration-error")
      );
    };

    tryClick(0);
  }, [finishWithError]);

  useEffect(() => {
    const onRequest = () => {
      if (busyRef.current) return;
      busyRef.current = true;
      triggerGoogleButton();
    };
    window.addEventListener(GOOGLE_SIGNIN_REQUEST_EVENT, onRequest);
    return () => window.removeEventListener(GOOGLE_SIGNIN_REQUEST_EVENT, onRequest);
  }, [triggerGoogleButton]);

  const onSuccess = (response: CredentialResponse) => {
    const idToken = response.credential?.trim();
    if (!idToken) {
      finishWithError(
        new SocialAuthError("Google did not return an ID token.", "auth/configuration-error")
      );
      return;
    }
    // GIS returns id token only; backend accepts same value for accessToken (Flutter parity).
    finishWithTokens({ idToken, accessToken: idToken });
  };

  const onError = () => {
    finishWithError(
      new SocialAuthError(
        "Google sign-in was cancelled or failed.",
        "auth/popup-closed-by-user"
      )
    );
  };

  return (
    <div
      ref={hostRef}
      aria-hidden
      className="fixed left-0 top-0 z-[-1] h-px w-px overflow-hidden opacity-0"
      style={{ pointerEvents: "none" }}
    >
      <div style={{ pointerEvents: "auto", minHeight: 44, minWidth: 200 }}>
        <GoogleLogin
          onSuccess={onSuccess}
          onError={onError}
          useOneTap={false}
          auto_select={false}
          size="large"
          width="240"
        />
      </div>
    </div>
  );
}
