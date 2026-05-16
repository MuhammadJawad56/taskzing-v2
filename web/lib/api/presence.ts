import { getUserById } from "@/lib/api/users";
import { AUTH_CHANGED_EVENT } from "@/lib/api/http";

/** Treat user as online if a recent presence heartbeat exists. */
export const PRESENCE_RECENT_MS = 120_000;

function coerceLastSeenMs(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number") {
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

export function parseUserPresenceFromDoc(
  data: Record<string, unknown> | undefined
): boolean {
  if (!data) return false;
  if (data.isOnline === false || data.online === false) return false;
  if (
    typeof data.status === "string" &&
    String(data.status).toLowerCase() === "offline"
  ) {
    return false;
  }
  if (data.isOnline === true || data.online === true) return true;
  if (data.status === "online") return true;
  const lastMs = coerceLastSeenMs(data.lastOnline ?? data.lastStatusChange);
  if (lastMs != null && Date.now() - lastMs < PRESENCE_RECENT_MS) return true;
  return false;
}

export function userAppearsOnline(u: {
  isAvailableForWork?: boolean;
  isOnline?: boolean;
  lastOnline?: string;
} | null | undefined): boolean {
  if (!u) return false;
  if (u.isOnline === false) return false;
  if (u.isOnline === true) return true;
  if (u.lastOnline) {
    const t = new Date(u.lastOnline).getTime();
    if (!Number.isNaN(t) && Date.now() - t < PRESENCE_RECENT_MS) return true;
  }
  return false;
}

export function subscribeToUsersPresence(
  userIds: string[],
  onUpdate: (map: Record<string, boolean>) => void
): () => void {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) {
    onUpdate({});
    return () => {};
  }

  let cancelled = false;

  const tick = async () => {
    const map: Record<string, boolean> = {};
    await Promise.all(
      ids.map(async (uid) => {
        try {
          const u = await getUserById(uid);
          map[uid] = u ? userAppearsOnline(u) : false;
        } catch {
          map[uid] = false;
        }
      })
    );
    if (!cancelled) onUpdate(map);
  };

  void tick();
  const interval =
    typeof window !== "undefined" ? window.setInterval(() => void tick(), 12_000) : 0;

  const onAuth = () => void tick();
  if (typeof window !== "undefined") {
    window.addEventListener(AUTH_CHANGED_EVENT, onAuth);
  }

  return () => {
    cancelled = true;
    if (typeof window !== "undefined") {
      window.clearInterval(interval);
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuth);
    }
  };
}
