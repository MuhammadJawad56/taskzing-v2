/**
 * Per-user likes (local persistence until a likes API exists).
 */

function showcaseKey(userId: string): string {
  return `taskzing_liked_showcases_${userId}`;
}

function jobsKey(userId: string): string {
  return `taskzing_liked_jobs_${userId}`;
}

function readSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function writeSet(key: string, set: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    // ignore quota
  }
}

export async function getUserLikedShowcaseIds(userId: string): Promise<string[]> {
  if (!userId) return [];
  return [...readSet(showcaseKey(userId))];
}

export async function likeShowcase(
  userId: string,
  showcaseId: string,
  _showcaseUserId?: string
): Promise<void> {
  if (!userId || !showcaseId) return;
  const key = showcaseKey(userId);
  const set = readSet(key);
  set.add(showcaseId);
  writeSet(key, set);
}

export async function unlikeShowcase(userId: string, showcaseId: string): Promise<void> {
  if (!userId || !showcaseId) return;
  const key = showcaseKey(userId);
  const set = readSet(key);
  set.delete(showcaseId);
  writeSet(key, set);
}

export async function getUserLikedJobIds(userId: string): Promise<string[]> {
  if (!userId) return [];
  return [...readSet(jobsKey(userId))];
}

export async function likeJob(
  userId: string,
  jobId: string,
  _clientId?: string
): Promise<void> {
  if (!userId || !jobId) return;
  const key = jobsKey(userId);
  const set = readSet(key);
  set.add(jobId);
  writeSet(key, set);
}

export async function unlikeJob(userId: string, jobId: string): Promise<void> {
  if (!userId || !jobId) return;
  const key = jobsKey(userId);
  const set = readSet(key);
  set.delete(jobId);
  writeSet(key, set);
}
