import type { Reel, ReelAuthor, ReelComment, ReelFeedPage } from "./types";

function parseAuthorFromUserJson(userMap: Record<string, unknown>): ReelAuthor {
  return {
    id: String(userMap.id ?? userMap.userId ?? userMap.uid ?? ""),
    username: String(userMap.username ?? "user"),
    avatarUrl:
      (userMap.avatar as string | undefined) ??
      (userMap.avatarUrl as string | undefined) ??
      null,
  };
}

/** Mirrors Flutter `ReelDto.fromJson` + `ReelDtoMapper.toEntity`. */
export function parseReelFromJson(json: Record<string, unknown>): Reel {
  const userRaw = json.user;
  const userMap =
    userRaw && typeof userRaw === "object" && !Array.isArray(userRaw)
      ? (userRaw as Record<string, unknown>)
      : {
          id: json.userId ?? "",
          username: json.username ?? "user",
        };

  return {
    id: String(json.id ?? ""),
    videoUrl: String(json.videoUrl ?? ""),
    thumbnailUrl: json.thumbnailUrl != null ? String(json.thumbnailUrl) : null,
    caption: String(json.caption ?? ""),
    location: (() => {
      const loc = json.location ?? json.locationName;
      if (loc == null) return null;
      const s = String(loc).trim();
      return s || null;
    })(),
    author: parseAuthorFromUserJson(userMap),
    likesCount: Number(json.likesCount ?? 0) || 0,
    commentsCount: Number(json.commentsCount ?? 0) || 0,
    sharesCount: Number(json.sharesCount ?? json.shareCount ?? 0) || 0,
    isLiked: Boolean(json.isLiked),
  };
}

function unwrapReelPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const r = raw.reel;
  if (r && typeof r === "object" && !Array.isArray(r)) {
    return r as Record<string, unknown>;
  }
  return raw;
}

export function parseReelFromResponse(raw: unknown): Reel | null {
  if (!raw || typeof raw !== "object") return null;
  return parseReelFromJson(unwrapReelPayload(raw as Record<string, unknown>));
}

/** Mirrors `ReelsRepositoryImpl.getFeedPage`. */
export function parseFeedPageFromJson(
  map: Record<string, unknown>,
  page: number,
  limit: number
): ReelFeedPage {
  const itemsRaw = map.items;
  let rows: Record<string, unknown>[];
  if (Array.isArray(itemsRaw)) {
    rows = itemsRaw.filter((e): e is Record<string, unknown> =>
      Boolean(e && typeof e === "object" && !Array.isArray(e))
    ) as Record<string, unknown>[];
  } else if (Array.isArray(map.data)) {
    rows = (map.data as unknown[]).filter((e): e is Record<string, unknown> =>
      Boolean(e && typeof e === "object" && !Array.isArray(e))
    ) as Record<string, unknown>[];
  } else {
    rows = [];
  }
  const items = rows.map((e) => parseReelFromJson(e));
  const hasMore =
    typeof map.hasMore === "boolean" ? map.hasMore : items.length >= limit;
  const followedRaw = map.followedCount;
  const followedCount =
    typeof followedRaw === "number" && Number.isFinite(followedRaw) ? followedRaw : null;
  return { items, page, hasMore, followedCount };
}

/** Mirrors `_commentFromMap` in `ReelsRepositoryImpl`. */
export function parseReelCommentFromJson(map: Record<string, unknown>): ReelComment {
  const userRaw = map.user;
  const userMap =
    userRaw && typeof userRaw === "object" && !Array.isArray(userRaw)
      ? (userRaw as Record<string, unknown>)
      : {};

  return {
    id: String(map.id ?? ""),
    reelId: String(map.reelId ?? ""),
    text: String(map.text ?? ""),
    createdAt: String(map.createdAt ?? new Date().toISOString()),
    user: {
      id: String(userMap.id ?? ""),
      username: String(userMap.username ?? "user"),
      avatarUrl: (() => {
        const a = userMap.avatar ?? userMap.avatarUrl;
        if (a == null) return null;
        const s = String(a).trim();
        return s || null;
      })(),
    },
  };
}

export function parseCommentFromAddResponse(raw: unknown): ReelComment | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const inner = o.comment;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return parseReelCommentFromJson(inner as Record<string, unknown>);
  }
  return parseReelCommentFromJson(o);
}
