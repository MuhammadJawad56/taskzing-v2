import {
  getUserData as getApiUserData,
  isProfileComplete as getProfileCompletionState,
  type UserData,
} from "./auth";
import type { User } from "@/lib/types/user";
import {
  PROFILE_SAVED_EVENT,
  PROFILE_SAVED_UNDONE_EVENT,
  PROFILE_UNSAVED_EVENT,
  type ProfileSavedDetail,
  type ProfileSavedUndoneDetail,
  type ProfileUnsavedDetail,
} from "@/lib/profileBookmarkEvents";

type StoredProfileBookmark = {
  id?: string;
  bookmarkedBy: string;
  profileUserId: string;
  createdAt: string;
};

function bookmarksKey(bookmarkedBy: string): string {
  return `taskzing_profile_bookmarks_${bookmarkedBy}`;
}

function readBookmarks(bookmarkedBy: string): StoredProfileBookmark[] {
  if (typeof window === "undefined" || !bookmarkedBy) return [];
  try {
    const raw = localStorage.getItem(bookmarksKey(bookmarkedBy));
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (x): x is StoredProfileBookmark =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as StoredProfileBookmark).profileUserId === "string"
    );
  } catch {
    return [];
  }
}

function writeBookmarks(bookmarkedBy: string, list: StoredProfileBookmark[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(bookmarksKey(bookmarkedBy), JSON.stringify(list));
  } catch {
    // ignore
  }
}

/** Avatar URL: explicit photoUrl/profilePicture, else first entry in photos[]. */
export function getUserProfileImageUrl(
  user: Pick<User, "photoUrl" | "photos"> | null | undefined
): string | undefined {
  if (!user) return undefined;
  const explicit = user.photoUrl?.trim();
  if (explicit) return explicit;
  const fromPhotos = user.photos?.find(
    (p) => typeof p === "string" && p.trim().length > 0
  );
  return fromPhotos?.trim();
}

function toUser(userData: Partial<UserData> & { id: string; email: string }): User {
  const uid = userData.uid || userData.id;
  const createdAt = userData.createdAt || new Date().toISOString();
  const updatedAt = userData.updatedAt || createdAt;

  const photosList = Array.isArray(userData.photos)
    ? userData.photos.filter(
        (p): p is string => typeof p === "string" && p.trim().length > 0
      )
    : [];
  const explicitPhoto =
    (typeof userData.photoUrl === "string" && userData.photoUrl.trim()) ||
    (typeof userData.profilePicture === "string" && userData.profilePicture.trim()) ||
    "";
  const primaryPhoto = explicitPhoto || photosList[0] || "";

  return {
    id: userData.id,
    uid,
    email: userData.email,
    username: userData.email?.split("@")[0],
    fullName: userData.fullName || userData.name || userData.email?.split("@")[0] || "User",
    photoUrl: primaryPhoto || undefined,
    role: userData.role === "client+provider" ? "provider" : (userData.role as User["role"]) || "client",
    currentRole:
      userData.currentRole === "both"
        ? "provider"
        : (userData.currentRole as User["currentRole"]) ||
          ((userData.role === "client+provider" ? "provider" : userData.role) as User["currentRole"]) ||
          "client",
    location: userData.location,
    description: userData.bio || userData.about,
    photos: photosList.length > 0 ? photosList : primaryPhoto ? [primaryPhoto] : [],
    isVerified: userData.isVerified ?? false,
    totalRating: userData.totalRating ?? 0,
    totalReviews: userData.totalReviews ?? 0,
    skills: userData.skills || [],
    isAvailableForWork: userData.isAvailableForWork,
    isOnline: userData.isOnline,
    lastSeen: userData.lastSeen,
    createdAt,
    updatedAt,
  };
}

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const apiUser = await getApiUserData(userId);
    if (apiUser?.id && apiUser.email) {
      return toUser(apiUser as UserData & { id: string; email: string });
    }
  } catch {
    // network failure
  }

  return null;
}

export async function isProfileBookmarked(
  bookmarkedBy: string,
  profileUserId: string
): Promise<boolean> {
  return readBookmarks(bookmarkedBy).some((b) => b.profileUserId === profileUserId);
}

export async function bookmarkProfile(
  bookmarkedBy: string,
  profileUserId: string,
  opts?: { suppressSavedToast?: boolean }
): Promise<void> {
  if (!bookmarkedBy || !profileUserId) return;
  const list = readBookmarks(bookmarkedBy);
  if (list.some((b) => b.profileUserId === profileUserId)) return;
  list.push({
    bookmarkedBy,
    profileUserId,
    createdAt: new Date().toISOString(),
  });
  writeBookmarks(bookmarkedBy, list);
  if (typeof window !== "undefined" && !opts?.suppressSavedToast) {
    window.dispatchEvent(
      new CustomEvent<ProfileSavedDetail>(PROFILE_SAVED_EVENT, {
        detail: { bookmarkedBy, profileUserId },
      }),
    );
  }
}

export async function removeProfileBookmarkQuietly(
  bookmarkedBy: string,
  profileUserId: string
): Promise<void> {
  if (!bookmarkedBy || !profileUserId) return;
  const list = readBookmarks(bookmarkedBy).filter(
    (b) => b.profileUserId !== profileUserId
  );
  writeBookmarks(bookmarkedBy, list);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<ProfileSavedUndoneDetail>(PROFILE_SAVED_UNDONE_EVENT, {
        detail: { bookmarkedBy, profileUserId },
      }),
    );
  }
}

export async function unbookmarkProfile(
  bookmarkedBy: string,
  profileUserId: string
): Promise<void> {
  if (!bookmarkedBy || !profileUserId) return;
  const list = readBookmarks(bookmarkedBy).filter(
    (b) => b.profileUserId !== profileUserId
  );
  writeBookmarks(bookmarkedBy, list);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<ProfileUnsavedDetail>(PROFILE_UNSAVED_EVENT, {
        detail: { bookmarkedBy, profileUserId },
      }),
    );
  }
}

export async function getBookmarkedProfiles(
  bookmarkedBy: string
): Promise<User[]> {
  const raw = readBookmarks(bookmarkedBy).filter(
    (bookmark) => bookmark.bookmarkedBy === bookmarkedBy && bookmark.profileUserId
  );
  const byProfile = new Map<string, StoredProfileBookmark>();
  for (const b of raw) {
    const prev = byProfile.get(b.profileUserId);
    if (
      !prev ||
      new Date(b.createdAt).getTime() > new Date(prev.createdAt).getTime()
    ) {
      byProfile.set(b.profileUserId, b);
    }
  }
  const bookmarks = [...byProfile.values()].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const profiles = await Promise.all(
    bookmarks.map((bookmark) => getUserById(bookmark.profileUserId))
  );

  return profiles.filter((profile): profile is User => profile !== null);
}

export async function getUserBookmarkedProfiles(bookmarkedBy: string): Promise<User[]> {
  return getBookmarkedProfiles(bookmarkedBy);
}

export async function isProfileComplete(userId: string): Promise<boolean> {
  return getProfileCompletionState(userId);
}
