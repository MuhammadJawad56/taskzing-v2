/**
 * TaskZing ChatZing Agent API (jobs, showcases, voice, vision, posters).
 */

export const CHATZING_API_DEFAULT_BASE_URL =
  "https://chatzing-production.up.railway.app";

function resolveChatzingBaseFromEnv(): string | undefined {
  if (typeof process === "undefined") return undefined;
  const raw = process.env.NEXT_PUBLIC_CHATZING_API_BASE_URL;
  if (raw == null || typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (!t || t === "/") return undefined;
  if (!/^https?:\/\//i.test(t)) return undefined;
  return t.replace(/\/$/, "");
}

export const CHATZING_API_BASE_URL =
  resolveChatzingBaseFromEnv() ?? CHATZING_API_DEFAULT_BASE_URL;

export function getChatzingApiBaseUrl(): string {
  return String(CHATZING_API_BASE_URL).replace(/\/$/, "");
}

/** Browser uses same-origin proxy to avoid CORS. */
export const CHATZING_BROWSER_PROXY_PREFIX = "/api/chatzing";

export function resolveChatzingRequestUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") {
    return `${CHATZING_BROWSER_PROXY_PREFIX}${p}`;
  }
  return `${getChatzingApiBaseUrl()}${p}`;
}
