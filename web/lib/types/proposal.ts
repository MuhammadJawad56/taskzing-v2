/**
 * Proposal/Job Application types
 * Based on the job_applications table schema
 */

export type ProposalStatus =
  | "submitted"
  | "shortlisted"
  | "archived"
  | "declined"
  | "withdrawn"
  | "expired"
  | "completed";

export interface Proposal {
  applicationId: string;
  jobId: string;
  providerId: string;
  clientId: string;
  proposalText: string;
  bidAmount: number;
  estimatedDuration?: string;
  status: ProposalStatus;
  isMessaged: boolean;
  isHired: boolean;
  attachments?: string[];
  links?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProposalWithDetails extends Proposal {
  provider?: {
    id: string;
    fullName: string;
    photoUrl?: string;
    totalRating: number;
    totalReviews: number;
    isVerified: boolean;
  };
  task?: {
    jobId: string;
    title: string;
    price: number;
    jobType: "fixed" | "hourly";
  };
}

