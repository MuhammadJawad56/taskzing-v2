import { apiFetchJson, isBackendConfigured } from "./http";
import type {
  Task,
  CompletionStatus,
  Urgency,
  PosterType,
  JobType,
} from "@/lib/types/task";

function requireApi(): void {
  if (!isBackendConfigured()) {
    throw new Error("API is not configured.");
  }
}

function timestampToIso(value: unknown): string {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function mapCompletionStatus(data: Record<string, unknown>): CompletionStatus {
  const raw = (
    data.completionStatus ??
    data.status ??
    data.jobStatus ??
    data.state
  ) as string | undefined;
  if (typeof raw === "string") {
    const s = raw.toLowerCase().replace(/-/g, "_");
    const allowed: CompletionStatus[] = [
      "draft",
      "open",
      "in_progress",
      "completed",
      "cancelled",
      "archived",
    ];
    if (allowed.includes(s as CompletionStatus)) return s as CompletionStatus;
    const openAliases = new Set([
      "active",
      "posted",
      "published",
      "live",
      "available",
      "hiring",
      "seeking",
      "seeking_provider",
      "open_for_proposals",
      "openforproposals",
      "new",
    ]);
    if (openAliases.has(s)) return "open";
  }
  return "open";
}

function mapUrgency(data: Record<string, unknown>): Urgency {
  const u = String(data.urgency ?? "normal").toLowerCase();
  if (u === "low" || u === "normal" || u === "high" || u === "urgent") return u;
  return "normal";
}

function mapPosterType(data: Record<string, unknown>): PosterType {
  const p = String(data.posterType ?? "individual").toLowerCase();
  if (p === "individual" || p === "company" || p === "instore") return p;
  return "individual";
}

function mapJobType(data: Record<string, unknown>): JobType {
  const j = String(data.jobType ?? "fixed").toLowerCase();
  return j === "hourly" ? "hourly" : "fixed";
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? x : String(x)));
}

/** Map API job object to `Task`. */
export function apiJobToTask(id: string, data: Record<string, unknown>): Task {
  const lat = num(
    data.lat !== undefined ? data.lat : data.latitude,
    0
  );
  const lng = num(
    data.lng !== undefined ? data.lng : data.longitude,
    0
  );

  const price = num(
    data.price ?? data.fixedPrice ?? data.hourlyRate ?? 0,
    0
  );

  let photos = toStringArray(data.photos);
  if (photos.length === 0) photos = toStringArray(data.images);

  const clientId = String(
    data.clientId ?? data.userId ?? data.client_id ?? data.user_id ?? ""
  );

  return {
    jobId: String(data.jobId ?? id),
    jobType: mapJobType(data),
    title: String(data.title ?? "Untitled"),
    description: String(data.description ?? ""),
    category: String(data.category ?? "Other"),
    subCategory: data.subCategory as string | undefined,
    itemType: data.itemType as string | undefined,
    fixedPrice:
      data.fixedPrice !== undefined ? num(data.fixedPrice) : undefined,
    estimatedDuration:
      data.estimatedDuration !== undefined
        ? num(data.estimatedDuration)
        : undefined,
    hourlyRate:
      data.hourlyRate !== undefined ? num(data.hourlyRate) : undefined,
    timeFlexibility: data.timeFlexibility as string | undefined,
    jobStartTime: data.jobStartTime as string | undefined,
    jobEndTime: data.jobEndTime as string | undefined,
    price,
    lat,
    lng,
    address: String(data.address ?? data.location ?? ""),
    additionalLocationNotes: data.additionalLocationNotes as string | undefined,
    jobDate: data.jobDate as string | undefined,
    storePickup: Boolean(data.storePickup),
    storeName: data.storeName as string | undefined,
    pickupAddress: data.pickupAddress as string | undefined,
    deliveryAddress: data.deliveryAddress as string | undefined,
    completionStatus: mapCompletionStatus(data),
    proposalAcceptance:
      data.proposalAcceptance === "closed" ? "closed" : "open",
    clientId,
    contractorId: data.contractorId as string | undefined,
    acceptedAt: data.acceptedAt
      ? timestampToIso(data.acceptedAt)
      : undefined,
    completedAt: data.completedAt
      ? timestampToIso(data.completedAt)
      : undefined,
    maxHoursAllowed: data.maxHoursAllowed as string | undefined,
    urgency: mapUrgency(data),
    isVerified: Boolean(data.isVerified),
    posterType: mapPosterType(data),
    posterName: data.posterName as string | undefined,
    photos,
    attachments: toStringArray(data.attachments),
    skills: toStringArray(data.skills),
    tags: toStringArray(data.tags),
    likesCount: num(data.likesCount, 0),
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt ?? data.createdAt),
  };
}

/** @deprecated Use `apiJobToTask` — same shape, REST-backed jobs. */
export const firestoreJobToTask = apiJobToTask;

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function normalizeJobsResponse(raw: unknown): Task[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)
      ? (raw as { items: unknown[] }).items
      : raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data)
        ? (raw as { data: unknown[] }).data
        : [];
  return (list as Record<string, unknown>[]).map((item, i) => {
    const id = String(item.jobId ?? item.id ?? `idx-${i}`);
    return apiJobToTask(id, item);
  });
}

async function fetchAllJobs(): Promise<Task[]> {
  requireApi();
  const res = await apiFetchJson<unknown>("/jobs?limit=100");
  if (!res.ok) {
    throw new Error(res.message || "Failed to load jobs");
  }
  const tasks = normalizeJobsResponse(res.data);
  return tasks.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function jobIsOpenForProviderExplore(job: Task): boolean {
  return job.completionStatus === "open";
}

export async function createJob(
  _clientId: string,
  jobData: Partial<Task>
): Promise<Task> {
  requireApi();
  const jobId = jobData.jobId || `job-${Date.now()}`;
  const address = jobData.address || "";

  const body = stripUndefined({
    jobId,
    jobType: jobData.jobType || "fixed",
    title: jobData.title || "Untitled Job",
    description: jobData.description || "",
    category: jobData.category || "Other",
    subCategory: jobData.subCategory,
    itemType: jobData.itemType,
    fixedPrice: jobData.fixedPrice,
    estimatedDuration: jobData.estimatedDuration,
    hourlyRate: jobData.hourlyRate,
    timeFlexibility: jobData.timeFlexibility,
    jobStartTime: jobData.jobStartTime,
    jobEndTime: jobData.jobEndTime,
    price: jobData.price ?? 0,
    lat: jobData.lat ?? 0,
    lng: jobData.lng ?? 0,
    address,
    location: address,
    additionalLocationNotes: jobData.additionalLocationNotes,
    jobDate: jobData.jobDate,
    storePickup: jobData.storePickup ?? false,
    storeName: jobData.storeName,
    pickupAddress: jobData.pickupAddress,
    deliveryAddress: jobData.deliveryAddress,
    completionStatus: jobData.completionStatus || "open",
    proposalAcceptance: jobData.proposalAcceptance || "open",
    contractorId: jobData.contractorId,
    acceptedAt: jobData.acceptedAt,
    completedAt: jobData.completedAt,
    maxHoursAllowed: jobData.maxHoursAllowed,
    urgency: jobData.urgency || "normal",
    isVerified: jobData.isVerified ?? false,
    posterType: jobData.posterType || "individual",
    posterName: jobData.posterName,
    photos: jobData.photos ?? [],
    attachments: jobData.attachments ?? [],
    skills: jobData.skills ?? [],
    tags: jobData.tags ?? [],
  });

  const res = await apiFetchJson<Record<string, unknown>>("/jobs", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(res.message || "Failed to create job");
  }
  const created = (res.data || {}) as Record<string, unknown>;
  const id = String(created.jobId ?? created.id ?? jobId);
  return apiJobToTask(id, { ...created, ...body });
}

export async function getJobsByClientId(clientId: string): Promise<Task[]> {
  const all = await fetchAllJobs();
  return all
    .filter((j) => j.clientId === clientId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export async function getJobsByContractorId(
  contractorId: string
): Promise<Task[]> {
  const all = await fetchAllJobs();
  return all
    .filter((j) => j.contractorId === contractorId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export async function getJobById(jobId: string): Promise<Task | null> {
  requireApi();
  const res = await apiFetchJson<Record<string, unknown>>(
    `/jobs/${encodeURIComponent(jobId)}`
  );
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(res.message || "Failed to load job");
  }
  const data = res.data || {};
  const id = String((data as { jobId?: string }).jobId ?? jobId);
  return apiJobToTask(id, data);
}

export async function updateJob(
  jobId: string,
  patch: Partial<Task>
): Promise<Task> {
  requireApi();
  const body = stripUndefined({
    title: patch.title,
    description: patch.description,
    category: patch.category,
    subCategory: patch.subCategory,
    price: patch.price,
    lat: patch.lat,
    lng: patch.lng,
    address: patch.address,
    completionStatus: patch.completionStatus,
    proposalAcceptance: patch.proposalAcceptance,
    urgency: patch.urgency,
    skills: patch.skills,
    photos: patch.photos,
    jobType: patch.jobType,
    contractorId: patch.contractorId,
    posterType: patch.posterType,
    posterName: patch.posterName,
  });
  const res = await apiFetchJson<Record<string, unknown>>(
    `/jobs/${encodeURIComponent(jobId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    throw new Error(res.message || "Failed to update job");
  }
  const data = res.data || {};
  const id = String((data as { jobId?: string }).jobId ?? jobId);
  return apiJobToTask(id, { ...(data as Record<string, unknown>), ...body });
}

export async function deleteJob(jobId: string, clientId: string): Promise<void> {
  requireApi();
  const existing = await getJobById(jobId);
  if (!existing) return;
  if (existing.clientId !== clientId) {
    throw new Error("Not authorized to delete this job");
  }
  const res = await apiFetchJson<unknown>(
    `/jobs/${encodeURIComponent(jobId)}`,
    { method: "DELETE" }
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(res.message || "Failed to delete job");
  }
}

export async function getOpenJobs(): Promise<Task[]> {
  const all = await fetchAllJobs();
  return all.filter(jobIsOpenForProviderExplore);
}

export async function searchJobs(query: string): Promise<Task[]> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return getOpenJobs();

  return (await getOpenJobs()).filter(
    (job) =>
      job.title.toLowerCase().includes(normalizedQuery) ||
      job.description.toLowerCase().includes(normalizedQuery) ||
      job.category.toLowerCase().includes(normalizedQuery) ||
      (job.subCategory || "").toLowerCase().includes(normalizedQuery) ||
      (job.address || "").toLowerCase().includes(normalizedQuery)
  );
}

export async function getJobsByCategory(category: string): Promise<Task[]> {
  return (await getOpenJobs()).filter(
    (job) => job.category === category || job.subCategory === category
  );
}

function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export async function getJobsNearLocation(
  lat: number,
  lng: number,
  radiusKm = 50
): Promise<Task[]> {
  return (await getOpenJobs()).filter((job) => {
    if (typeof job.lat !== "number" || typeof job.lng !== "number") return false;
    if (job.lat === 0 && job.lng === 0) return false;
    return calculateDistanceKm(lat, lng, job.lat, job.lng) <= radiusKm;
  });
}
