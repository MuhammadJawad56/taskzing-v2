"use client";

import React, { useState, useEffect } from "react";
import { ProposalCard } from "@/components/dashboard/ProposalCard";
import { ProposalWithDetails } from "@/lib/types/proposal";

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<ProposalWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");

  useEffect(() => {
    // Fetch proposals
    fetch("/api/proposals")
      .then((res) => res.json())
      .then((data) => {
        setProposals(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const receivedProposals = proposals.filter((p) => p.status !== "withdrawn");
  const sentProposals = proposals.filter((p) => p.status === "submitted");

  const handleAction = (proposalId: string, action: string) => {
    // Handle proposal actions
    console.log(`Action: ${action} for proposal ${proposalId}`);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900">Proposals</h1>
        <p className="text-secondary-600 mt-2">Manage your proposals</p>
      </div>

      <div className="mb-6 border-b border-secondary-200">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab("received")}
            className={`pb-4 px-2 border-b-2 transition-colors ${
              activeTab === "received"
                ? "border-primary-600 text-primary-600 font-medium"
                : "border-transparent text-secondary-600 hover:text-secondary-900"
            }`}
          >
            Received ({receivedProposals.length})
          </button>
          <button
            onClick={() => setActiveTab("sent")}
            className={`pb-4 px-2 border-b-2 transition-colors ${
              activeTab === "sent"
                ? "border-primary-600 text-primary-600 font-medium"
                : "border-transparent text-secondary-600 hover:text-secondary-900"
            }`}
          >
            Sent ({sentProposals.length})
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-secondary-500">Loading proposals...</p>
          </div>
        ) : activeTab === "received" ? (
          receivedProposals.length > 0 ? (
            receivedProposals.map((proposal) => (
              <ProposalCard
                key={proposal.applicationId}
                proposal={proposal}
                viewType="client"
                onAction={handleAction}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-secondary-500">No proposals received yet</p>
            </div>
          )
        ) : sentProposals.length > 0 ? (
          sentProposals.map((proposal) => (
            <ProposalCard
              key={proposal.applicationId}
              proposal={proposal}
              viewType="provider"
            />
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-secondary-500">No proposals sent yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

