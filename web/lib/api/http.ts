/**
 * HTTP helpers for TaskZing REST API (JWT Bearer auth).
 */

/**
 * Production API — same default as Flutter `BackendConfig.fromEnvironment`
 * (`lib/core/config/backend_config.dart`).
 */
export const TASKZING_API_DEFAULT_BASE_URL =
  "https://taskzing-backend-production.up.railway.app";

/** Use env only when it is a valid absolute `http:` / `https:` URL (ignores `/`, empty, typos). */
function resolveApiBaseUrlFromEnv(): string | undefined {
  if (typeof process === "undefined") return undefined;
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (raw == null || typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (!t || t === "/") return undefined;
  if (!/^https?:\/\//i.test(t)) return undefined;
  return t.replace(/\/$/, "");
}

export const API_BASE_URL =
  resolveApiBaseUrlFromEnv() ?? TASKZING_API_DEFAULT_BASE_URL;

export function getApiBaseUrl(): string {
  return String(API_BASE_URL).replace(/\/$/, "");
}

/** Backend origin for server-side proxy (no trailing slash). */
export function getServerBackendBaseUrl(): string {
  return getApiBaseUrl();
}

/** Browser uses same-origin proxy to avoid CORS; Flutter calls Railway directly. */
export const BROWSER_API_PROXY_PREFIX = "/api/taskzing";

export function resolveApiRequestUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") {
    return `${BROWSER_API_PROXY_PREFIX}${p}`;
  }
  return `${getServerBackendBaseUrl()}${p}`;
}

export const AUTH_TOKEN_STORAGE_KEY = "auth_token";
export const AUTH_CHANGED_EVENT = "taskzing-auth-changed";

export function notifyAuthChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

/** True when an API base URL is configured (defaults to production). */
export function isBackendConfigured(): boolean {
  return Boolean(String(API_BASE_URL || "").trim());
}

export type ApiJsonResult<T> =
  | { ok: true; status: number; data: T }
  | {
      ok: false;
      status: number;
      data: unknown;
      message: string;
      code?: string;
    };

function extractMessage(raw: unknown, status: number): { message: string; code?: string } {
  const o = raw as Record<string, unknown> | null;
  if (o && typeof o === "object") {
    const message = String(o.message || o.error || "");
    const code = typeof o.code === "string" ? o.code : undefined;
    if (message) return { message, code };
  }
  return { message: `Request failed (${status})` };
}

export async function apiFetchJson<T>(
  path: string,
  init?: RequestInit & { auth?: boolean }
): Promise<ApiJsonResult<T>> {
  const useAuth = init?.auth !== false;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...((init?.headers as Record<string, string>) || {}),
  };
  if (useAuth && typeof window !== "undefined") {
    const t = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (t && !headers["Authorization"] && !headers["authorization"]) {
      headers["Authorization"] = `Bearer ${t}`;
    }
  }
  const url = resolveApiRequestUrl(path);
  const res = await fetch(url, { ...init, headers });

  if (res.status === 204) {
    return { ok: true, status: 204, data: undefined as T };
  }

  let raw: unknown = null;
  try {
    raw = await res.json();
  } catch {
    raw = null;
  }

  if (!res.ok) {
    const { message, code } = extractMessage(raw, res.status);
    return { ok: false, status: res.status, data: raw, message, code };
  }

  return { ok: true, status: res.status, data: raw as T };
}

export function setStoredAccessToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
  notifyAuthChanged();
}
