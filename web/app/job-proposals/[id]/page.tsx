"use client";

import React from "react";
import { useParams } from "next/navigation";
import { ProposalCard } from "@/components/dashboard/ProposalCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { proposals } from "@/lib/mock-data/proposals";

export default function JobProposalsPage() {
  const params = useParams();
  const jobId = params.id as string;
  
  const jobProposals = proposals.filter(p => p.jobId === jobId);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-theme-primaryText mb-8">Job Proposals</h1>
        
        {jobProposals.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-theme-accent4">No proposals yet for this job.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobProposals.map((proposal) => (
              <ProposalCard key={proposal.applicationId} proposal={proposal} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

