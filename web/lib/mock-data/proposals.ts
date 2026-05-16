import { Proposal } from "@/lib/types/proposal";

export const proposals: Proposal[] = [
  {
    applicationId: "prop-1",
    jobId: "task-1",
    providerId: "user-2",
    clientId: "user-5",
    proposalText: "I have extensive experience in web design and e-commerce. I've completed over 50 similar projects. I can deliver a modern, responsive design within 2 weeks.",
    bidAmount: 2200,
    estimatedDuration: "2 weeks",
    status: "submitted",
    isMessaged: false,
    isHired: false,
    createdAt: "2024-01-20T11:00:00Z",
    updatedAt: "2024-01-20T11:00:00Z",
  },
  {
    applicationId: "prop-2",
    jobId: "task-1",
    providerId: "user-1",
    clientId: "user-5",
    proposalText: "Full-stack developer here. I can handle both design and development, including e-commerce integration. Let's discuss your requirements.",
    bidAmount: 2500,
    estimatedDuration: "3 weeks",
    status: "shortlisted",
    isMessaged: true,
    isHired: false,
    createdAt: "2024-01-20T12:00:00Z",
    updatedAt: "2024-01-21T10:00:00Z",
  },
  {
    applicationId: "prop-3",
    jobId: "task-2",
    providerId: "user-4",
    clientId: "user-5",
    proposalText: "Professional cleaner with 5+ years experience. I use eco-friendly products and can complete the job by Friday. Available immediately.",
    bidAmount: 180,
    estimatedDuration: "4 hours",
    status: "submitted",
    isMessaged: false,
    isHired: false,
    createdAt: "2024-01-21T09:00:00Z",
    updatedAt: "2024-01-21T09:00:00Z",
  },
  {
    applicationId: "prop-4",
    jobId: "task-3",
    providerId: "user-3",
    clientId: "user-5",
    proposalText: "Licensed plumber available today. I can fix the leaky faucet within 1 hour. 15 years of experience.",
    bidAmount: 150,
    estimatedDuration: "1 hour",
    status: "submitted",
    isMessaged: false,
    isHired: true,
    createdAt: "2024-01-22T15:00:00Z",
    updatedAt: "2024-01-22T16:00:00Z",
  },
  {
    applicationId: "prop-5",
    jobId: "task-4",
    providerId: "user-2",
    clientId: "user-5",
    proposalText: "Creative designer specializing in brand identity. I'll create a unique logo and complete brand package that reflects your startup's vision.",
    bidAmount: 750,
    estimatedDuration: "1 week",
    status: "submitted",
    isMessaged: false,
    isHired: false,
    createdAt: "2024-01-19T13:00:00Z",
    updatedAt: "2024-01-19T13:00:00Z",
  },
  {
    applicationId: "prop-6",
    jobId: "task-5",
    providerId: "user-6",
    clientId: "user-5",
    proposalText: "Certified personal trainer with specialization in strength training and weight loss. I'll create a customized program for you.",
    bidAmount: 560,
    estimatedDuration: "8 sessions",
    status: "submitted",
    isMessaged: false,
    isHired: false,
    createdAt: "2024-01-18T17:00:00Z",
    updatedAt: "2024-01-18T17:00:00Z",
  },
];

export function getProposalById(id: string): Proposal | undefined {
  return proposals.find((prop) => prop.applicationId === id);
}

export function getProposalsByJobId(jobId: string): Proposal[] {
  return proposals.filter((prop) => prop.jobId === jobId);
}

export function getProposalsByProviderId(providerId: string): Proposal[] {
  return proposals.filter((prop) => prop.providerId === providerId);
}

export function getProposalsByClientId(clientId: string): Proposal[] {
  return proposals.filter((prop) => prop.clientId === clientId);
}

