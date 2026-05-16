import { apiFetchJson, isBackendConfigured } from "./http";
import {
  parseCommentFromAddResponse,
  parseFeedPageFromJson,
  parseReelCommentFromJson,
  parseReelFromResponse,
} from "@/lib/reels/parse";
import type { Reel, ReelComment, ReelFeedPage, ReelsFeedModeApi } from "@/lib/reels/types";

function requireApi(): void {
  if (!isBackendConfigured()) throw new Error("API is not configured.");
}

export async function fetchReelsFeedPage(params: {
  page: number;
  limit?: number;
  mode: ReelsFeedModeApi;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}): Promise<ReelFeedPage> {
  requireApi();
  const limit = params.limit ?? 10;
  const q = new URLSearchParams({
    page: String(params.page),
    limit: String(limit),
    mode: params.mode,
  });
  if (params.lat != null && params.lng != null) {
    q.set("lat", String(params.lat));
    q.set("lng", String(params.lng));
  }
  if (params.radiusKm != null) q.set("radiusKm", String(params.radiusKm));

  const res = await apiFetchJson<Record<string, unknown>>(`/reels/feed?${q}`);
  if (!res.ok) throw new Error(res.message || "Failed to load reels");
  return parseFeedPageFromJson(res.data as Record<string, unknown>, params.page, limit);
}

export async function fetchReelById(reelId: string): Promise<Reel | null> {
  requireApi();
  const res = await apiFetchJson<unknown>(`/reels/${encodeURIComponent(reelId)}`);
  if (!res.ok) return null;
  return parseReelFromResponse(res.data);
}

export async function toggleReelLike(reelId: string): Promise<Reel | null> {
  requireApi();
  const res = await apiFetchJson<unknown>(`/reels/${encodeURIComponent(reelId)}/like`, {
    method: "POST",
  });
  if (!res.ok) return null;
  return parseReelFromResponse(res.data);
}

export async function trackReelShare(reelId: string): Promise<Reel | null> {
  requireApi();
  const res = await apiFetchJson<unknown>(`/reels/${encodeURIComponent(reelId)}/share`, {
    method: "POST",
  });
  if (!res.ok) return null;
  return parseReelFromResponse(res.data);
}

export async function fetchReelComments(reelId: string): Promise<ReelComment[]> {
  requireApi();
  const res = await apiFetchJson<Record<string, unknown>>(
    `/reels/${encodeURIComponent(reelId)}/comments`
  );
  if (!res.ok) return [];
  const items = (res.data?.items as unknown[]) ?? [];
  return items
    .filter((e): e is Record<string, unknown> => Boolean(e && typeof e === "object"))
    .map((e) => parseReelCommentFromJson(e));
}

export async function addReelComment(reelId: string, text: string): Promise<ReelComment | null> {
  requireApi();
  const res = await apiFetchJson<unknown>(`/reels/${encodeURIComponent(reelId)}/comment`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
  if (!res.ok) return null;
  return parseCommentFromAddResponse(res.data);
}

export type UploadSlotResponse = {
  uploadUrl: string;
  objectKey: string;
  headers?: Record<string, string>;
};

export async function requestReelUploadSlot(params: {
  fileName: string;
  contentType: string;
  byteSize: number;
}): Promise<UploadSlotResponse> {
  requireApi();
  const res = await apiFetchJson<Record<string, unknown>>("/reels/upload-slot", {
    method: "POST",
    body: JSON.stringify({
      fileName: params.fileName,
      contentType: params.contentType,
      byteSize: params.byteSize,
    }),
  });
  if (!res.ok) throw new Error(res.message || "Upload slot failed");
  const d = res.data;
  const uploadUrl = String((d?.uploadUrl ?? d?.url) ?? "");
  const objectKey = String(d?.objectKey ?? "");
  const headersRaw = d?.headers;
  let headers: Record<string, string> | undefined;
  if (headersRaw && typeof headersRaw === "object" && !Array.isArray(headersRaw)) {
    headers = {};
    for (const [k, v] of Object.entries(headersRaw)) {
      headers[k] = String(v);
    }
  }
  if (!uploadUrl || !objectKey) throw new Error("Upload slot missing url or objectKey");
  return { uploadUrl, objectKey, headers };
}

export async function putVideoToUploadUrl(
  uploadUrl: string,
  bytes: ArrayBuffer,
  contentType: string,
  extraHeaders?: Record<string, string>
): Promise<void> {
  const h: Record<string, string> = {
    "Content-Type": contentType,
    ...extraHeaders,
  };
  let current = uploadUrl;
  for (let i = 0; i < 3; i++) {
    const res = await fetch(current, { method: "PUT", headers: h, body: bytes });
    if (res.status === 307 || res.status === 308) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error("Redirect without location");
      current = new URL(loc, current).toString();
      continue;
    }
    if (!res.ok) throw new Error(`R2 upload failed: ${res.status}`);
    return;
  }
  throw new Error("Too many redirects");
}

export async function finalizeReel(params: {
  objectKey: string;
  caption: string;
}): Promise<Reel | null> {
  requireApi();
  const res = await apiFetchJson<unknown>("/reels", {
    method: "POST",
    body: JSON.stringify({
      objectKey: params.objectKey,
      caption: params.caption,
    }),
  });
  if (!res.ok) throw new Error(res.message || "Finalize reel failed");
  return parseReelFromResponse(res.data);
}
