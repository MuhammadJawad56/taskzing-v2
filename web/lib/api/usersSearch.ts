import { isBackendConfigured, resolveApiRequestUrl } from "./http";

export type SearchUserRow = Record<string, unknown>;

/** Mirrors Flutter `UserService.searchUsers` → GET `/users/search`. */
export async function searchUsers(params: {
  query?: string;
  role?: string | null;
  limit?: number;
}): Promise<SearchUserRow[]> {
  if (!isBackendConfigured()) return [];
  const q = new URLSearchParams();
  const term = params.query?.trim();
  if (term) q.set("searchTerm", term);
  if (params.role && params.role !== "All") q.set("role", params.role);
  q.set("limit", String(params.limit ?? 30));
  q.set("offset", "0");

  const url = `${resolveApiRequestUrl("/users/search")}?${q}`;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) return [];
  let raw: unknown;
  try {
    raw = await res.json();
  } catch {
    return [];
  }
  let list: unknown[];
  if (Array.isArray(raw)) list = raw;
  else if (raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)) {
    list = (raw as { items: unknown[] }).items;
  } else {
    return [];
  }
  return list.filter(
    (u) => u && typeof u === "object" && (u as { deactivated?: boolean }).deactivated !== true
  ) as SearchUserRow[];
}
