import { getGoogleWebClientId } from "@/lib/auth/socialAuthConfig";
import { SocialAuthError } from "@/lib/auth/socialAuthError";
import type { GoogleWebTokens } from "@/lib/auth/googleSignInWeb";

const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

type GsiMomentNotification = {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  getNotDisplayedReason?: () => string;
  getSkippedReason?: () => string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          disableAutoSelect: () => void;
          cancel: () => void;
          prompt: (listener?: (notification: GsiMomentNotification) => void) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

let gsiScriptPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new SocialAuthError(
        "Google sign-in is only available in the browser.",
        "auth/invalid-environment"
      )
    );
  }
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gsiScriptPromise) return gsiScriptPromise;

  gsiScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(
          new SocialAuthError("Failed to load Google Sign-In.", "auth/configuration-error")
        )
      );
      if (window.google?.accounts?.id) resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(
        new SocialAuthError("Failed to load Google Sign-In.", "auth/configuration-error")
      );
    document.head.appendChild(script);
  });

  return gsiScriptPromise;
}

/**
 * Flutter `SocialAuthProviderDataSource.signInWithGoogle()` on web:
 * `GoogleSignIn(clientId: SocialAuthConfig.googleClientId)` → signOut → signIn → id + access tokens.
 */
export async function requestGoogleTokensViaGis(): Promise<GoogleWebTokens> {
  const clientId = getGoogleWebClientId();
  if (!clientId) {
    throw new SocialAuthError(
      "Google Web OAuth client ID is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to the Web client (client_type 3) from Firebase google-services.json.",
      "auth/configuration-error"
    );
  }

  await loadGsiScript();
  const gsi = window.google?.accounts?.id;
  if (!gsi) {
    throw new SocialAuthError("Google Sign-In is unavailable.", "auth/configuration-error");
  }

  // Flutter: await _googleSignIn.signOut() before signIn (account picker).
  gsi.disableAutoSelect();

  return new Promise((resolve, reject) => {
    let settled = false;
    const container = document.createElement("div");
    container.setAttribute("aria-hidden", "true");
    container.style.cssText =
      "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;";

    const finish = (tokens: GoogleWebTokens) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      container.remove();
      gsi.cancel();
      resolve(tokens);
    };

    const fail = (err: SocialAuthError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      container.remove();
      gsi.cancel();
      reject(err);
    };

    const timeout = setTimeout(() => {
      fail(new SocialAuthError("Google sign-in timed out. Try again.", "auth/unknown"));
    }, 120_000);

    gsi.initialize({
      client_id: clientId,
      callback: (response: { credential?: string }) => {
        const id = response.credential?.trim();
        if (!id) {
          fail(
            new SocialAuthError(
              "Google sign-in did not return an ID token. Check Google OAuth client configuration.",
              "auth/configuration-error"
            )
          );
          return;
        }
        // Flutter: accessToken falls back to idToken when OAuth omits access token.
        finish({ idToken: id, accessToken: id });
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    document.body.appendChild(container);
    gsi.renderButton(container, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
    });

    const triggerSignIn = () => {
      const btn = container.querySelector('[role="button"]') as HTMLElement | null;
      if (btn) {
        btn.click();
        return;
      }
      gsi.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          fail(
            new SocialAuthError(
              "Google Sign-In is unavailable. Add this origin to the Web OAuth client authorized JavaScript origins in Google Cloud Console, allow popups, and try again.",
              "auth/configuration-error"
            )
          );
        }
      });
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(triggerSignIn);
    });
  });
}
