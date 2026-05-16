/**
 * Task/Job types
 * Based on the jobs table schema
 */

export type JobType = "fixed" | "hourly";
export type CompletionStatus =
  | "draft"
  | "open"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "archived";
export type ProposalAcceptance = "open" | "closed";
export type PosterType = "individual" | "company" | "instore";
export type Urgency = "low" | "normal" | "high" | "urgent";

export interface Task {
  jobId: string;
  jobType: JobType;
  title: string;
  description: string;
  category: string;
  subCategory?: string;
  itemType?: string;
  fixedPrice?: number;
  estimatedDuration?: number; // in hours
  hourlyRate?: number;
  timeFlexibility?: string;
  jobStartTime?: string; // HH:mm format
  jobEndTime?: string; // HH:mm format
  price: number;
  lat: number;
  lng: number;
  address: string;
  additionalLocationNotes?: string;
  jobDate?: string;
  storePickup?: boolean;
  storeName?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  completionStatus: CompletionStatus;
  proposalAcceptance: ProposalAcceptance;
  clientId: string;
  contractorId?: string;
  acceptedAt?: string;
  completedAt?: string;
  maxHoursAllowed?: string;
  urgency: Urgency;
  isVerified: boolean;
  posterType: PosterType;
  posterName?: string;
  photos?: string[];
  attachments?: string[];
  skills?: string[];
  tags?: string[];
  likesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWithDetails extends Task {
  client?: {
    id: string;
    fullName: string;
    photoUrl?: string;
    isVerified: boolean;
    totalRating: number;
  };
  contractor?: {
    id: string;
    fullName: string;
    photoUrl?: string;
  };
  proposalCount?: number;
  viewCount?: number;
}

