function key(userId: string): string {
  return `taskzing_showcase_drafts_${userId}`;
}

export type ShowcaseDraftFormSnapshot = {
  postingAs: "individual" | "company" | "instore";
  companyName: string;
  storeName: string;
  title: string;
  skills: string;
  description: string;
  location: string;
};

export type ShowcaseDraftDocument = {
  id: string;
  userId: string;
  form: ShowcaseDraftFormSnapshot;
  createdAtMs: number;
  updatedAtMs: number;
};

function readAll(userId: string): ShowcaseDraftDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? (arr as ShowcaseDraftDocument[]) : [];
  } catch {
    return [];
  }
}

function writeAll(userId: string, docs: ShowcaseDraftDocument[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key(userId), JSON.stringify(docs));
  } catch {
    // ignore
  }
}

export async function listShowcaseDrafts(userId: string): Promise<ShowcaseDraftDocument[]> {
  return readAll(userId).sort((a, b) => b.updatedAtMs - a.updatedAtMs);
}

export async function saveShowcaseDraft(
  userId: string,
  form: ShowcaseDraftFormSnapshot,
  existingDraftId?: string | null
): Promise<string> {
  const now = Date.now();
  const all = readAll(userId);

  if (existingDraftId) {
    const idx = all.findIndex((d) => d.id === existingDraftId);
    if (idx >= 0) {
      all[idx] = { ...all[idx], form, updatedAtMs: now };
      writeAll(userId, all);
      return existingDraftId;
    }
  }

  const id = `sw-draft-${now}`;
  all.push({
    id,
    userId,
    form,
    createdAtMs: now,
    updatedAtMs: now,
  });
  writeAll(userId, all);
  return id;
}

export async function deleteShowcaseDraft(userId: string, draftId: string): Promise<void> {
  const all = readAll(userId).filter((d) => d.id !== draftId);
  writeAll(userId, all);
}
