"use client";

import { useEffect } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import {
  getGoogleWebClientId,
  isLikelyGoogleOriginMismatch,
} from "@/lib/auth/socialAuthConfig";
import { GoogleSignInHost } from "@/components/auth/GoogleSignInHost";

const APPLE_SCRIPT_SRC =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

function preloadAppleSignInScript(): void {
  if (typeof document === "undefined") return;
  if (document.querySelector(`script[src="${APPLE_SCRIPT_SRC}"]`)) return;
  const script = document.createElement("script");
  script.src = APPLE_SCRIPT_SRC;
  script.async = true;
  document.head.appendChild(script);
}

/** Wrap login/signup pages so GIS Google sign-in can run from custom social buttons. */
export function SocialAuthProviders({ children }: { children: React.ReactNode }) {
  const clientId = getGoogleWebClientId();

  useEffect(() => {
    preloadAppleSignInScript();
    if (!clientId || typeof document === "undefined") return;
    let meta = document.querySelector<HTMLMetaElement>(
      'meta[name="google-signin-client_id"]'
    );
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "google-signin-client_id";
      document.head.appendChild(meta);
    }
    meta.content = clientId;

    if (process.env.NODE_ENV === "development" && isLikelyGoogleOriginMismatch()) {
      console.warn(
        `[Google Sign-In] Origin "${window.location.origin}" may not be authorized. ` +
          "Add it to the Web client's Authorized JavaScript origins in Google Cloud Console."
      );
    }
  }, [clientId]);

  if (!clientId) {
    return <>{children}</>;
  }
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleSignInHost />
      {children}
    </GoogleOAuthProvider>
  );
}
