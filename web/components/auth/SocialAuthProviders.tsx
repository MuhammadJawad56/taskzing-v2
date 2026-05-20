"use client";

import { useEffect } from "react";

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

/** Preloads Apple JS; Google uses Firebase Auth popup (see `googleSignInFirebase.ts`). */
export function SocialAuthProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    preloadAppleSignInScript();
  }, []);

  return <>{children}</>;
}
