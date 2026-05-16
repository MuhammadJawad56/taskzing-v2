import type { Task } from "@/lib/types/task";

/** Mirrors Flutter `AllJobsFilterModel` (see all_jobs_filter_model.dart). */
export type AllJobsAdvancedFilter = {
  proposalAcceptance: string | null;
  jobType: string | null;
  urgency: string | null;
  completionStatus: string | null;
};

export function emptyAllJobsAdvancedFilter(): AllJobsAdvancedFilter {
  return {
    proposalAcceptance: null,
    jobType: null,
    urgency: null,
    completionStatus: null,
  };
}

export function hasActiveAllJobsAdvancedFilter(f: AllJobsAdvancedFilter): boolean {
  return (
    (f.proposalAcceptance != null && f.proposalAcceptance !== "all") ||
    (f.jobType != null && f.jobType !== "all") ||
    (f.urgency != null && f.urgency !== "all") ||
    (f.completionStatus != null && f.completionStatus !== "all")
  );
}

export function applyAllJobsAdvancedFilters(
  jobs: Task[],
  f: AllJobsAdvancedFilter
): Task[] {
  let filtered = [...jobs];

  if (f.proposalAcceptance != null && f.proposalAcceptance !== "all") {
    const want = f.proposalAcceptance.toLowerCase();
    filtered = filtered.filter((job) => {
      const acceptance = (job.proposalAcceptance ?? "open").toString().toLowerCase();
      return acceptance === want;
    });
  }

  if (f.jobType != null && f.jobType !== "all") {
    const want = f.jobType.toLowerCase();
    filtered = filtered.filter((job) => {
      const type = (job.jobType ?? "fixed").toString().toLowerCase();
      return type === want;
    });
  }

  if (f.urgency != null && f.urgency !== "all") {
    const want = f.urgency.toLowerCase();
    filtered = filtered.filter((job) => {
      const u = (job.urgency ?? "normal").toString().toLowerCase();
      return u === want;
    });
  }

  if (f.completionStatus != null && f.completionStatus !== "all") {
    const want = f.completionStatus.toLowerCase();
    filtered = filtered.filter((job) => {
      const status = (job.completionStatus ?? "open").toString().toLowerCase();
      return status === want;
    });
  }

  return filtered;
}

function capitalizeFirst(text: string): string {
  if (!text) return text;
  return text[0].toUpperCase() + text.slice(1);
}

export function allJobsAdvancedFilterSummary(f: AllJobsAdvancedFilter): string {
  const parts: string[] = [];

  if (f.proposalAcceptance != null && f.proposalAcceptance !== "all") {
    parts.push(`Proposals: ${capitalizeFirst(f.proposalAcceptance)}`);
  }
  if (f.jobType != null && f.jobType !== "all") {
    const typeLabel = f.jobType === "fixed" ? "Fixed Price" : "Hourly";
    parts.push(`Type: ${typeLabel}`);
  }
  if (f.urgency != null && f.urgency !== "all") {
    parts.push(`Urgency: ${capitalizeFirst(f.urgency)}`);
  }
  if (f.completionStatus != null && f.completionStatus !== "all") {
    const statusLabel =
      f.completionStatus === "in_progress" ? "In Progress" : capitalizeFirst(f.completionStatus);
    parts.push(`Status: ${statusLabel}`);
  }

  return parts.join(" • ");
}
