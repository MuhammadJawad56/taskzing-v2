/**
 * Firebase Web OAuth client (google-services `client_type: 3`).
 * Same as Flutter `lib/auth/firebase_auth/google_auth.dart` → `_kGoogleServerClientId`.
 */
export const FIREBASE_GOOGLE_WEB_CLIENT_ID =
  "211438342424-os0ks1qsmehgv0bafgs6l0ekvbl7amam.apps.googleusercontent.com";

/** Flutter fallback Apple Services ID for web Sign in with Apple. */
export const APPLE_SERVICES_ID_FALLBACK = "com.taskzing.zingte.webauth";

/**
 * Add each origin under Google Cloud Console → APIs & Services → Credentials →
 * Web client → Authorized JavaScript origins (GIS / @react-oauth/google).
 */
export const GOOGLE_WEB_AUTHORIZED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://taskzing.com",
  "https://www.taskzing.com",
  "https://task-zing-m-v-p-e11l44.firebaseapp.com",
] as const;

export function getGoogleWebClientId(): string {
  const fromEnv = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  return fromEnv || FIREBASE_GOOGLE_WEB_CLIENT_ID;
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
