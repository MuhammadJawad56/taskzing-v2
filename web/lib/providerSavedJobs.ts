
function key(userId: string): string {
  return `taskzing_saved_jobs_${userId}`;
}

function readSet(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function writeSet(userId: string, set: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key(userId), JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

export async function listSavedJobIds(userId: string): Promise<string[]> {
  if (!userId) return [];
  return [...readSet(userId)];
}

export async function saveJobForUser(
  userId: string,
  jobId: string,
  opts?: { posterUserId?: string }
): Promise<void> {
  if (!userId || !jobId) return;
  const set = readSet(userId);
  set.add(jobId);
  writeSet(userId, set);
}

export async function unsaveJobForUser(userId: string, jobId: string): Promise<void> {
  if (!userId || !jobId) return;
  const set = readSet(userId);
  set.delete(jobId);
  writeSet(userId, set);
}
