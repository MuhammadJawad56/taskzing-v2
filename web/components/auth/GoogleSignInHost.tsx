"use client";

import { useCallback, useEffect, useRef } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { SocialAuthError } from "@/lib/auth/socialAuthError";
import {
  emitGoogleSignInError,
  emitGoogleSignInSuccess,
  GOOGLE_SIGNIN_REQUEST_EVENT,
} from "@/lib/auth/googleSignInWeb";

/**
 * Hidden GIS button triggered when the user taps "Continue with Google".
 * Must live under `GoogleOAuthProvider` (see `SocialAuthProviders`).
 */
export function GoogleSignInHost() {
  const hostRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);

  const triggerGoogleButton = useCallback(() => {
    const root = hostRef.current;
    if (!root) {
      emitGoogleSignInError(
        new SocialAuthError("Google sign-in is not ready.", "auth/configuration-error")
      );
      return;
    }
    const btn =
      root.querySelector<HTMLElement>('[role="button"]') ??
      root.querySelector<HTMLElement>("div[id^='container']");
    if (btn) {
      btn.click();
    } else {
      emitGoogleSignInError(
        new SocialAuthError("Could not open Google sign-in.", "auth/configuration-error")
      );
    }
  }, []);

  useEffect(() => {
    const onRequest = () => {
      if (busyRef.current) return;
      busyRef.current = true;
      window.setTimeout(() => {
        triggerGoogleButton();
        busyRef.current = false;
      }, 0);
    };
    window.addEventListener(GOOGLE_SIGNIN_REQUEST_EVENT, onRequest);
    return () => window.removeEventListener(GOOGLE_SIGNIN_REQUEST_EVENT, onRequest);
  }, [triggerGoogleButton]);

  const onSuccess = (response: CredentialResponse) => {
    const idToken = response.credential?.trim();
    if (!idToken) {
      emitGoogleSignInError(
        new SocialAuthError("Google did not return an ID token.", "auth/configuration-error")
      );
      return;
    }
    emitGoogleSignInSuccess({ idToken, accessToken: idToken });
  };

  const onError = () => {
    emitGoogleSignInError(
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
      <div style={{ pointerEvents: "auto" }}>
        <GoogleLogin
          onSuccess={onSuccess}
          onError={onError}
          useOneTap={false}
          auto_select={false}
        />
      </div>
    </div>
  );
}
