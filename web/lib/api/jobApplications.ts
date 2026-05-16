/**
 * Job applications / proposals via TaskZing REST API.
 */
import { apiFetchJson, isBackendConfigured } from "./http";
import { getJobById, updateJob } from "./jobs";

function requireApi(): void {
  if (!isBackendConfigured()) {
    throw new Error("API is not configured.");
  }
}

export const JOB_APPLICATIONS_COLLECTION = "jobApplications";

export type JobApplicationStatus =
  | "submitted"
  | "shortlisted"
  | "archived"
  | "declined"
  | "withdrawn"
  | "expired"
  | "accepted"
  | "rejected"
  | "completed";

export interface JobApplication {
  applicationId: string;
  jobId: string;
  providerId: string;
  clientId: string;
  proposalText: string;
  bidAmount: number;
  estimatedDuration?: string;
  attachments: string[];
  links: string[];
  status: JobApplicationStatus;
  isMessaged: boolean;
  isHired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitJobApplicationInput {
  jobId: string;
  providerId: string;
  clientId: string;
  proposalText: string;
  bidAmount: number;
  estimatedDuration?: string;
  links?: string[];
  attachments?: string[];
  imageFiles?: File[];
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

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? x : String(x)));
}

function normalizeStatus(raw: unknown): JobApplicationStatus {
  const s = String(raw ?? "submitted").toLowerCase();
  const allowed: JobApplicationStatus[] = [
    "submitted",
    "shortlisted",
    "archived",
    "declined",
    "withdrawn",
    "expired",
    "accepted",
    "rejected",
    "completed",
  ];
  return (allowed.includes(s as JobApplicationStatus)
    ? (s as JobApplicationStatus)
    : "submitted");
}

export function firestoreApplicationToJobApplication(
  id: string,
  data: Record<string, unknown>
): JobApplication {
  return {
    applicationId: String(data.applicationId ?? id),
    jobId: String(data.jobId ?? ""),
    providerId: String(data.providerId ?? ""),
    clientId: String(data.clientId ?? ""),
    proposalText: String(data.proposalText ?? ""),
    bidAmount:
      typeof data.bidAmount === "number"
        ? data.bidAmount
        : Number(data.bidAmount ?? 0) || 0,
    estimatedDuration:
      typeof data.estimatedDuration === "string"
        ? data.estimatedDuration
        : undefined,
    attachments: toStringArray(data.attachments),
    links: toStringArray(data.links),
    status: normalizeStatus(data.status),
    isMessaged: Boolean(data.isMessaged),
    isHired: Boolean(data.isHired ?? data.status === "accepted"),
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt ?? data.createdAt),
  };
}

function apiRecordToApplication(
  id: string,
  data: Record<string, unknown>
): JobApplication {
  return firestoreApplicationToJobApplication(id, data);
}

async function uploadApplicationImages(files: File[], jobId: string): Promise<string[]> {
  if (!files.length) return [];
  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    try {
      const file = files[i];
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result ?? ""));
        r.onerror = () => reject(new Error("read failed"));
        r.readAsDataURL(file);
      });
      if (dataUrl.startsWith("data:")) urls.push(dataUrl);
    } catch (err) {
      console.warn("Proposal image encode failed (skipped):", err);
    }
  }
  if (urls.length === 0 && files.length > 0) {
    console.warn(
      "[job-applications] Attachments must be public URLs for large files; small files use data URLs.",
      jobId
    );
  }
  return urls;
}

function normalizeApplicationsList(raw: unknown): JobApplication[] {
  const list = Array.isArray(raw)
    ? raw
    : raw &&
        typeof raw === "object" &&
        Array.isArray((raw as { items?: unknown }).items)
      ? (raw as { items: unknown[] }).items
      : [];
  return (list as Record<string, unknown>[]).map((item, i) => {
    const id = String(item.applicationId ?? item.id ?? `app-${i}`);
    return apiRecordToApplication(id, item);
  });
}

export async function getApplicationById(
  applicationId: string
): Promise<JobApplication | null> {
  requireApi();
  const res = await apiFetchJson<Record<string, unknown>>(
    `/job-applications/${encodeURIComponent(applicationId)}`
  );
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(res.message || "Proposal not found");
  }
  const data = res.data || {};
  return apiRecordToApplication(
    String((data as { applicationId?: string }).applicationId ?? applicationId),
    data
  );
}

export async function getApplicationsForJob(
  jobId: string
): Promise<JobApplication[]> {
  requireApi();
  const tryPaths = [
    `/job-applications?jobId=${encodeURIComponent(jobId)}`,
    `/job-applications/by-job/${encodeURIComponent(jobId)}`,
  ];
  for (const path of tryPaths) {
    const res = await apiFetchJson<unknown>(path);
    if (res.ok) {
      return normalizeApplicationsList(res.data).sort((a, b) =>
        a.createdAt < b.createdAt ? 1 : -1
      );
    }
    if (res.status !== 404) {
      throw new Error(res.message || "Failed to load proposals");
    }
  }
  const single = await getApplicationById(jobId).catch(() => null);
  return single ? [single] : [];
}

export async function getApplicationsByProvider(
  providerId: string
): Promise<JobApplication[]> {
  requireApi();
  const res = await apiFetchJson<unknown>(
    `/job-applications?providerId=${encodeURIComponent(providerId)}`
  );
  if (res.ok) {
    return normalizeApplicationsList(res.data).sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1
    );
  }
  const fallback = await apiFetchJson<unknown>("/job-applications?limit=200");
  if (!fallback.ok) return [];
  return normalizeApplicationsList(fallback.data)
    .filter((a) => a.providerId === providerId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getApplicationsByClient(
  clientId: string
): Promise<JobApplication[]> {
  requireApi();
  const res = await apiFetchJson<unknown>(
    `/job-applications?clientId=${encodeURIComponent(clientId)}`
  );
  if (res.ok) {
    return normalizeApplicationsList(res.data).sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1
    );
  }
  const fallback = await apiFetchJson<unknown>("/job-applications?limit=200");
  if (!fallback.ok) return [];
  return normalizeApplicationsList(fallback.data)
    .filter((a) => a.clientId === clientId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function hasProviderAppliedForJob(
  jobId: string,
  providerId: string
): Promise<boolean> {
  if (!jobId || !providerId || !isBackendConfigured()) return false;
  try {
    const apps = await getApplicationsForJob(jobId);
    return apps.some((a) => a.providerId === providerId);
  } catch {
    return false;
  }
}

export async function getProposalCountsForJob(
  jobId: string
): Promise<{ total: number; hired: number }> {
  if (!jobId || !isBackendConfigured()) return { total: 0, hired: 0 };
  try {
    const apps = await getApplicationsForJob(jobId);
    const hired = apps.filter((a) => a.isHired || a.status === "accepted").length;
    return { total: apps.length, hired };
  } catch {
    return { total: 0, hired: 0 };
  }
}

export async function submitJobApplication(
  input: SubmitJobApplicationInput
): Promise<JobApplication> {
  requireApi();

  if (!input.jobId) throw new Error("jobId is required");
  if (!input.providerId) throw new Error("providerId is required");
  if (!input.clientId) throw new Error("clientId is required");
  if (input.providerId === input.clientId) {
    throw new Error("You cannot apply to your own job.");
  }

  const already = await hasProviderAppliedForJob(input.jobId, input.providerId);
  if (already) {
    throw new Error("You have already applied to this job.");
  }

  const uploaded = input.imageFiles?.length
    ? await uploadApplicationImages(input.imageFiles, input.jobId)
    : [];

  const attachments = [...(input.attachments ?? []), ...uploaded];
  const applicationId = `app-${Date.now()}`;

  const body: Record<string, unknown> = {
    applicationId,
    jobId: input.jobId,
    proposalText: input.proposalText ?? "",
    bidAmount: Number.isFinite(input.bidAmount) ? input.bidAmount : 0,
    estimatedDuration: input.estimatedDuration,
    attachments,
    links: input.links ?? [],
  };

  const res = await apiFetchJson<Record<string, unknown>>("/job-applications", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(res.message || "Failed to submit proposal");
  }
  const data = res.data || {};
  const id = String(
    (data as { applicationId?: string }).applicationId ?? applicationId
  );
  return apiRecordToApplication(id, { ...body, ...data });
}

export async function updateApplicationStatus(
  applicationId: string,
  status: JobApplicationStatus
): Promise<void> {
  requireApi();
  const res = await apiFetchJson<unknown>(
    `/job-applications/${encodeURIComponent(applicationId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );
  if (!res.ok) {
    throw new Error(res.message || "Failed to update proposal");
  }

  if (status === "accepted") {
    const app = await getApplicationById(applicationId);
    if (app?.jobId && app.providerId) {
      try {
        await updateJob(app.jobId, {
          contractorId: app.providerId,
          completionStatus: "in_progress",
        });
      } catch {
        // server may already sync job
      }
    }
  }
}

export async function updateProposalMessagedStatus(
  applicationId: string,
  isMessaged: boolean
): Promise<void> {
  requireApi();
  const res = await apiFetchJson<unknown>(
    `/job-applications/${encodeURIComponent(applicationId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ isMessaged }),
    }
  );
  if (!res.ok) {
    throw new Error(res.message || "Failed to update proposal");
  }
}

export async function updateProposalHiredStatus(params: {
  applicationId: string;
  isHired: boolean;
  requesterId: string;
}): Promise<void> {
  const { applicationId, isHired, requesterId } = params;
  if (!requesterId) throw new Error("You must be logged in to update hired status");

  const app = await getApplicationById(applicationId);
  if (!app) throw new Error("Proposal not found");
  if (app.clientId !== requesterId) {
    throw new Error("Only the job owner can update hired status");
  }

  const res = await apiFetchJson<unknown>(
    `/job-applications/${encodeURIComponent(applicationId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ isHired }),
    }
  );
  if (!res.ok) {
    throw new Error(res.message || "Failed to update proposal");
  }
}

export interface HireProviderInput {
  jobId: string;
  applicationId: string;
  providerId: string;
  requesterId: string;
  closeJob: boolean;
}

export async function hireProvider(input: HireProviderInput): Promise<void> {
  requireApi();
  const { jobId, applicationId, providerId, requesterId, closeJob } = input;

  const job = await getJobById(jobId);
  if (!job) throw new Error("Job not found");

  const ownerId = job.clientId;
  if (ownerId !== requesterId) {
    throw new Error("Only the job owner can hire a provider for this job");
  }

  const res = await apiFetchJson<unknown>(
    `/job-applications/${encodeURIComponent(applicationId)}/accept`,
    { method: "POST" }
  );
  if (!res.ok) {
    throw new Error(res.message || "Failed to accept proposal");
  }

  await updateJob(jobId, {
    contractorId: providerId,
    completionStatus: "in_progress",
    proposalAcceptance: closeJob ? "closed" : "open",
  }).catch(() => {});

  if (closeJob) {
    await rejectOtherProposalsForJob(jobId, applicationId);
  }
}

export async function rejectOtherProposalsForJob(
  jobId: string,
  keepApplicationId: string
): Promise<void> {
  try {
    const apps = await getApplicationsForJob(jobId);
    await Promise.all(
      apps
        .filter((a) => a.applicationId !== keepApplicationId)
        .map((a) =>
          apiFetchJson(`/job-applications/${encodeURIComponent(a.applicationId)}/reject`, {
            method: "POST",
          }).catch(() => {})
        )
    );
  } catch {
    // ignore
  }
}

export class JobCompletionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JobCompletionError";
  }
}

export interface CompleteJobInput {
  jobId: string;
  completionNotes?: string;
  requesterId?: string;
}

export async function completeJob(input: CompleteJobInput): Promise<void> {
  requireApi();
  const { jobId, completionNotes, requesterId } = input;

  const job = await getJobById(jobId);
  if (!job) throw new JobCompletionError("Job not found.");

  if (
    job.completionStatus === "completed" ||
    String(job.completionStatus).toLowerCase() === "completed"
  ) {
    throw new JobCompletionError("Job is already completed.");
  }

  const contractorId = job.contractorId ?? "";
  if (!contractorId) {
    throw new JobCompletionError(
      "Job must have a hired contractor before it can be completed."
    );
  }

  if (requesterId) {
    const clientId = job.clientId;
    const isAuthorized =
      requesterId === clientId || requesterId === contractorId;
    if (!isAuthorized) {
      throw new JobCompletionError(
        "Only the client or hired contractor can mark this job as completed."
      );
    }
  }

  const patch: Record<string, unknown> = {
    completionStatus: "completed",
    proposalAcceptance: "closed",
  };
  const trimmed = (completionNotes ?? "").trim();
  if (trimmed) patch.completionNotes = trimmed;

  const res = await apiFetchJson<unknown>(
    `/jobs/${encodeURIComponent(jobId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    }
  );
  if (!res.ok) {
    throw new JobCompletionError(res.message || "Failed to complete job");
  }
}
