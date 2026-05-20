/**
 * Authentication via TaskZing REST API (JWT + optional email 2FA).
 */

import type { UserData } from "./client";
import {
  requestAppleWebCredentials,
  toAppleLoginJson,
} from "@/lib/auth/appleSignInWeb";
import { requestGoogleWebTokens, type GoogleWebTokens } from "@/lib/auth/googleSignInWeb";
import { isLikelyGoogleOriginMismatch } from "@/lib/auth/socialAuthConfig";
import { isFirebaseAuthConfigured } from "@/lib/firebase/client";
import { SocialAuthError } from "@/lib/auth/socialAuthError";
import {
  apiFetchJson,
  setStoredAccessToken,
  notifyAuthChanged,
  AUTH_CHANGED_EVENT,
  AUTH_TOKEN_STORAGE_KEY,
  isBackendConfigured,
} from "./http";

export type { UserData } from "./client";

export class AuthError extends Error {
  code: string;
  constructor(message: string, code: string = "auth/unknown") {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  emailVerified?: boolean;
  isGoogleOrAppleUser?: boolean;
}

export interface TwoFactorLoginChallenge {
  requiresTwoFactor: true;
  twoFactorToken: string;
  method: string;
  expiresInSeconds: number;
}

export function isTwoFactorLoginChallenge(
  x: unknown
): x is TwoFactorLoginChallenge {
  return (
    typeof x === "object" &&
    x !== null &&
    "requiresTwoFactor" in x &&
    (x as TwoFactorLoginChallenge).requiresTwoFactor === true &&
    typeof (x as TwoFactorLoginChallenge).twoFactorToken === "string"
  );
}

/** Same token field names the Nest backend / Flutter session may use. */
function accessTokenFromRecord(rec: Record<string, unknown>): string {
  const keys = [
    "accessToken",
    "access_token",
    "token",
    "jwt",
    "authToken",
    "auth_token",
  ] as const;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/**
 * JWT from API body — matches Flutter `_sessionFromAuthResponse` expectation
 * (`accessToken` + `user`) plus common Nest envelopes and `session` wrappers.
 */
function pickAccessTokenFromPayload(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const o = raw as Record<string, unknown>;
  let t = accessTokenFromRecord(o);
  if (t) return t;
  const session = o.session;
  if (session && typeof session === "object" && !Array.isArray(session)) {
    t = accessTokenFromRecord(session as Record<string, unknown>);
    if (t) return t;
  }
  for (const key of ["data", "result", "payload"] as const) {
    const nested = o[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      t = pickAccessTokenFromPayload(nested);
      if (t) return t;
    }
  }
  return "";
}

/**
 * Flatten nested `data` / `result` / `payload` (multi-level) and lift `session`
 * to top level so `accessToken` / `user` match Flutter's flat map shape.
 */
function mergeNestedEnvelope(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = { ...(raw as Record<string, unknown>) };
  const nestKeys = ["data", "result", "payload"] as const;
  for (let pass = 0; pass < 8; pass++) {
    let progressed = false;
    for (const k of nestKeys) {
      const inner = o[k];
      if (inner && typeof inner === "object" && !Array.isArray(inner)) {
        Object.assign(o, inner as Record<string, unknown>);
        progressed = true;
      }
    }
    if (!progressed) break;
  }
  const sess = o.session;
  if (sess && typeof sess === "object" && !Array.isArray(sess)) {
    Object.assign(o, sess as Record<string, unknown>);
  }
  return o;
}

function truthyFlag(v: unknown): boolean {
  if (v === true || v === 1) return true;
  if (typeof v === "string") return v.toLowerCase() === "true" || v === "1";
  return false;
}

/** Detect 2FA challenge even if the API uses alternate property names. */
function parseTwoFactorChallenge(
  data: Record<string, unknown>
): TwoFactorLoginChallenge | null {
  const r2f =
    data.requiresTwoFactor ??
    data.requireTwoFactor ??
    data.requires_2fa ??
    data.twoFactorRequired;
  const wants = truthyFlag(r2f);
  const tok = [
    data.twoFactorToken,
    data.two_factor_token,
    data.pending2faToken,
    data.pending_2fa_token,
  ].find((x): x is string => typeof x === "string" && x.trim().length > 0);
  if (wants && tok) {
    return {
      requiresTwoFactor: true,
      twoFactorToken: tok.trim(),
      method: String(
        data.method ?? data.twoFactorMethod ?? data.two_factor_method ?? "email_code"
      ),
      expiresInSeconds: Number(
        data.expiresInSeconds ?? data.expires_in_seconds ?? 600
      ),
    };
  }
  return null;
}

const PENDING_SIGNUP_ROLE_KEY = "taskzing_pending_signup_role";
const PENDING_VERIFY_EMAIL_KEY = "taskzing_pending_verify_email";

export function storePendingSignupRole(
  role: "client" | "provider" | "client+provider"
): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(PENDING_SIGNUP_ROLE_KEY, role);
}

export function takePendingSignupRole():
  | "client"
  | "provider"
  | "client+provider"
  | null {
  if (typeof sessionStorage === "undefined") return null;
  const v = sessionStorage.getItem(PENDING_SIGNUP_ROLE_KEY);
  sessionStorage.removeItem(PENDING_SIGNUP_ROLE_KEY);
  if (v === "client" || v === "provider" || v === "client+provider") return v;
  return null;
}

export function storePendingVerifyEmail(email: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(PENDING_VERIFY_EMAIL_KEY, email.trim());
}

export function peekPendingVerifyEmail(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(PENDING_VERIFY_EMAIL_KEY);
}

export function clearAuthCookie() {
  if (typeof document === "undefined") return;
  document.cookie = "auth-token=; path=/; max-age=0; samesite=lax";
}

/** Drop stale middleware cookie when JWT is missing (cookie alone must not imply a session). */
export function syncAuthSessionCookie(): void {
  if (typeof document === "undefined") return;
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (!token?.trim()) clearAuthCookie();
}

export function setAuthCookie(user: AuthUser): void {
  if (typeof document === "undefined") return;
  document.cookie = `auth-token=${encodeURIComponent(user.uid)}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
}

function coerceDate(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
}

type RoleValue = NonNullable<UserData["role"]>;
type CurrentRoleValue = NonNullable<UserData["currentRole"]>;

function normalizeRoleString(value: unknown): RoleValue | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim().toLowerCase().replace(/\s+/g, "");
  if (v === "client" || v === "provider" || v === "both") return v;
  if (
    v === "client+provider" ||
    v === "clientprovider" ||
    v === "clientandprovider"
  ) {
    return "client+provider";
  }
  return undefined;
}

function normalizeCurrentRoleString(
  value: unknown
): CurrentRoleValue | undefined {
  const v = normalizeRoleString(value);
  if (v === "client" || v === "provider" || v === "both") return v;
  return undefined;
}

function serializeRoleString(value: unknown): string | undefined {
  const v = normalizeRoleString(value);
  switch (v) {
    case "client":
      return "Client";
    case "provider":
    case "both":
    case "client+provider":
      return "Provider";
    default:
      return undefined;
  }
}

function serializeCurrentRoleString(value: unknown): string | undefined {
  const v = normalizeCurrentRoleString(value);
  switch (v) {
    case "client":
      return "Client";
    case "provider":
    case "both":
      return "Provider";
    default:
      return undefined;
  }
}

function rawRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
}

/** Maps API `/users/me` (or nested `user`) + uid into `UserData`. */
export function apiRecordToUserData(raw: unknown, uid: string): UserData {
  const root = rawRecord(raw);
  const r = rawRecord(root.user ?? raw);
  const email = String(r.email ?? root.email ?? "");
  const strTrim = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim() : "";
  const fullFromDoc =
    strTrim(r.fullName) ||
    strTrim(r.full_name) ||
    strTrim(r.name) ||
    "";
  const fullName = fullFromDoc || email.split("@")[0] || "User";
  return {
    id: uid,
    uid,
    email,
    fullName,
    name: String(strTrim(r.name) || fullName),
    username: r.username as string | undefined,
    phoneNumber: r.phoneNumber as string | undefined,
    role: normalizeRoleString(r.role) as UserData["role"],
    currentRole: normalizeCurrentRoleString(r.currentRole) as UserData["currentRole"],
    profileCompleted: r.profileCompleted as boolean | undefined,
    providerProfileCompleted:
      (r.providerProfileCompleted as boolean | undefined) ??
      (r.providerOnboardingCompleted as boolean | undefined),
    hasBeenProvider: r.hasBeenProvider as boolean | undefined,
    providerOnboardingCompleted:
      (r.providerOnboardingCompleted as boolean | undefined) ??
      (r.providerProfileCompleted as boolean | undefined),
    onboardingStepsCompleted: r.onboardingStepsCompleted as boolean | undefined,
    onboardingStep:
      typeof r.onboardingStep === "number"
        ? r.onboardingStep
        : typeof r.onboarding_step === "number"
          ? r.onboarding_step
          : undefined,
    onboardingCompletedAt:
      coerceDate(r.onboardingCompletedAt) ||
      coerceDate(r.onboarding_completed_at),
    location: r.location as string | undefined,
    latitude: typeof r.latitude === "number" ? r.latitude : undefined,
    longitude: typeof r.longitude === "number" ? r.longitude : undefined,
    skills: (r.skills as string[]) || [],
    photos:
      (r.photos as string[] | undefined) ||
      (r.images as string[] | undefined),
    bio: (r.bio || r.about || r.description) as string | undefined,
    about: (r.about || r.bio) as string | undefined,
    description: (r.description || r.bio || r.about) as string | undefined,
    photoUrl:
      (r.photoUrl ||
        r.profilePicture ||
        r.photo_url ||
        r.profile_picture) as string | undefined,
    profilePicture:
      (r.profilePicture ||
        r.photoUrl ||
        r.profile_picture ||
        r.photo_url) as string | undefined,
    isVerified: r.isVerified as boolean | undefined,
    totpEnabled:
      r.totpEnabled === true ||
      r.totp_enabled === true ||
      r.twoFactorEnabled === true ||
      r.two_factor_enabled === true,
    isOnline:
      r.isOnline === true ||
      r.online === true ||
      (typeof r.status === "string" &&
        String(r.status).toLowerCase() === "online"),
    lastSeen:
      coerceDate(r.lastSeen) ||
      coerceDate(r.lastActiveAt) ||
      coerceDate(r.lastOnlineAt),
    isAvailableForWork:
      (r.isAvailableForWork as boolean | undefined) ??
      (r.availableFW as boolean | undefined),
    availableFW:
      (r.availableFW as boolean | undefined) ??
      (r.isAvailableForWork as boolean | undefined),
    totalRating: r.totalRating as number | undefined,
    totalReviews: r.totalReviews as number | undefined,
    lastUsernameChangeDate: coerceDate(r.lastUsernameChangeDate),
    lastFullNameChangeDate: coerceDate(r.lastFullNameChangeDate),
    pendingFullName: r.pendingFullName as string | undefined,
    pendingFullNameRequestedAt: coerceDate(r.pendingFullNameRequestedAt),
    createdAt: coerceDate(r.createdAt) || new Date().toISOString(),
    updatedAt: coerceDate(r.updatedAt) || new Date().toISOString(),
    onboarding: parseProfileOnboardingMeta(r),
  };
}

function parseProfileOnboardingMeta(
  r: Record<string, unknown>
): UserData["onboarding"] | undefined {
  const raw = r.onboarding ?? r.onboardingMeta;
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  return {
    profileComplete:
      typeof o.profileComplete === "boolean"
        ? o.profileComplete
        : typeof o.profile_complete === "boolean"
          ? o.profile_complete
          : undefined,
    missingFields: Array.isArray(o.missingFields)
      ? (o.missingFields as unknown[]).map(String)
      : Array.isArray(o.missing_fields)
        ? (o.missing_fields as unknown[]).map(String)
        : undefined,
    lockedFields: Array.isArray(o.lockedFields)
      ? (o.lockedFields as unknown[]).map(String)
      : undefined,
    editableFields: Array.isArray(o.editableFields)
      ? (o.editableFields as unknown[]).map(String)
      : undefined,
  };
}

export {
  isOnboardingFlowCompleteForNav,
  isOnboardingEntityCompleted,
  nextUiOnboardingStepFromBackend,
  isSplashProfileComplete,
} from "@/lib/auth/profileGate";

function toAuthUserFromApi(
  uid: string,
  email: string | null,
  displayName: string | null,
  photoURL: string | null | undefined,
  emailVerified: boolean,
  isSocial = false
): AuthUser {
  return {
    uid,
    email,
    displayName,
    photoURL: photoURL ?? null,
    emailVerified,
    isGoogleOrAppleUser: isSocial,
  };
}

async function fetchMeUserData(): Promise<UserData | null> {
  const res = await apiFetchJson<unknown>("/auth/me");
  if (!res.ok) return null;
  const raw = res.data as Record<string, unknown>;
  const user = (raw?.user ?? raw) as Record<string, unknown>;
  const id = String(user?.id ?? user?.userId ?? "");
  if (!id || !user.email) return null;
  return apiRecordToUserData(raw, id);
}

async function fetchUserProfile(userId: string): Promise<UserData | null> {
  const me = await fetchMeUserData();
  if (me && (me.id === userId || me.uid === userId)) return me;

  const res = await apiFetchJson<unknown>(`/users/${encodeURIComponent(userId)}`);
  if (!res.ok) return null;
  const raw = res.data as Record<string, unknown>;
  const user = (raw?.user ?? raw) as Record<string, unknown>;
  const id = String(user?.id ?? user?.userId ?? userId);
  if (!id) return null;
  return apiRecordToUserData(raw, id);
}

function mapApiAuthError(
  status: number,
  message: string,
  code?: string
): AuthError {
  if (code === "EMAIL_NOT_VERIFIED" || status === 403) {
    return new AuthError(
      message || "Please verify your email before signing in.",
      "auth/email-not-verified"
    );
  }
  if (status === 401) {
    return new AuthError(message || "Invalid credentials.", "auth/invalid-credential");
  }
  if (status === 409) {
    return new AuthError(
      message || "This email is already registered.",
      "auth/email-already-in-use"
    );
  }
  return new AuthError(message, code || "auth/unknown");
}

/** Thrown after `signInWithRedirect` was used with Firebase — retained for API compatibility. */
export const OAUTH_REDIRECT_PENDING_CODE = "auth/redirect-pending" as const;

export function getSocialSignInErrorMessage(
  err: unknown,
  t: (key: string) => string
): string {
  if (err instanceof AuthError) {
    if (err.code === OAUTH_REDIRECT_PENDING_CODE) {
      return "";
    }
    switch (err.code) {
      case "auth/popup-closed-by-user":
      case "auth/cancelled-popup-request":
        return t("auth.popupClosed");
      case "auth/popup-blocked":
        return t("auth.popupBlocked");
      case "auth/unauthorized-domain":
        return t("auth.unauthorizedDomain");
      case "auth/operation-not-allowed":
        return err.message || t("auth.operationNotAllowed");
      case "auth/configuration-error":
        if (isLikelyGoogleOriginMismatch()) {
          return t("auth.googleOriginMismatch");
        }
        return err.message;
      default:
        return err.message || t("auth.errorOccurred");
    }
  }
  if (err instanceof Error) {
    return err.message || t("auth.errorOccurred");
  }
  return t("auth.errorOccurred");
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  role: "client" | "provider" | "client+provider" = "client"
): Promise<{ user: AuthUser; userData: UserData; verificationSent: boolean }> {
  if (!isBackendConfigured()) {
    throw new AuthError("API is not configured.", "auth/configuration-error");
  }
  const normalizedEmail = email.trim().toLowerCase();
  const res = await apiFetchJson<{
    message?: string;
    email?: string;
    userId?: string;
  }>("/auth/register", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email: normalizedEmail, password }),
  });

  if (!res.ok) {
    throw mapApiAuthError(res.status, res.message, res.code);
  }

  const data = res.data as { message?: string; email?: string; userId?: string };
  const userId = String(data?.userId ?? "").trim();
  const responseEmail = String(data?.email ?? normalizedEmail).trim().toLowerCase();

  storePendingSignupRole(role);
  storePendingVerifyEmail(responseEmail);

  const isProviderSignup =
    role === "provider" || role === "client+provider";
  const persistentRole: UserData["role"] = isProviderSignup ? "provider" : "client";
  const initialCurrentRole: UserData["currentRole"] = isProviderSignup
    ? "provider"
    : "client";

  const userData: UserData = {
    id: userId,
    uid: userId,
    email: responseEmail,
    fullName: fullName.trim() || responseEmail.split("@")[0] || "User",
    name: fullName.trim() || responseEmail.split("@")[0] || "User",
    role: persistentRole,
    currentRole: initialCurrentRole,
    profileCompleted: false,
    providerProfileCompleted: false,
    providerOnboardingCompleted: false,
    hasBeenProvider: isProviderSignup,
    onboardingStepsCompleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const authUser = toAuthUserFromApi(
    userId,
    responseEmail,
    fullName.trim() || null,
    null,
    false,
    false
  );

  return { user: authUser, userData, verificationSent: true };
}

/** Email/password login — matches Flutter `LoginRequestDto`: `{ email, password }` only. */
export async function signIn(
  email: string,
  password: string
): Promise<{ user: AuthUser; userData: UserData } | TwoFactorLoginChallenge> {
  if (!isBackendConfigured()) {
    throw new AuthError("API is not configured.", "auth/configuration-error");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const res = await apiFetchJson<Record<string, unknown>>("/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email: normalizedEmail, password }),
  });

  if (!res.ok) {
    throw mapApiAuthError(res.status, res.message, res.code);
  }

  const data = mergeNestedEnvelope(res.data);
  const twoFa = parseTwoFactorChallenge(data);
  if (twoFa) return twoFa;

  const accessToken = pickAccessTokenFromPayload(data);
  if (!accessToken) {
    throw new AuthError(
      "Login response had no access token. Confirm NEXT_PUBLIC_API_BASE_URL matches Flutter (default: taskzing-backend-production.up.railway.app). Inspect /auth/login in DevTools → Network.",
      "auth/unknown"
    );
  }

  setStoredAccessToken(accessToken);

  const userRaw = (data.user ?? data) as Record<string, unknown>;
  const uid = String(userRaw.id ?? userRaw.userId ?? "");
  if (!uid) {
    setStoredAccessToken(null);
    throw new AuthError("Login response missing user id.", "auth/unknown");
  }

  const userData = apiRecordToUserData(data, uid);
  const authUser = toAuthUserFromApi(
    uid,
    String(userRaw.email ?? normalizedEmail),
    userData.fullName ?? null,
    (userData.photoUrl as string | null) ?? null,
    true,
    false
  );
  setAuthCookie(authUser);
  notifyAuthChanged();
  return { user: authUser, userData };
}

/** Matches Flutter `verifyTwoFactor`: POST `{ code }` and/or `{ backupCode }`, Bearer `twoFactorToken`. */
export async function completeTwoFactorSignIn(
  twoFactorToken: string,
  options: { code?: string; backupCode?: string }
): Promise<{ user: AuthUser; userData: UserData }> {
  const body: Record<string, string> = {};
  const code = options.code?.trim();
  const backupCode = options.backupCode?.trim();
  if (code) body.code = code;
  if (backupCode) body.backupCode = backupCode;
  if (!body.code && !body.backupCode) {
    throw new AuthError("Enter a verification or backup code.", "auth/invalid-credential");
  }

  const res = await apiFetchJson<Record<string, unknown>>("/auth/2fa/verify", {
    method: "POST",
    auth: false,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${twoFactorToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw mapApiAuthError(res.status, res.message, res.code);
  }

  const data = mergeNestedEnvelope(res.data);
  const accessToken = pickAccessTokenFromPayload(data);
  if (!accessToken) {
    throw new AuthError("2FA response missing access token.", "auth/unknown");
  }
  setStoredAccessToken(accessToken);

  const userRaw = (data.user ?? data) as Record<string, unknown>;
  const uid = String(userRaw.id ?? userRaw.userId ?? "");
  if (!uid) {
    setStoredAccessToken(null);
    throw new AuthError("2FA response missing user id.", "auth/unknown");
  }
  const userData = apiRecordToUserData(data, uid);
  const authUser = toAuthUserFromApi(
    uid,
    String(userRaw.email ?? ""),
    userData.fullName ?? null,
    userData.photoUrl ?? null,
    true,
    false
  );
  setAuthCookie(authUser);
  notifyAuthChanged();
  return { user: authUser, userData };
}

export async function verifyEmailToken(
  token: string
): Promise<{ user: AuthUser; userData: UserData }> {
  const res = await apiFetchJson<Record<string, unknown>>("/auth/verify-email", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ token: token.trim() }),
  });
  if (!res.ok) {
    throw new AuthError(res.message, "auth/invalid-action-code");
  }
  const data = mergeNestedEnvelope(res.data);
  const accessToken = pickAccessTokenFromPayload(data);
  if (!accessToken) {
    throw new AuthError("Verification response missing access token.", "auth/unknown");
  }
  setStoredAccessToken(accessToken);

  const userRaw = (data.user ?? data) as Record<string, unknown>;
  const uid = String(userRaw.id ?? userRaw.userId ?? "");
  if (!uid) {
    setStoredAccessToken(null);
    throw new AuthError("Verification response missing user.", "auth/unknown");
  }
  let userData = apiRecordToUserData(data, uid);

  const pendingRole = takePendingSignupRole();
  if (pendingRole) {
    const patch = await apiFetchJson<unknown>("/users/me", {
      method: "PATCH",
      body: JSON.stringify({
        role: serializeRoleString(
          pendingRole === "client+provider" || pendingRole === "provider"
            ? "provider"
            : "client"
        ),
        currentRole: serializeCurrentRoleString(
          pendingRole === "client+provider" || pendingRole === "provider"
            ? "provider"
            : "client"
        ),
      }),
    });
    if (patch.ok) {
      const refreshed = await fetchMeUserData();
      if (refreshed) userData = refreshed;
    }
  }

  const authUser = toAuthUserFromApi(
    uid,
    String(userRaw.email ?? ""),
    userData.fullName ?? null,
    userData.photoUrl ?? null,
    true,
    false
  );
  setAuthCookie(authUser);
  notifyAuthChanged();
  return { user: authUser, userData };
}

export type SocialAuthOptions = {
  /** Applied after first social session (signup), same as email verify flow. */
  pendingSignupRole?: "client" | "provider" | "client+provider";
};

function rethrowSocialAuthError(err: unknown): never {
  if (err instanceof SocialAuthError) {
    throw new AuthError(err.message, err.code);
  }
  throw err;
}

/** Flutter `toGoogleLoginJson()` — id + access tokens with snake_case aliases. */
function toGoogleLoginJson(tokens: GoogleWebTokens): Record<string, unknown> {
  return {
    idToken: tokens.idToken,
    accessToken: tokens.accessToken,
    id_token: tokens.idToken,
    access_token: tokens.accessToken,
  };
}

async function applyPendingSignupRoleIfAny(userData: UserData): Promise<UserData> {
  const pendingRole = takePendingSignupRole();
  if (!pendingRole) return userData;

  const patch = await apiFetchJson<unknown>("/users/me", {
    method: "PATCH",
    body: JSON.stringify({
      role: serializeRoleString(
        pendingRole === "client+provider" || pendingRole === "provider"
          ? "provider"
          : "client"
      ),
      currentRole: serializeCurrentRoleString(
        pendingRole === "client+provider" || pendingRole === "provider"
          ? "provider"
          : "client"
      ),
    }),
  });
  if (patch.ok) {
    const refreshed = await fetchMeUserData();
    if (refreshed) return refreshed;
  }
  return userData;
}

async function completeAuthFromSocialResponse(
  res: Awaited<ReturnType<typeof apiFetchJson<Record<string, unknown>>>>
): Promise<{ user: AuthUser; userData: UserData } | TwoFactorLoginChallenge> {
  if (!res.ok) {
    throw mapApiAuthError(res.status, res.message, res.code);
  }

  const data = mergeNestedEnvelope(res.data);
  const twoFa = parseTwoFactorChallenge(data);
  if (twoFa) return twoFa;

  const accessToken = pickAccessTokenFromPayload(data);
  if (!accessToken) {
    throw new AuthError(
      "Social sign-in response had no access token.",
      "auth/unknown"
    );
  }

  setStoredAccessToken(accessToken);

  const userRaw = (data.user ?? data) as Record<string, unknown>;
  const uid = String(userRaw.id ?? userRaw.userId ?? "");
  if (!uid) {
    setStoredAccessToken(null);
    throw new AuthError("Social sign-in response missing user id.", "auth/unknown");
  }

  let userData = apiRecordToUserData(data, uid);
  userData = await applyPendingSignupRoleIfAny(userData);

  const authUser = toAuthUserFromApi(
    uid,
    String(userRaw.email ?? userData.email ?? ""),
    userData.fullName ?? null,
    userData.photoUrl ?? null,
    true,
    true
  );
  setAuthCookie(authUser);
  notifyAuthChanged();
  return { user: authUser, userData };
}

/** Google sign-in — Flutter `POST /auth/google` with Google id + access tokens. */
export async function signInWithGoogle(
  options?: SocialAuthOptions
): Promise<{ user: AuthUser; userData: UserData } | TwoFactorLoginChallenge> {
  if (!isBackendConfigured()) {
    throw new AuthError("API is not configured.", "auth/configuration-error");
  }
  if (!isFirebaseAuthConfigured()) {
    throw new AuthError(
      "Firebase is not configured for Google sign-in.",
      "auth/configuration-error"
    );
  }
  if (options?.pendingSignupRole) {
    storePendingSignupRole(options.pendingSignupRole);
  }

  try {
    const tokens = await requestGoogleWebTokens();
    const res = await apiFetchJson<Record<string, unknown>>("/auth/google", {
      method: "POST",
      auth: false,
      body: JSON.stringify(toGoogleLoginJson(tokens)),
    });
    return await completeAuthFromSocialResponse(res);
  } catch (err) {
    rethrowSocialAuthError(err);
  }
}

/** Apple sign-in — Flutter `POST /auth/apple` with `toAppleLoginJson()` body. */
export async function signInWithApple(
  options?: SocialAuthOptions
): Promise<{ user: AuthUser; userData: UserData } | TwoFactorLoginChallenge> {
  if (!isBackendConfigured()) {
    throw new AuthError("API is not configured.", "auth/configuration-error");
  }
  if (options?.pendingSignupRole) {
    storePendingSignupRole(options.pendingSignupRole);
  }

  try {
    const creds = await requestAppleWebCredentials();
    const res = await apiFetchJson<Record<string, unknown>>("/auth/apple", {
      method: "POST",
      auth: false,
      body: JSON.stringify(toAppleLoginJson(creds)),
    });
    return await completeAuthFromSocialResponse(res);
  } catch (err) {
    rethrowSocialAuthError(err);
  }
}

export async function handleOAuthRedirect(): Promise<{
  user: AuthUser;
  userData: UserData;
} | null> {
  return null;
}

export const handleAppleRedirect = handleOAuthRedirect;

export async function signOut(): Promise<void> {
  if (typeof window === "undefined") return;
  clearAuthCookie();
  try {
    const t = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (t) {
      await apiFetchJson("/auth/logout", { method: "POST" });
    }
  } catch {
    // ignore
  }
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem("taskzing_test_user");
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(PENDING_VERIFY_EMAIL_KEY);
  }
  notifyAuthChanged();
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (typeof window === "undefined") return null;
  if (!isBackendConfigured()) return null;
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (!token) return null;

  const data = await fetchMeUserData();
  if (!data) {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    clearAuthCookie();
    return null;
  }
  return toAuthUserFromApi(
    data.id,
    data.email,
    data.fullName ?? data.name ?? null,
    data.photoUrl ?? null,
    true,
    false
  );
}

export async function getUserData(userId: string): Promise<UserData | null> {
  if (typeof window === "undefined") return null;
  if (!isBackendConfigured()) return null;
  try {
    return await fetchUserProfile(userId);
  } catch (e) {
    console.error("getUserData:", e);
    return null;
  }
}

export function resolveProfileDisplayName(
  user: Pick<AuthUser, "uid" | "email" | "displayName"> | null | undefined,
  userData: UserData | null | undefined
): string {
  const t = (s: string | undefined | null) => {
    const x = (s ?? "").trim();
    return x.length ? x : "";
  };

  const fromDoc = t(userData?.fullName);
  if (fromDoc) return fromDoc;

  const handle = t(userData?.username);
  if (handle) return handle;

  const emailLocal = t(user?.email?.split("@")[0]);
  if (emailLocal) return emailLocal;

  const authDn = t(user?.displayName);
  if (authDn && authDn !== user?.uid) return authDn;

  return "User";
}

export function onAuthChange(
  callback: (user: AuthUser | null) => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  if (!isBackendConfigured()) {
    callback(null);
    return () => {};
  }

  let cancelled = false;

  const run = async () => {
    const u = await getCurrentUser();
    if (!cancelled) callback(u);
  };

  void run();

  const onStorage = (e: StorageEvent) => {
    if (e.key === AUTH_TOKEN_STORAGE_KEY) void run();
  };
  const onCustom = () => void run();

  window.addEventListener("storage", onStorage);
  window.addEventListener(AUTH_CHANGED_EVENT, onCustom);

  return () => {
    cancelled = true;
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(AUTH_CHANGED_EVENT, onCustom);
  };
}

export async function resetPassword(email: string): Promise<void> {
  if (!isBackendConfigured()) {
    throw new AuthError("API is not configured.", "auth/configuration-error");
  }
  const res = await apiFetchJson<unknown>("/auth/forgot-password", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  if (!res.ok && res.status !== 204) {
    throw new AuthError(res.message, "auth/unknown");
  }
}

/** Matches Flutter `changePassword` / `POST /auth/change-password` (settings). */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (!isBackendConfigured()) {
    throw new AuthError("API is not configured.", "auth/configuration-error");
  }
  const res = await apiFetchJson<unknown>("/auth/change-password", {
    method: "POST",
    auth: true,
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });
  if (!res.ok && res.status !== 204) {
    throw mapApiAuthError(res.status, res.message, res.code);
  }
}

/** Complete password reset using the token from the reset email (`POST /auth/reset-password`). */
export async function completePasswordReset(
  token: string,
  newPassword: string
): Promise<void> {
  if (!isBackendConfigured()) {
    throw new AuthError("API is not configured.", "auth/configuration-error");
  }
  const res = await apiFetchJson<unknown>("/auth/reset-password", {
    method: "POST",
    auth: false,
    body: JSON.stringify({
      token: token.trim(),
      newPassword,
    }),
  });
  if (!res.ok && res.status !== 204) {
    throw new AuthError(res.message, res.code || "auth/unknown");
  }
}

export async function resendEmailVerification(): Promise<void> {
  const email =
    (typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem(PENDING_VERIFY_EMAIL_KEY)
      : null) || peekPendingVerifyEmail();
  if (!email?.trim()) {
    throw new AuthError(
      "No email on file for resend. Return to sign up and try again.",
      "auth/no-current-user"
    );
  }
  await resendEmailVerificationToEmail(email.trim());
}

export async function resendEmailVerificationToEmail(email: string): Promise<void> {
  if (!isBackendConfigured()) {
    throw new AuthError("API is not configured.", "auth/configuration-error");
  }
  const res = await apiFetchJson<unknown>("/auth/resend-verification", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email: email.trim() }),
  });
  if (!res.ok && res.status !== 204) {
    throw new AuthError(res.message, "auth/unknown");
  }
}

export async function isProfileComplete(userId: string): Promise<boolean> {
  const { isSplashProfileComplete } = await import("@/lib/auth/profileGate");
  const userData = await getUserData(userId);
  return isSplashProfileComplete(userData);
}

function userPatchToApi(data: Partial<UserData>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const put = (key: string, value: unknown) => {
    if (value !== undefined) out[key] = value;
  };
  put("fullName", data.fullName ?? data.name);
  put("username", data.username);
  put("phoneNumber", data.phoneNumber);
  put("location", data.location);
  put("latitude", data.latitude);
  put("longitude", data.longitude);
  put("role", serializeRoleString(data.role));
  put("currentRole", serializeCurrentRoleString(data.currentRole));
  // Nest `UpdateUserDto` — only allowed fields; use switch-role / onboarding for role flags.
  put("isAvailableForWork", data.isAvailableForWork);
  put("availableFW", data.availableFW ?? data.isAvailableForWork);
  if (
    data.description !== undefined ||
    data.bio !== undefined ||
    data.about !== undefined
  ) {
    put("description", data.description ?? data.bio ?? data.about);
  }
  put("skills", data.skills);
  put("photos", data.photos);
  put("photoUrl", data.photoUrl ?? data.profilePicture);
  put("profilePicture", data.profilePicture ?? data.photoUrl);
  put("isVerified", data.isVerified);
  put("totalRating", data.totalRating);
  put("totalReviews", data.totalReviews);
  return out;
}

const BIO_MIN_LEN = 50;
const BIO_MAX_LEN = 1500;
const USERNAME_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const FULL_NAME_MIN_LEN = 2;

function isProviderUser(u: UserData): boolean {
  const r = u.role;
  const cr = u.currentRole;
  return (
    r === "provider" ||
    r === "both" ||
    r === "client+provider" ||
    cr === "provider" ||
    cr === "both"
  );
}

function isProviderCapableRole(r: UserData["role"] | undefined): boolean {
  return r === "provider" || r === "both" || r === "client+provider";
}

function isAllowedRoleTransition(
  prev: UserData["role"] | undefined,
  next: UserData["role"] | undefined
): boolean {
  if (next === undefined) return true;
  if (!prev) return true;
  if (prev === next) return true;
  if (!isProviderCapableRole(prev) && isProviderCapableRole(next)) return true;
  return false;
}

export async function updateUserProfile(
  userId: string,
  data: Partial<UserData>
): Promise<UserData> {
  if (typeof window === "undefined") {
    throw new AuthError("updateUserProfile is client-only", "auth/invalid-environment");
  }
  if (!isBackendConfigured()) {
    throw new AuthError("API is not configured.", "auth/configuration-error");
  }

  const me = await fetchMeUserData();
  if (!me || (me.id !== userId && me.uid !== userId)) {
    throw new AuthError("Not authorized to update this profile.", "auth/unauthorized");
  }
  const existing = me;

  const incomingName = data.fullName ?? data.name;
  if (incomingName !== undefined) {
    const trimmedName = String(incomingName).trim();
    if (!trimmedName) {
      throw new AuthError("Full name is required.", "profile/full-name-required");
    }
    if (trimmedName.length < FULL_NAME_MIN_LEN) {
      throw new AuthError(
        `Full name must be at least ${FULL_NAME_MIN_LEN} characters.`,
        "profile/full-name-too-short"
      );
    }
    if (!/[a-zA-Z]/.test(trimmedName)) {
      throw new AuthError(
        "Full name must contain at least one letter.",
        "profile/full-name-invalid"
      );
    }
    if (existing) {
      const currentName = String(existing.fullName || "").trim();
      const pendingName = String(existing.pendingFullName || "").trim();
      const isActualChange = trimmedName !== currentName;
      if (isActualChange && existing.lastFullNameChangeDate) {
        throw new AuthError(
          "You can change your full name only once.",
          "profile/full-name-once-only"
        );
      }
      if (pendingName && isActualChange && trimmedName !== pendingName) {
        throw new AuthError(
          `A full name change is already pending review: "${pendingName}".`,
          "profile/full-name-pending"
        );
      }
    }
  }

  const bioCandidate =
    data.description !== undefined || data.bio !== undefined || data.about !== undefined
      ? String(data.description ?? data.bio ?? data.about ?? "").trim()
      : undefined;
  if (bioCandidate !== undefined && bioCandidate.length > 0) {
    if (bioCandidate.length < BIO_MIN_LEN) {
      throw new AuthError(
        `Bio must be at least ${BIO_MIN_LEN} characters.`,
        "profile/bio-too-short"
      );
    }
    if (bioCandidate.length > BIO_MAX_LEN) {
      throw new AuthError(
        `Bio must be at most ${BIO_MAX_LEN} characters.`,
        "profile/bio-too-long"
      );
    }
  }

  if (data.username !== undefined && existing) {
    const next = String(data.username).trim();
    const prev = String(existing.username || existing.email.split("@")[0] || "").trim();
    if (next.length < 3 || next.length > 20) {
      throw new AuthError(
        "Username must be between 3 and 20 characters.",
        "profile/username-invalid-length"
      );
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(next)) {
      throw new AuthError(
        "Username may only contain letters, numbers, and underscores, and must start with a letter.",
        "profile/username-invalid-format"
      );
    }
    if (next !== prev && existing.lastUsernameChangeDate) {
      const last = new Date(existing.lastUsernameChangeDate).getTime();
      if (Number.isFinite(last) && Date.now() - last < USERNAME_COOLDOWN_MS) {
        const nextEligible = new Date(last + USERNAME_COOLDOWN_MS);
        const y = nextEligible.getFullYear();
        const m = String(nextEligible.getMonth() + 1).padStart(2, "0");
        const d = String(nextEligible.getDate()).padStart(2, "0");
        throw new AuthError(
          `You can change your username once every month. Next change available on ${y}-${m}-${d}.`,
          "profile/username-cooldown"
        );
      }
    }
  }

  const patch = userPatchToApi(data);

  if ("role" in patch && existing) {
    const nextRoleNormalized = normalizeRoleString(patch.role);
    if (!isAllowedRoleTransition(existing.role, nextRoleNormalized)) {
      delete patch.role;
    }
  }

  if ("currentRole" in patch && existing) {
    const nextCurrentNormalized = normalizeCurrentRoleString(patch.currentRole);
    const effectiveRole =
      ("role" in patch ? normalizeRoleString(patch.role) : undefined) ??
      existing.role;
    if (
      nextCurrentNormalized === "provider" &&
      !isProviderCapableRole(effectiveRole)
    ) {
      delete patch.currentRole;
    }
  }

  if (existing && isProviderUser(existing)) {
    const incomingName2 = data.fullName ?? data.name;
    if (incomingName2 !== undefined) {
      const nf = String(incomingName2).trim();
      const of = String(existing.fullName || "").trim();
      if (nf !== of) {
        delete patch.fullName;
        delete patch.name;
        patch.pendingFullName = nf;
      }
    }
  }

  if (data.username !== undefined && existing) {
    const next = String(data.username).trim();
    const prev = String(existing.username || existing.email.split("@")[0] || "").trim();
    if (next !== prev) {
      patch.lastUsernameChangeDate = new Date().toISOString();
    }
  }

  const res = await apiFetchJson<unknown>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new AuthError(res.message, "profile/update-failed");
  }

  const updated = await fetchMeUserData();
  if (!updated) {
    throw new AuthError("Failed to read updated profile.", "profile/update-failed");
  }
  return updated;
}

/** Flutter `BackendAuthRemoteDataSource.switchRole` — POST `/users/:id/switch-role`. */
export async function switchRoleOnBackend(
  userId: string,
  params: { targetRole: "Provider" | "Client"; permanent: boolean }
): Promise<void> {
  if (typeof window === "undefined") {
    throw new AuthError("switchRoleOnBackend is client-only", "auth/invalid-environment");
  }
  if (!isBackendConfigured()) {
    throw new AuthError("API is not configured.", "auth/configuration-error");
  }
  const me = await fetchMeUserData();
  if (!me || (me.id !== userId && me.uid !== userId)) {
    throw new AuthError("Not authorized to switch this account.", "auth/unauthorized");
  }
  const res = await apiFetchJson<unknown>(
    `/users/${encodeURIComponent(userId)}/switch-role`,
    {
      method: "POST",
      body: JSON.stringify({
        targetRole: params.targetRole,
        permanent: params.permanent,
      }),
    }
  );
  if (!res.ok) {
    throw new AuthError(res.message || "Role switch failed.", "auth/switch-role-failed");
  }
}

/** Flutter `PATCH /users/:userId/skills`. */
export async function patchUserSkills(userId: string, skills: string[]): Promise<void> {
  if (typeof window === "undefined") {
    throw new AuthError("patchUserSkills is client-only", "auth/invalid-environment");
  }
  if (!isBackendConfigured()) {
    throw new AuthError("API is not configured.", "auth/configuration-error");
  }
  const res = await apiFetchJson<unknown>(
    `/users/${encodeURIComponent(userId)}/skills`,
    {
      method: "PATCH",
      body: JSON.stringify({ skills }),
    }
  );
  if (!res.ok) {
    throw new AuthError(res.message || "Failed to update skills.", "profile/skills-failed");
  }
}

export async function becomeProviderWithProfile(
  userId: string,
  params: { description: string; skills: string[] }
): Promise<UserData> {
  await switchRoleOnBackend(userId, { targetRole: "Provider", permanent: true });
  await updateUserProfile(userId, { description: params.description.trim() });
  await patchUserSkills(userId, params.skills);
  const updated = await fetchMeUserData();
  if (!updated) {
    throw new AuthError(
      "Failed to refresh profile after becoming a provider.",
      "profile/update-failed"
    );
  }
  notifyAuthChanged();
  return updated;
}

export async function switchUserRole(
  userId: string,
  newRole: "client" | "provider"
): Promise<UserData> {
  const currentUser = await getUserData(userId);
  if (!currentUser) {
    throw new AuthError("User not found", "user-not-found");
  }

  if (newRole === "provider" && !isProviderCapableRole(currentUser.role)) {
    throw new AuthError(
      "Complete your provider profile before switching to Provider mode.",
      "auth/provider-profile-required"
    );
  }
  if (!isBackendConfigured()) {
    throw new AuthError("API is not configured.", "auth/configuration-error");
  }

  const serializedCurrentRole = serializeCurrentRoleString(newRole);
  if (!serializedCurrentRole) {
    throw new AuthError("Invalid target role.", "auth/invalid-role");
  }

  const res = await apiFetchJson<unknown>("/users/me", {
    method: "PATCH",
    body: JSON.stringify({ currentRole: serializedCurrentRole }),
  });
  if (!res.ok) {
    throw new AuthError(res.message, "auth/invalid-role");
  }

  const refreshed = await fetchMeUserData();
  if (!refreshed) {
    const { currentRole: _c, updatedAt: _u, ...rest } = currentUser;
    return {
      ...rest,
      currentRole: newRole,
      updatedAt: new Date().toISOString(),
    } as UserData;
  }
  return refreshed;
}

export async function getSessions(): Promise<
  Array<{
    id: string;
    deviceName?: string;
    userAgent?: string;
    createdAt?: string;
    lastUsedAt?: string;
  }>
> {
  const res = await apiFetchJson<
    Array<{
      id: string;
      deviceName?: string;
      userAgent?: string;
      createdAt?: string;
      lastUsedAt?: string;
    }>
  >("/auth/sessions");
  if (!res.ok) return [];
  return Array.isArray(res.data) ? res.data : [];
}

export async function revokeSession(sessionId: string): Promise<void> {
  const res = await apiFetchJson<unknown>(
    `/auth/sessions/${encodeURIComponent(sessionId)}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    throw new AuthError(res.message, "auth/unknown");
  }
}

export async function revokeAllOtherSessions(): Promise<void> {
  const res = await apiFetchJson<unknown>("/auth/sessions", { method: "DELETE" });
  if (!res.ok) {
    throw new AuthError(res.message, "auth/unknown");
  }
}

export async function acceptTerms(): Promise<UserData> {
  if (!isBackendConfigured()) {
    throw new AuthError("API is not configured.", "auth/configuration-error");
  }
  const res = await apiFetchJson<unknown>("/auth/accept-terms", {
    method: "POST",
  });
  if (!res.ok) {
    throw new AuthError(res.message, "auth/unknown");
  }
  const refreshed = await fetchMeUserData();
  if (!refreshed) throw new AuthError("Failed to load profile", "auth/unknown");
  return refreshed;
}

export async function updateOnboarding(data: {
  step?: number;
  completed?: boolean;
}): Promise<UserData> {
  if (!isBackendConfigured()) {
    throw new AuthError("API is not configured.", "auth/configuration-error");
  }
  const res = await apiFetchJson<unknown>("/users/me/onboarding", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new AuthError(res.message, "auth/unknown");
  }
  const refreshed = await fetchMeUserData();
  if (!refreshed) throw new AuthError("Failed to load profile", "auth/unknown");
  return refreshed;
}
