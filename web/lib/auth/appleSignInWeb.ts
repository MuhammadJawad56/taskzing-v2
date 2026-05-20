import { SocialAuthError } from "@/lib/auth/socialAuthError";
import { apiFetchJson } from "@/lib/api/http";
import { APPLE_SERVICES_ID_FALLBACK } from "@/lib/auth/socialAuthConfig";

export type AppleWebCredentials = {
  identityToken: string;
  authorizationCode: string;
  rawNonce: string;
  user?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isPrivateEmail?: boolean;
};

const APPLE_SCRIPT_SRC =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

let appleScriptPromise: Promise<void> | null = null;

function loadAppleScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new SocialAuthError("Apple sign-in is only available in the browser.", "auth/invalid-environment")
    );
  }
  if (window.AppleID?.auth) return Promise.resolve();
  if (appleScriptPromise) return appleScriptPromise;

  appleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${APPLE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new SocialAuthError("Failed to load Apple Sign In.", "auth/configuration-error"))
      );
      if (window.AppleID?.auth) resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = APPLE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new SocialAuthError("Failed to load Apple Sign In.", "auth/configuration-error"));
    document.head.appendChild(script);
  });

  return appleScriptPromise;
}

/** Flutter `SocialAuthProviderDataSource._sha256` — hex digest for Apple `nonce`. */
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function flattenRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = { ...(raw as Record<string, unknown>) };
  for (const k of ["data", "result", "payload"] as const) {
    const inner = o[k];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      Object.assign(o, inner as Record<string, unknown>);
    }
  }
  return o;
}

/** Apple JS on web must return to this site (login/signup), not the backend OAuth callback. */
export function resolveAppleWebRedirectUri(apiRedirect?: string): string {
  if (typeof window === "undefined") return "https://taskzing.com/login";
  const origin = window.location.origin;
  const path = window.location.pathname === "/signup" ? "/signup" : "/login";
  const webRedirect = `${origin}${path}`;

  if (!apiRedirect?.trim()) return webRedirect;

  try {
    const u = new URL(apiRedirect.trim());
    const host = u.hostname.toLowerCase();
    const isBackendCallback =
      host.includes("railway.app") ||
      host.includes("taskzing-backend") ||
      u.pathname.includes("/auth/apple/callback");
    if (isBackendCallback) return webRedirect;
    if (u.origin === origin) return u.toString();
  } catch {
    // ignore malformed URL
  }
  return webRedirect;
}

async function fetchAppleWebConfig(): Promise<{ clientId: string; redirectUri: string }> {
  const webRedirect = resolveAppleWebRedirectUri();

  const res = await apiFetchJson<unknown>("/auth/apple/web-config", {
    method: "GET",
    auth: false,
  });

  if (!res.ok) {
    return {
      clientId: APPLE_SERVICES_ID_FALLBACK,
      redirectUri: webRedirect,
    };
  }

  const o = flattenRecord(res.data);
  const clientId = String(
    o.clientId ?? o.servicesId ?? o.client_id ?? o.services_id ?? APPLE_SERVICES_ID_FALLBACK
  ).trim();
  const apiRedirect = String(
    o.redirectUri ?? o.redirect_uri ?? o.redirectURL ?? ""
  ).trim();

  return {
    clientId: clientId || APPLE_SERVICES_ID_FALLBACK,
    redirectUri: resolveAppleWebRedirectUri(apiRedirect || undefined),
  };
}

function appleIdTokenSub(identityToken: string): string | undefined {
  try {
    const segment = identityToken.split(".")[1];
    if (!segment) return undefined;
    const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(padded)) as { sub?: string };
    return typeof json.sub === "string" && json.sub.trim() ? json.sub.trim() : undefined;
  } catch {
    return undefined;
  }
}

function mapAppleError(err: unknown): SocialAuthError {
  if (err instanceof SocialAuthError) return err;
  const msg =
    err && typeof err === "object" && "error" in err
      ? String((err as { error?: string }).error)
      : err instanceof Error
        ? err.message
        : "Apple sign-in failed.";
  const lower = msg.toLowerCase();
  if (lower.includes("popup") && lower.includes("closed")) {
    return new SocialAuthError(msg, "auth/popup-closed-by-user");
  }
  if (lower.includes("cancel")) {
    return new SocialAuthError(msg, "auth/popup-closed-by-user");
  }
  return new SocialAuthError(msg, "auth/unknown");
}

/** Flutter `toAppleLoginJson()` fields from Apple JS popup sign-in. */
export async function requestAppleWebCredentials(): Promise<AppleWebCredentials> {
  await loadAppleScript();
  const { clientId, redirectUri } = await fetchAppleWebConfig();
  const rawNonce = crypto.randomUUID();
  const hashedNonce = await sha256Hex(rawNonce);

  if (!window.AppleID?.auth) {
    throw new SocialAuthError("Apple Sign In is unavailable.", "auth/configuration-error");
  }

  window.AppleID.auth.init({
    clientId,
    scope: "name email",
    redirectURI: redirectUri,
    state: "taskzing-web",
    nonce: hashedNonce,
    usePopup: true,
  });

  try {
    const response = await window.AppleID.auth.signIn();
    const auth = response?.authorization;
    const identityToken = String(auth?.id_token ?? "").trim();
    const authorizationCode = String(auth?.code ?? "").trim();

    if (!identityToken) {
      throw new SocialAuthError(
        "Apple sign-in did not return an identity token.",
        "auth/configuration-error"
      );
    }

    // Flutter: authorizationCode may be empty; backend still accepts identity token.
    const effectiveAuthCode =
      authorizationCode.length > 0 ? authorizationCode : identityToken;

    const userBlock = response?.user;
    const name = userBlock?.name;
    const email =
      typeof userBlock?.email === "string" && userBlock.email.trim()
        ? userBlock.email.trim()
        : undefined;
    const isPrivateRelay =
      !!email && email.toLowerCase().includes("privaterelay.appleid.com");

    return {
      identityToken,
      authorizationCode: effectiveAuthCode,
      rawNonce,
      user: appleIdTokenSub(identityToken),
      email,
      firstName: name?.firstName?.trim() || undefined,
      lastName: name?.lastName?.trim() || undefined,
      isPrivateEmail: isPrivateRelay ? true : undefined,
    };
  } catch (err) {
    throw mapAppleError(err);
  }
}

/** Flutter `SocialLoginRequestDto.toAppleLoginJson()` — whitelisted Nest DTO keys only. */
export function toAppleLoginJson(creds: AppleWebCredentials): Record<string, unknown> {
  const body: Record<string, unknown> = {
    identityToken: creds.identityToken,
    authorizationCode: creds.authorizationCode,
    identity_token: creds.identityToken,
    authorization_code: creds.authorizationCode,
  };
  const uid = creds.user?.trim();
  if (uid) {
    body.user = uid;
    body.user_id = uid;
  }
  const em = creds.email?.trim();
  if (em) body.email = em;
  const gn = creds.firstName?.trim();
  if (gn) {
    body.firstName = gn;
    body.first_name = gn;
  }
  const fn = creds.lastName?.trim();
  if (fn) {
    body.lastName = fn;
    body.last_name = fn;
  }
  if (creds.isPrivateEmail === true) {
    body.is_private_email = true;
    body.isPrivateEmail = true;
  }
  return body;
}
