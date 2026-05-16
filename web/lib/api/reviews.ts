/**
 * Reviews stored locally in the browser until a reviews API exists.
 * Eligibility rules use live job data from the TaskZing API.
 */

import { getJobById } from "./jobs";
import { getUserById } from "./users";

const STORAGE_KEY = "taskzing_local_reviews_v1";

export type JobReviewType = "client_to_provider" | "provider_to_client";

export type CanReviewResult = {
  canReview: boolean;
  reason: string;
  message: string;
};

export type ReviewListItem = {
  id: string;
  rating: number;
  reviewText: string;
  createdAt: unknown;
  reviewerName: string;
  reviewerPhoto: string;
  reviewerId: string;
};

export type UserReviewStats = {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  reviews: ReviewListItem[];
};

type StoredReview = {
  id: string;
  jobId: string;
  reviewerId: string;
  targetUserId: string;
  rating: number;
  reviewText: string;
  reviewType: JobReviewType;
  createdAt: string;
};

function readStore(): StoredReview[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? (arr as StoredReview[]) : [];
  } catch {
    return [];
  }
}

function writeStore(rows: StoredReview[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // ignore
  }
}

function isJobCompleted(data: Record<string, unknown>): boolean {
  const raw = String(
    data.completionStatus ?? data.status ?? data.jobStatus ?? data.state ?? ""
  )
    .toLowerCase()
    .replace(/-/g, "_");
  return raw === "completed" || raw === "complete";
}

function clientIdFromJob(data: Record<string, unknown>): string {
  return String(data.clientId ?? data.userId ?? data.client_id ?? data.user_id ?? "");
}

function contractorIdFromJob(data: Record<string, unknown>): string {
  return String(
    data.contractorId ?? data.providerId ?? data.contractor_id ?? data.provider_id ?? ""
  );
}

export async function hasUserReviewed(params: {
  jobId: string;
  reviewerId: string;
  reviewType: JobReviewType;
}): Promise<boolean> {
  return readStore().some(
    (r) =>
      r.jobId === params.jobId &&
      r.reviewerId === params.reviewerId &&
      r.reviewType === params.reviewType
  );
}

export async function canUserReview(params: {
  jobId: string;
  reviewerId: string;
  targetUserId: string;
  reviewType: JobReviewType;
}): Promise<CanReviewResult> {
  const { jobId, reviewerId, targetUserId, reviewType } = params;

  try {
    const already = await hasUserReviewed({ jobId, reviewerId, reviewType });
    if (already) {
      return {
        canReview: false,
        reason: "already_reviewed",
        message:
          "You can only review someone once per job, but you can review them for other jobs.",
      };
    }

    if (reviewerId === targetUserId) {
      return {
        canReview: false,
        reason: "self_review",
        message: "You cannot review yourself.",
      };
    }

    const job = await getJobById(jobId);
    if (!job) {
      return {
        canReview: false,
        reason: "job_not_found",
        message: "The job you are trying to review no longer exists.",
      };
    }

    const jobData = job as unknown as Record<string, unknown>;
    if (!isJobCompleted(jobData)) {
      return {
        canReview: false,
        reason: "job_not_completed",
        message: "You can only review after the job is completed.",
      };
    }

    const clientId = clientIdFromJob(jobData);
    const contractorId = contractorIdFromJob(jobData);

    let involved = false;
    if (reviewType === "client_to_provider" && reviewerId === clientId) {
      involved = true;
    } else if (reviewType === "provider_to_client" && reviewerId === contractorId) {
      involved = true;
    }

    if (!involved) {
      return {
        canReview: false,
        reason: "not_involved",
        message: "You can only review people you worked with on this job.",
      };
    }

    return {
      canReview: true,
      reason: "ok",
      message: "You can submit a review for this job.",
    };
  } catch {
    return {
      canReview: false,
      reason: "error",
      message: "There was an error checking if you can review. Please try again.",
    };
  }
}

export async function submitReview(params: {
  jobId: string;
  reviewerId: string;
  targetUserId: string;
  rating: number;
  reviewText: string;
  reviewType: JobReviewType;
}): Promise<void> {
  const check = await canUserReview({
    jobId: params.jobId,
    reviewerId: params.reviewerId,
    targetUserId: params.targetUserId,
    reviewType: params.reviewType,
  });
  if (!check.canReview) {
    throw new Error(check.message);
  }

  const row: StoredReview = {
    id: `rev-${Date.now()}`,
    jobId: params.jobId,
    reviewerId: params.reviewerId,
    targetUserId: params.targetUserId,
    rating: params.rating,
    reviewText: params.reviewText.trim(),
    reviewType: params.reviewType,
    createdAt: new Date().toISOString(),
  };
  const all = readStore();
  all.push(row);
  writeStore(all);
}

export async function resolveReviewTargetFromJob(params: {
  jobId: string;
  reviewerId: string;
  reviewerRole: string;
}): Promise<{ targetUserId: string; reviewType: JobReviewType } | null> {
  const job = await getJobById(params.jobId);
  if (!job) return null;
  const data = job as unknown as Record<string, unknown>;
  const clientId = clientIdFromJob(data);
  const contractorId = contractorIdFromJob(data);
  const role = params.reviewerRole.toLowerCase();

  if (role === "client") {
    if (!contractorId) return null;
    return { targetUserId: contractorId, reviewType: "client_to_provider" };
  }
  if (!clientId) return null;
  return { targetUserId: clientId, reviewType: "provider_to_client" };
}

function timestampToMs(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}

export async function getUserReviewStats(userId: string): Promise<UserReviewStats> {
  const empty: UserReviewStats = {
    averageRating: 0,
    totalReviews: 0,
    ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    reviews: [],
  };

  try {
    const snap = readStore().filter((r) => r.targetUserId === userId);
    if (snap.length === 0) return empty;

    let totalRating = 0;
    const ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    const reviews: ReviewListItem[] = [];

    for (const data of snap) {
      const rating = typeof data.rating === "number" ? data.rating : Number(data.rating) || 0;
      totalRating += rating;
      const rounded = Math.min(5, Math.max(1, Math.round(rating))) as 1 | 2 | 3 | 4 | 5;
      ratingBreakdown[rounded] = (ratingBreakdown[rounded] ?? 0) + 1;

      const reviewerId = String(data.reviewerId ?? "");
      let reviewerName = "Anonymous";
      let reviewerPhoto = "";
      if (reviewerId) {
        const u = await getUserById(reviewerId);
        if (u) {
          reviewerName =
            u.fullName || u.username || u.email.split("@")[0] || "Anonymous";
          reviewerPhoto = u.photoUrl || "";
        }
      }

      reviews.push({
        id: data.id,
        rating,
        reviewText: String(data.reviewText ?? ""),
        createdAt: data.createdAt,
        reviewerName,
        reviewerPhoto,
        reviewerId,
      });
    }

    const totalReviews = snap.length;
    const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

    reviews.sort((a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt));

    return {
      averageRating,
      totalReviews,
      ratingBreakdown,
      reviews,
    };
  } catch (e) {
    console.error("getUserReviewStats", e);
    return empty;
  }
}

export function formatReviewDate(value: unknown): string {
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d.toLocaleDateString() : "";
  }
  return "";
}
