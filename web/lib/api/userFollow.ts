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

function parseFollowStatus(data: Record<string, unknown> | undefined): FollowStatus {
  if (!data) return { ...EMPTY_FOLLOW_STATUS };
  return {
    isFollowing: data.isFollowing === true,
    isFollowedBy: data.isFollowedBy === true,
    followersCount: Math.max(0, Number(data.followersCount ?? 0) || 0),
    followingCount: Math.max(0, Number(data.followingCount ?? 0) || 0),
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

function parseFollowListPage(data: Record<string, unknown> | undefined): FollowListPage {
  if (!data) return { items: [], hasMore: false };
  const rawItems = data.items;
  const items =
    Array.isArray(rawItems)
      ? rawItems
          .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
          .map(parseFollowListUser)
          .filter((u) => u.id.length > 0)
      : [];
  return { items, hasMore: data.hasMore === true };
}

export async function getFollowStatusFull(userId: string): Promise<FollowStatus> {
  if (!isBackendConfigured()) return { ...EMPTY_FOLLOW_STATUS };
  const res = await apiFetchJson<Record<string, unknown>>(
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
  if (!isBackendConfigured()) return;
  const res = await apiFetchJson(`/users/${encodeURIComponent(userId)}/follow`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(res.message || "Follow failed");
}

export async function unfollowUser(userId: string): Promise<void> {
  if (!isBackendConfigured()) return;
  const res = await apiFetchJson(`/users/${encodeURIComponent(userId)}/follow`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(res.message || "Unfollow failed");
}

export async function unfollowUserRelaxed(userId: string): Promise<void> {
  if (!isBackendConfigured()) return;
  const res = await apiFetchJson(`/users/${encodeURIComponent(userId)}/follow`, {
    method: "DELETE",
  });
  if (res.ok) return;
  if (res.status === 404 || res.status === 400) return;
  throw new Error(res.message || "Unfollow failed");
}

export async function followUserIdempotent(userId: string): Promise<void> {
  if (!isBackendConfigured()) return;
  const res = await apiFetchJson(`/users/${encodeURIComponent(userId)}/follow`, {
    method: "POST",
  });
  if (res.ok) return;
  if (res.status === 409) return;
  const raw = res.data as Record<string, unknown> | undefined;
  const extra =
    typeof raw?.message === "string"
      ? raw.message
      : typeof raw?.error === "string"
        ? raw.error
        : "";
  const combined = `${res.message} ${extra}`.toLowerCase();
  if (combined.includes("already") || combined.includes("duplicate") || combined.includes("exists")) {
    return;
  }
  throw new Error(res.message || "Follow failed");
}

export async function getFollowers(
  userId: string,
  options?: { limit?: number; offset?: number },
): Promise<FollowListPage> {
  if (!isBackendConfigured()) return { items: [], hasMore: false };
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;
  const res = await apiFetchJson<Record<string, unknown>>(
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
  const res = await apiFetchJson<Record<string, unknown>>(
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
