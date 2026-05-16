import { NextResponse } from "next/server";
import {
  proposals,
  getProposalsByJobId,
  getProposalsByProviderId,
  getProposalsByClientId,
} from "@/lib/mock-data/proposals";
import { getUserById } from "@/lib/mock-data/users";
import { getTaskById } from "@/lib/mock-data/tasks";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");
  const providerId = searchParams.get("providerId");
  const clientId = searchParams.get("clientId");

  let filteredProposals = proposals;

  if (jobId) {
    filteredProposals = getProposalsByJobId(jobId);
  } else if (providerId) {
    filteredProposals = getProposalsByProviderId(providerId);
  } else if (clientId) {
    filteredProposals = getProposalsByClientId(clientId);
  }

  // Enrich with provider and task data
  const enrichedProposals = filteredProposals.map((proposal) => {
    const provider = getUserById(proposal.providerId);
    const task = getTaskById(proposal.jobId);

    return {
      ...proposal,
      provider: provider ? {
        id: provider.id,
        fullName: provider.fullName || "Unknown",
        photoUrl: provider.photoUrl,
        totalRating: provider.totalRating,
        totalReviews: provider.totalReviews,
        isVerified: provider.isVerified,
      } : undefined,
      task: task ? {
        jobId: task.jobId,
        title: task.title,
        price: task.price,
        jobType: task.jobType,
      } : undefined,
    };
  });

  return NextResponse.json(enrichedProposals);
}

