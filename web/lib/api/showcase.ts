/**
 * Showcase / portfolio via TaskZing REST API (`/showcase-work`).
 */
import { apiFetchJson, isBackendConfigured } from "./http";
import { bookmarkProfile } from "@/lib/api/users";

export interface ShowcaseItem {
  id?: string;
  userId: string;
  postingAs: "individual" | "company" | "instore";
  companyName?: string;
  storeName?: string;
  title: string;
  skills?: string;
  description: string;
  location: string;
  lat?: number;
  lng?: number;
  imageUrls: string[];
  videoUrl?: string;
  tags?: string[];
  likesCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

function requireApi(): void {
  if (!isBackendConfigured()) {
    throw new Error("API is not configured.");
  }
}

function timestampToDate(value: unknown): Date {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "string") return new Date(value);
  return new Date();
}

function coordNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v) && v !== 0) return v;
  const n = Number(v);
  return Number.isFinite(n) && n !== 0 ? n : undefined;
}

function docToShowcase(
  id: string,
  data: Record<string, unknown>,
  parentUserId?: string
): ShowcaseItem {
  let imageUrls: string[] = [];
  if (Array.isArray(data.images)) {
    imageUrls = (data.images as { imageUrl?: string }[])
      .map((x) => (typeof x?.imageUrl === "string" ? x.imageUrl : ""))
      .filter(Boolean);
  }
  if (imageUrls.length === 0 && Array.isArray(data.imageUrls)) {
    imageUrls = data.imageUrls as string[];
  } else if (imageUrls.length === 0 && typeof data.imageUrls === "string" && data.imageUrls) {
    imageUrls = [data.imageUrls];
  } else if (imageUrls.length === 0 && Array.isArray(data.images)) {
    imageUrls = data.images as string[];
  } else if (imageUrls.length === 0 && typeof data.imageUrl === "string" && data.imageUrl) {
    imageUrls = [data.imageUrl as string];
  }

  let videoUrl: string | undefined;
  if (typeof data.videoUrl === "string") videoUrl = data.videoUrl;
  else if (Array.isArray(data.videos) && data.videos.length > 0) {
    const v0 = data.videos[0] as { videoUrl?: string };
    if (typeof v0?.videoUrl === "string") videoUrl = v0.videoUrl;
  }

  const tags = Array.isArray(data.tags)
    ? (data.tags as string[])
    : Array.isArray(data.skills)
      ? (data.skills as string[])
      : undefined;

  const skills =
    typeof data.skills === "string"
      ? data.skills
      : Array.isArray(data.skills)
        ? (data.skills as string[]).join(", ")
        : typeof data.category === "string"
          ? (data.category as string)
          : undefined;

  const lat =
    coordNum(data.lat) ??
    coordNum(data.latitude) ??
    coordNum((data.coordinates as Record<string, unknown>)?.latitude);
  const lng =
    coordNum(data.lng) ??
    coordNum(data.longitude) ??
    coordNum((data.coordinates as Record<string, unknown>)?.longitude);

  return {
    id,
    userId: String(data.userId ?? parentUserId ?? ""),
    postingAs: (data.postingAs as ShowcaseItem["postingAs"]) || "individual",
    companyName: (data.companyName ?? data.businessName) as string | undefined,
    storeName: (data.storeName ?? data.shopName) as string | undefined,
    title: String(data.title ?? data.name ?? ""),
    skills,
    description: String(data.description ?? ""),
    location: String(data.location ?? data.address ?? ""),
    lat,
    lng,
    imageUrls,
    videoUrl,
    tags,
    likesCount: Math.max(0, Number(data.likesCount ?? 0) || 0),
    createdAt: timestampToDate(data.createdAt ?? data.timestamp),
    updatedAt: timestampToDate(data.updatedAt ?? data.createdAt ?? data.timestamp),
  };
}

function normalizeShowcase(item: ShowcaseItem): ShowcaseItem {
  return {
    ...item,
    createdAt:
      item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt),
    updatedAt:
      item.updatedAt instanceof Date ? item.updatedAt : new Date(item.updatedAt),
  };
}

export function formatShowcaseLoadError(err: unknown): string {
  const e = err as { message?: string };
  return typeof e?.message === "string" && e.message.length > 0
    ? e.message
    : "Failed to load showcase items.";
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export async function uploadShowcaseImage(file: File): Promise<string> {
  return fileToDataUrl(file);
}

export async function uploadShowcaseImages(
  files: File[],
  _userId: string
): Promise<string[]> {
  return Promise.all(files.map((file) => uploadShowcaseImage(file)));
}

export async function uploadShowcaseVideo(
  file: File,
  _userId: string
): Promise<string> {
  return fileToDataUrl(file);
}

export async function deleteShowcaseImage(_imageUrl: string): Promise<void> {
  return;
}

export async function deleteShowcaseVideo(_videoUrl: string): Promise<void> {
  return;
}

function showcasePayload(
  userId: string,
  id: string,
  data: Omit<ShowcaseItem, "id" | "userId" | "createdAt" | "updatedAt">
) {
  const images = (data.imageUrls ?? []).map((imageUrl, i) => ({
    imageId: `img-${i}`,
    imageUrl,
    imageOrder: i,
  }));
  const videos = data.videoUrl
    ? [
        {
          videoId: "vid-0",
          videoUrl: data.videoUrl,
          videoOrder: 0,
        },
      ]
    : [];
  const payload: Record<string, unknown> = {
    id,
    name: data.title,
    title: data.title,
    skills: data.skills ?? "",
    description: data.description,
    location: data.location,
    images,
    videos,
    postingAs: data.postingAs,
    companyName: data.companyName,
    storeName: data.storeName,
    tags: data.tags,
    userId,
  };
  if (typeof data.lat === "number" && Number.isFinite(data.lat)) {
    payload.lat = data.lat;
    payload.latitude = data.lat;
  }
  if (typeof data.lng === "number" && Number.isFinite(data.lng)) {
    payload.lng = data.lng;
    payload.longitude = data.lng;
  }
  return payload;
}

export async function createShowcaseItem(
  userId: string,
  data: Omit<ShowcaseItem, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<string> {
  requireApi();
  const id = `showcase-${Date.now()}`;
  const body = showcasePayload(userId, id, data);
  const res = await apiFetchJson<Record<string, unknown>>("/showcase-work", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(res.message || "Failed to create showcase");
  }
  const out = res.data || {};
  return String((out as { id?: string }).id ?? id);
}

export async function backfillShowcaseSubmissions(): Promise<number> {
  return 0;
}

export async function getUserShowcases(userId: string): Promise<ShowcaseItem[]> {
  requireApi();
  const res = await apiFetchJson<unknown>(
    `/showcase-work/user/${encodeURIComponent(userId)}`
  );
  if (!res.ok) {
    throw new Error(res.message || "Failed to load showcases");
  }
  const list = Array.isArray(res.data)
    ? res.data
    : res.data &&
        typeof res.data === "object" &&
        Array.isArray((res.data as { items?: unknown[] }).items)
      ? (res.data as { items: unknown[] }).items
      : [];
  return (list as Record<string, unknown>[])
    .map((item, i) => {
      const sid = String(item.id ?? item.showcaseId ?? `s-${i}`);
      return normalizeShowcase(docToShowcase(sid, item, userId));
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getAllShowcases(): Promise<ShowcaseItem[]> {
  requireApi();
  const res = await apiFetchJson<unknown>("/showcase-work?limit=200");
  if (res.ok) {
    const list = Array.isArray(res.data)
      ? res.data
      : res.data &&
          typeof res.data === "object" &&
          Array.isArray((res.data as { items?: unknown[] }).items)
        ? (res.data as { items: unknown[] }).items
        : [];
    return (list as Record<string, unknown>[])
      .map((item, i) => {
        const sid = String(item.id ?? `s-${i}`);
        const uid = String(item.userId ?? "");
        return normalizeShowcase(docToShowcase(sid, item, uid));
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  return [];
}

export async function getShowcaseItem(
  id: string,
  userId?: string
): Promise<ShowcaseItem | null> {
  requireApi();
  const res = await apiFetchJson<Record<string, unknown>>(
    `/showcase-work/${encodeURIComponent(id)}`
  );
  if (res.ok && res.data) {
    const data = res.data;
    const uid = String(data.userId ?? userId ?? "");
    return normalizeShowcase(docToShowcase(id, data, uid));
  }
  if (userId) {
    const list = await getUserShowcases(userId).catch(() => []);
    const found = list.find((x) => x.id === id);
    if (found) return found;
  }
  return null;
}

export async function updateShowcaseItem(
  id: string,
  data: Partial<Omit<ShowcaseItem, "id" | "userId" | "createdAt">>,
  userId?: string
): Promise<void> {
  requireApi();
  const existing = await getShowcaseItem(id, userId);
  if (!existing) throw new Error("Showcase not found");
  if (userId !== undefined && existing.userId !== userId) {
    throw new Error("Not authorized");
  }

  const merged: Omit<ShowcaseItem, "id" | "createdAt" | "updatedAt"> = {
    ...existing,
    ...data,
    userId: existing.userId,
    imageUrls: data.imageUrls ?? existing.imageUrls,
  };

  const body = showcasePayload(existing.userId, id, merged);
  const res = await apiFetchJson<unknown>(
    `/showcase-work/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        title: body.title,
        name: body.name,
        skills: body.skills,
        description: body.description,
        location: body.location,
        images: body.images,
        videos: body.videos,
        postingAs: body.postingAs,
        companyName: body.companyName,
        storeName: body.storeName,
        tags: body.tags,
      }),
    }
  );
  if (!res.ok) {
    throw new Error(res.message || "Failed to update showcase");
  }
}

export async function deleteShowcaseItem(
  id: string,
  _imageUrls?: string[],
  _videoUrl?: string,
  userId?: string
): Promise<void> {
  requireApi();
  const existing = await getShowcaseItem(id, userId);
  if (!existing) return;
  if (userId !== undefined && existing.userId !== userId) {
    throw new Error("Not authorized");
  }
  const res = await apiFetchJson<unknown>(
    `/showcase-work/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(res.message || "Failed to delete showcase");
  }
}

function bookmarkStorageKey(userId: string): string {
  return `taskzing_showcase_bookmarks_${userId}`;
}

function readBookmarkSet(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(bookmarkStorageKey(userId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function writeBookmarkSet(userId: string, set: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(bookmarkStorageKey(userId), JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

export async function bookmarkShowcase(
  userId: string,
  showcaseId: string,
  showcaseUserId: string
): Promise<void> {
  if (!userId || !showcaseId) return;
  const set = readBookmarkSet(userId);
  set.add(showcaseId);
  writeBookmarkSet(userId, set);
  try {
    await bookmarkProfile(userId, showcaseUserId, { suppressSavedToast: true });
  } catch {
    // optional
  }
}

export async function unbookmarkShowcase(
  userId: string,
  showcaseId: string
): Promise<void> {
  if (!userId || !showcaseId) return;
  const set = readBookmarkSet(userId);
  set.delete(showcaseId);
  writeBookmarkSet(userId, set);
}

/** Bookmarked showcase IDs for the current device (localStorage). */
export function getBookmarkedShowcaseIds(userId: string): string[] {
  if (!userId) return [];
  return [...readBookmarkSet(userId)];
}

export async function getUserBookmarkedShowcases(
  userId: string
): Promise<ShowcaseItem[]> {
  if (!userId) return [];
  const ids = [...readBookmarkSet(userId)];
  const items: ShowcaseItem[] = [];
  for (const id of ids) {
    const item = await getShowcaseItem(id).catch(() => null);
    if (item) items.push(item);
  }
  return items;
}

export async function isShowcaseBookmarked(
  userId: string,
  showcaseId: string
): Promise<boolean> {
  if (!userId || !showcaseId) return false;
  return readBookmarkSet(userId).has(showcaseId);
}
