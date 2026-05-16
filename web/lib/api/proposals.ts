/**
 * Proposal reads + enrichment for the web UI.
 *
 * Real data lives in Firestore `jobApplications/{id}` (see `lib/api/jobApplications.ts`).
 * This file wraps those reads in the legacy `Proposal` / `ProposalWithDetails`
 * shape expected by `/all-jobs/[jobId]/proposals`, `/my-proposals`, etc.
 *
 * Mocks and `localStorage` fallbacks remain so provider-facing pages keep
 * rendering during migration even if Firestore is unreachable.
 */
import { proposals as mockProposals } from "@/lib/mock-data/proposals";
import type {
  Proposal,
  ProposalStatus,
  ProposalWithDetails,
} from "@/lib/types/proposal";
import { getJobById } from "./jobs";
import { getUserById } from "./users";
import {
  getApplicationsByProvider,
  getApplicationsForJob,
  getProposalCountsForJob,
  type JobApplication,
  type JobApplicationStatus,
} from "./jobApplications";
import { isBackendConfigured } from "@/lib/backendConfig";

const LOCAL_PROPOSALS_STORAGE_KEY = "taskzing_local_proposals";

/* ---------------------------------------------------------------------------
 * Shape conversion (Firestore ↔ legacy Proposal)
 * ------------------------------------------------------------------------ */

/** Collapse extended Firestore status set into UI-visible `ProposalStatus`. */
function statusToLegacy(status: JobApplicationStatus): ProposalStatus {
  switch (status) {
    case "submitted":
    case "shortlisted":
    case "archived":
    case "declined":
    case "withdrawn":
    case "expired":
    case "completed":
      return status;
    case "accepted":
      // UI doesn't have an "accepted" state on the proposal itself; it shows
      // "HIRED" via isHired. Map accepted → shortlisted so filters still work.
      return "shortlisted";
    case "rejected":
      return "declined";
    default:
      return "submitted";
  }
}

function jobApplicationToProposal(app: JobApplication): Proposal {
  return {
    applicationId: app.applicationId,
    jobId: app.jobId,
    providerId: app.providerId,
    clientId: app.clientId,
    proposalText: app.proposalText,
    bidAmount: app.bidAmount,
    estimatedDuration: app.estimatedDuration,
    status: statusToLegacy(app.status),
    isMessaged: app.isMessaged,
    isHired: app.isHired,
    attachments: app.attachments,
    links: app.links,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  };
}

/* ---------------------------------------------------------------------------
 * Local + mock fallbacks (kept so the explore flow still renders without FB)
 * ------------------------------------------------------------------------ */

function readLocalProposals(): Proposal[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(LOCAL_PROPOSALS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Proposal[]) : [];
  } catch {
    return [];
  }
}

function getFallbackProposals(): Proposal[] {
  return [...readLocalProposals(), ...mockProposals];
}

function getFallbackTestUserProposal(providerId: string): Proposal[] {
  if (providerId !== "test-user") return [];

  const now = new Date().toISOString();
  return [
    {
      applicationId: "local-proposal-test-user",
      jobId: "task-1",
      providerId,
      clientId: "user-5",
      proposalText:
        "Temporary local proposal so provider pages remain testable during migration.",
      bidAmount: 1200,
      estimatedDuration: "1 week",
      status: "submitted",
      isMessaged: false,
      isHired: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

async function enrichProposal(proposal: Proposal): Promise<ProposalWithDetails> {
  const [provider, task] = await Promise.all([
    proposal.providerId ? getUserById(proposal.providerId) : Promise.resolve(null),
    proposal.jobId ? getJobById(proposal.jobId) : Promise.resolve(null),
  ]);

  return {
    ...proposal,
    provider: provider
      ? {
          id: provider.uid,
          fullName:
            provider.fullName || provider.username || provider.email.split("@")[0],
          photoUrl: provider.photoUrl,
          totalRating: provider.totalRating,
          totalReviews: provider.totalReviews,
          isVerified: provider.isVerified,
        }
      : undefined,
    task: task
      ? {
          jobId: task.jobId,
          title: task.title,
          price: task.price || task.fixedPrice || 0,
          jobType: task.jobType,
        }
      : undefined,
  };
}

/* ---------------------------------------------------------------------------
 * Public API
 * ------------------------------------------------------------------------ */

export async function getProposalsByJobId(
  jobId: string
): Promise<ProposalWithDetails[]> {
  let proposals: Proposal[] = [];
  if (isBackendConfigured()) {
    try {
      const apps = await getApplicationsForJob(jobId);
      proposals = apps.map(jobApplicationToProposal);
    } catch (err) {
      console.warn("getApplicationsForJob failed, falling back to mocks", err);
    }
  }

  if (proposals.length === 0) {
    proposals = getFallbackProposals()
      .filter((proposal) => proposal.jobId === jobId);
  }

  proposals = [...proposals].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return Promise.all(proposals.map(enrichProposal));
}

export async function getProposalCounts(
  jobId: string
): Promise<{ total: number; hired: number }> {
  if (isBackendConfigured()) {
    try {
      return await getProposalCountsForJob(jobId);
    } catch (err) {
      console.warn("getProposalCountsForJob failed", err);
    }
  }
  const proposals = await getProposalsByJobId(jobId);
  return {
    total: proposals.length,
    hired: proposals.filter((proposal) => proposal.isHired).length,
  };
}

export async function getProposalsByProviderId(
  providerId: string
): Promise<ProposalWithDetails[]> {
  let proposals: Proposal[] = [];
  if (isBackendConfigured()) {
    try {
      const apps = await getApplicationsByProvider(providerId);
      proposals = apps.map(jobApplicationToProposal);
    } catch (err) {
      console.warn("getApplicationsByProvider failed, falling back to mocks", err);
    }
  }

  if (proposals.length === 0) {
    proposals = [
      ...getFallbackTestUserProposal(providerId),
      ...getFallbackProposals(),
    ].filter((proposal) => proposal.providerId === providerId);
  }

  proposals = [...proposals].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return Promise.all(proposals.map(enrichProposal));
}
