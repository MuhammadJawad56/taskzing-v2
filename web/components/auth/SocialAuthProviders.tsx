"use client";

import { useEffect } from "react";

const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const APPLE_SCRIPT_SRC =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

function preloadScript(src: string): void {
  if (typeof document === "undefined") return;
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  if (src === GIS_SCRIPT_SRC) script.defer = true;
  document.head.appendChild(script);
}

/** Preloads Google GIS + Apple JS (Flutter `SocialAuthProviderDataSource` parity). */
export function SocialAuthProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    preloadScript(GIS_SCRIPT_SRC);
    preloadScript(APPLE_SCRIPT_SRC);
  }, []);

  return <>{children}</>;
}
