import { apiFetchJson, isBackendConfigured } from "./http";

export type FollowStatus = {
  isFollowing: boolean;
  isFollowedBy: boolean;
  followersCount: number;
  followingCount: number;
};

export type FollowListUser = {
  id: string;
  fullName: string;
  username: string;
  photoUrl: string | null;
  role: string;
};

export type FollowListPage = {
  items: FollowListUser[];
  hasMore: boolean;
};

const EMPTY_FOLLOW_STATUS: FollowStatus = {
  isFollowing: false,
  isFollowedBy: false,
  followersCount: 0,
  followingCount: 0,
};

function unwrapRecord(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const o = data as Record<string, unknown>;
  for (const key of ["data", "result", "payload"] as const) {
    const inner = o[key];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      return inner as Record<string, unknown>;
    }
  }
  return o;
}

function readBool(data: Record<string, unknown>, camel: string, snake: string): boolean {
  if (data[camel] === true) return true;
  if (data[snake] === true) return true;
  return false;
}

function readCount(data: Record<string, unknown>, camel: string, snake: string): number {
  const raw = data[camel] ?? data[snake];
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/** Flutter/API may return camelCase or snake_case, optionally nested under `data`. */
export function parseFollowStatus(data: unknown): FollowStatus {
  const o = unwrapRecord(data);
  if (!Object.keys(o).length) return { ...EMPTY_FOLLOW_STATUS };
  return {
    isFollowing: readBool(o, "isFollowing", "is_following"),
    isFollowedBy: readBool(o, "isFollowedBy", "is_followed_by"),
    followersCount: readCount(o, "followersCount", "followers_count"),
    followingCount: readCount(o, "followingCount", "following_count"),
  };
}

export function parseFollowListUser(raw: Record<string, unknown>): FollowListUser {
  const id = String(raw.id ?? "").trim();
  const fullName = String(raw.fullName ?? raw.full_name ?? "").trim();
  const username = String(raw.username ?? "").trim();
  const photo1 = raw.photo_url;
  const photo2 = raw.photoUrl;
  const photoUrl =
    (typeof photo1 === "string" && photo1.trim()) ||
    (typeof photo2 === "string" && photo2.trim()) ||
    null;
  const role = String(raw.currentRole ?? raw.current_role ?? raw.role ?? "").trim();
  return { id, fullName, username, photoUrl, role };
}

function parseFollowListPage(data: unknown): FollowListPage {
  const o = unwrapRecord(data);
  const rawItems = o.items;
  const items =
    Array.isArray(rawItems)
      ? rawItems
          .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
          .map(parseFollowListUser)
          .filter((u) => u.id.length > 0)
      : [];
  return { items, hasMore: o.hasMore === true || o.has_more === true };
}

function followPostInit(method: "POST" | "DELETE"): RequestInit {
  return {
    method,
    body: method === "POST" ? JSON.stringify({}) : undefined,
  };
}

function followFailureMessage(res: {
  status: number;
  message: string;
  data: unknown;
}): string {
  const raw = unwrapRecord(res.data);
  const extra =
    typeof raw.message === "string"
      ? raw.message
      : typeof raw.error === "string"
        ? raw.error
        : "";
  const combined = `${res.message} ${extra}`.trim();
  if (res.status === 401) return "Please sign in again to follow profiles.";
  if (
    res.status === 403 &&
    (String(raw.code ?? "").includes("EMAIL_NOT_VERIFIED") ||
      combined.toLowerCase().includes("verify"))
  ) {
    return "Please verify your email before following profiles.";
  }
  if (res.status === 403) return "You cannot follow this profile.";
  if (res.status === 404) return "This profile could not be found.";
  if (combined && !combined.startsWith("Request failed")) return combined;
  return combined || "Follow request failed.";
}

function isBenignFollowConflict(status: number, message: string, extra: string): boolean {
  if (status === 409) return true;
  const combined = `${message} ${extra}`.toLowerCase();
  return (
    combined.includes("already") ||
    combined.includes("duplicate") ||
    combined.includes("exists") ||
    combined.includes("following")
  );
}

function isBenignUnfollowMiss(status: number): boolean {
  return status === 404 || status === 400;
}

export async function getFollowStatusFull(userId: string): Promise<FollowStatus> {
  if (!isBackendConfigured() || !userId.trim()) return { ...EMPTY_FOLLOW_STATUS };
  const res = await apiFetchJson<unknown>(
    `/users/${encodeURIComponent(userId)}/follow-status`,
  );
  if (!res.ok) return { ...EMPTY_FOLLOW_STATUS };
  return parseFollowStatus(res.data);
}

export async function getFollowStatus(userId: string): Promise<boolean> {
  const status = await getFollowStatusFull(userId);
  return status.isFollowing;
}

export async function followUser(userId: string): Promise<void> {
  if (!isBackendConfigured() || !userId.trim()) return;
  const res = await apiFetchJson(`/users/${encodeURIComponent(userId)}/follow`, followPostInit("POST"));
  if (!res.ok) throw new Error(followFailureMessage(res));
}

/** Flutter parity: tolerate already-following responses. */
export async function followUserIdempotent(userId: string): Promise<void> {
  if (!isBackendConfigured() || !userId.trim()) return;
  const res = await apiFetchJson(`/users/${encodeURIComponent(userId)}/follow`, followPostInit("POST"));
  if (res.ok) return;
  const raw = unwrapRecord(res.data);
  const extra =
    typeof raw.message === "string"
      ? raw.message
      : typeof raw.error === "string"
        ? raw.error
        : "";
  if (isBenignFollowConflict(res.status, res.message, extra)) return;
  throw new Error(followFailureMessage(res));
}

export async function unfollowUser(userId: string): Promise<void> {
  if (!isBackendConfigured() || !userId.trim()) return;
  const res = await apiFetchJson(`/users/${encodeURIComponent(userId)}/follow`, followPostInit("DELETE"));
  if (!res.ok) throw new Error(followFailureMessage(res));
}

/** Flutter parity: unfollow is idempotent when the relation is already gone. */
export async function unfollowUserRelaxed(userId: string): Promise<void> {
  if (!isBackendConfigured() || !userId.trim()) return;
  const res = await apiFetchJson(`/users/${encodeURIComponent(userId)}/follow`, followPostInit("DELETE"));
  if (res.ok) return;
  if (isBenignUnfollowMiss(res.status)) return;
  throw new Error(followFailureMessage(res));
}

export async function getFollowers(
  userId: string,
  options?: { limit?: number; offset?: number },
): Promise<FollowListPage> {
  if (!isBackendConfigured()) return { items: [], hasMore: false };
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;
  const res = await apiFetchJson<unknown>(
    `/users/${encodeURIComponent(userId)}/followers?limit=${limit}&offset=${offset}`,
  );
  if (!res.ok) throw new Error(res.message || "Failed to load followers");
  return parseFollowListPage(res.data);
}

export async function getFollowing(
  userId: string,
  options?: { limit?: number; offset?: number },
): Promise<FollowListPage> {
  if (!isBackendConfigured()) return { items: [], hasMore: false };
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;
  const res = await apiFetchJson<unknown>(
    `/users/${encodeURIComponent(userId)}/following?limit=${limit}&offset=${offset}`,
  );
  if (!res.ok) throw new Error(res.message || "Failed to load following");
  return parseFollowListPage(res.data);
}

export async function removeFollower(followerUserId: string): Promise<void> {
  if (!isBackendConfigured()) return;
  const res = await apiFetchJson(
    `/users/${encodeURIComponent(followerUserId)}/follower`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(res.message || "Failed to remove follower");
}
