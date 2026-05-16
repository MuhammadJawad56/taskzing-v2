/** Job drafts stored locally per client (browser). */

function draftsKey(clientId: string): string {
  return `taskzing_job_drafts_${clientId}`;
}

function readAll(clientId: string): JobDraftDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(draftsKey(clientId));
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? (arr as JobDraftDocument[]) : [];
  } catch {
    return [];
  }
}

function writeAll(clientId: string, docs: JobDraftDocument[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(draftsKey(clientId), JSON.stringify(docs));
  } catch {
    // ignore quota
  }
}

export type JobDraftFormSnapshot = {
  title: string;
  companyName: string;
  individualName: string;
  storeName: string;
  category: string;
  description: string;
  price: string;
  estimatedDuration: string;
  location: string;
  additionalLocationNotes: string;
  date: string;
  urgency: "low" | "normal" | "urgent";
  skills: string[];
  timeFlexibility: string;
  startTime: string;
  endTime: string;
};

export type JobDraftDocument = {
  id: string;
  clientId: string;
  jobType: "fixed" | "hourly";
  postingType: "individual" | "company" | "instore";
  form: JobDraftFormSnapshot;
  updatedAtMs: number;
  createdAtMs: number;
};

export async function listJobDrafts(clientId: string): Promise<JobDraftDocument[]> {
  return readAll(clientId).sort((a, b) => b.updatedAtMs - a.updatedAtMs);
}

export async function saveJobDraft(
  clientId: string,
  jobType: "fixed" | "hourly",
  postingType: "individual" | "company" | "instore",
  form: JobDraftFormSnapshot,
  existingDraftId?: string | null
): Promise<string> {
  const now = Date.now();
  const all = readAll(clientId);

  if (existingDraftId) {
    const idx = all.findIndex((d) => d.id === existingDraftId);
    if (idx >= 0) {
      all[idx] = {
        ...all[idx],
        jobType,
        postingType,
        form,
        updatedAtMs: now,
      };
      writeAll(clientId, all);
      return existingDraftId;
    }
  }

  const id = `draft-${now}`;
  all.push({
    id,
    clientId,
    jobType,
    postingType,
    form,
    updatedAtMs: now,
    createdAtMs: now,
  });
  writeAll(clientId, all);
  return id;
}

export async function deleteJobDraft(
  clientId: string,
  draftId: string
): Promise<void> {
  if (!clientId?.trim() || !draftId?.trim()) {
    throw new Error("Missing draft information.");
  }
  const all = readAll(clientId).filter((d) => d.id !== draftId);
  writeAll(clientId, all);
}
