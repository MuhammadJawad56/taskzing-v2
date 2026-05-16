import React from "react";
import Link from "next/link";
import { DollarSign, Clock, MessageSquare, CheckCircle } from "lucide-react";
import { ProposalWithDetails } from "@/lib/types/proposal";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

export interface ProposalCardProps {
  proposal: ProposalWithDetails;
  viewType?: "client" | "provider";
  onAction?: (proposalId: string, action: string) => void;
}

export const ProposalCard: React.FC<ProposalCardProps> = ({
  proposal,
  viewType = "client",
  onAction,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "default";
      case "shortlisted":
        return "info";
      case "completed":
        return "success";
      case "declined":
        return "danger";
      default:
        return "default";
    }
  };

  const user = viewType === "client" ? proposal.provider : undefined;
  const task = proposal.task;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {task && (
              <Link
                href={`/task/${task.jobId}`}
                className="text-lg font-semibold text-theme-primaryText dark:text-white hover:text-primary-500 mb-2 block"
              >
                {task.title}
              </Link>
            )}
            {user && (
              <div className="flex items-center space-x-3 mb-3">
                <Avatar src={user.photoUrl} name={user.fullName} size="md" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-theme-primaryText dark:text-white">
                      {user.fullName}
                    </span>
                    {user.isVerified && (
                      <CheckCircle className="h-4 w-4 text-primary-500" />
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-theme-accent4">
                    <span>⭐ {user.totalRating?.toFixed(1) || "0.0"}</span>
                    <span>•</span>
                    <span>{user.totalReviews || 0} reviews</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <Badge variant={getStatusColor(proposal.status)} size="md">
            {proposal.status}
          </Badge>
        </div>

        <p className="text-theme-primaryText dark:text-white mb-4 line-clamp-3">
          {proposal.proposalText}
        </p>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center text-theme-accent4 dark:text-gray-300">
              <DollarSign className="h-4 w-4 mr-1" />
              <span className="font-semibold text-theme-primaryText dark:text-white">
                ${proposal.bidAmount.toFixed(0)}
              </span>
            </div>
            {proposal.estimatedDuration && (
              <div className="flex items-center text-theme-accent4 dark:text-gray-300">
                <Clock className="h-4 w-4 mr-1" />
                <span>{proposal.estimatedDuration}</span>
              </div>
            )}
          </div>
        </div>

        {viewType === "client" && onAction && (
          <div className="flex items-center space-x-2 pt-4 border-t border-theme-accent2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onAction(proposal.applicationId, "accept")}
              disabled={proposal.status !== "submitted" && proposal.status !== "shortlisted"}
            >
              Accept
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction(proposal.applicationId, "message")}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Message
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAction(proposal.applicationId, "decline")}
              disabled={proposal.status === "declined"}
            >
              Decline
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

