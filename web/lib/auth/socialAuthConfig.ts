/**
 * Web OAuth client (google-services `client_type: 3`).
 * Same as Flutter `SocialAuthConfig.googleClientId` / backend `GOOGLE_CLIENT_ID`.
 */
export const FIREBASE_GOOGLE_WEB_CLIENT_ID =
  "211438342424-2q040ab0aqf3ionmc9f8h9n4sjue9ron.apps.googleusercontent.com";

/** Removed in GCP — do not use; causes Google Error 401 deleted_client. */
export const DEPRECATED_GOOGLE_WEB_CLIENT_ID =
  "211438342424-os0ks1qsmehgv0bafgs6l0ekvbl7amam.apps.googleusercontent.com";

/** Flutter fallback Apple Services ID for web Sign in with Apple. */
export const APPLE_SERVICES_ID_FALLBACK = "com.taskzing.zingte.webauth";

/**
 * Add each origin under Google Cloud Console → APIs & Services → Credentials →
 * Web OAuth client → Authorized JavaScript origins (required for GIS / Flutter web).
 */
export const GOOGLE_WEB_AUTHORIZED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "https://taskzing.com",
  "https://www.taskzing.com",
  "https://task-zing-m-v-p-e11l44.firebaseapp.com",
] as const;

/** Apple Services ID return URLs (must match Apple Developer → Sign in with Apple). */
export const APPLE_WEB_RETURN_PATHS = ["/login", "/signup"] as const;

export function getGoogleWebClientId(): string {
  const fromEnv = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  const id = fromEnv || FIREBASE_GOOGLE_WEB_CLIENT_ID;
  if (id === DEPRECATED_GOOGLE_WEB_CLIENT_ID) {
    if (typeof console !== "undefined") {
      console.error(
        "[Google Sign-In] OAuth client was deleted in Google Cloud. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID " +
          "to the Web client (client_type 3) from Firebase google-services.json."
      );
    }
    return "";
  }
  return id;
}

export function getCurrentWebOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function isLikelyGoogleOriginMismatch(): boolean {
  const origin = getCurrentWebOrigin();
  if (!origin) return false;
  return !GOOGLE_WEB_AUTHORIZED_ORIGINS.includes(
    origin as (typeof GOOGLE_WEB_AUTHORIZED_ORIGINS)[number]
  );
}
