/** Flutter `FeedbackFormWidget` — local dummy submission until a feedback API exists. */

export type StoredFeedbackType = "suggestion" | "complaint";

export type StoredFeedbackEntry = {
  id: string;
  type: StoredFeedbackType;
  subject: string;
  message: string;
  userEmail: string;
  userName: string;
  platform: string;
  hasImages: boolean;
  imageCount: number;
  timestamp: string;
  userId: string;
  status: "new";
};

const STORAGE_KEY = "taskzing_feedback_submissions";

function readAll(): StoredFeedbackEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredFeedbackEntry[]) : [];
  } catch {
    return [];
  }
}

function writeAll(entries: StoredFeedbackEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore quota
  }
}

export function saveFeedbackSubmission(
  entry: Omit<StoredFeedbackEntry, "id" | "status" | "timestamp">,
): void {
  const row: StoredFeedbackEntry = {
    ...entry,
    id: `fb-${Date.now()}`,
    status: "new",
    timestamp: new Date().toISOString(),
  };
  const all = readAll();
  all.unshift(row);
  writeAll(all.slice(0, 200));
}

export function getPlatformName(): string {
  if (typeof navigator === "undefined") return "Web";
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Macintosh|Mac OS/i.test(ua)) return "macOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "Web";
}
