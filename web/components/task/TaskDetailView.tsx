"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { MapPin, Clock, DollarSign, Calendar, CheckCircle } from "lucide-react";
import { TaskWithDetails } from "@/lib/types/task";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/lib/api/AuthContext";

export interface TaskDetailViewProps {
  task: TaskWithDetails;
  onApply?: () => void;
  showApplyButton?: boolean;
}

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({
  task,
  onApply,
  showApplyButton = true,
}) => {
  const router = useRouter();
  const { user } = useAuth();

  const handleApply = () => {
    if (onApply) {
      onApply();
      return;
    }
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/job-details/${task.jobId}`)}`);
      return;
    }
    router.push(`/job-details/${task.jobId}`);
  };
  const formatPrice = (price: number, jobType: string) => {
    if (jobType === "hourly") {
      return `$${price}/hr`;
    }
    return `$${price.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-theme-primaryText mb-2">{task.title}</h1>
            <div className="flex items-center space-x-4 text-sm text-theme-accent4">
              <span className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {task.address}
              </span>
              <span className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Posted {new Date(task.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          {task.isVerified && (
            <Badge variant="info" size="lg">
              <CheckCircle className="h-4 w-4 mr-1" />
              Verified
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="default" size="md">
            {task.category}
          </Badge>
          {task.subCategory && (
            <Badge variant="default" size="md">
              {task.subCategory}
            </Badge>
          )}
          <Badge variant={task.urgency === "urgent" ? "danger" : "default"} size="md">
            {task.urgency}
          </Badge>
        </div>
      </div>

      {/* Price and Details */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center text-theme-accent4 mb-1">
                <DollarSign className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">Budget</span>
              </div>
              <p className="text-2xl font-bold text-theme-primaryText">
                {formatPrice(task.price, task.jobType)}
              </p>
              {task.jobType === "hourly" && task.estimatedDuration && (
                <p className="text-sm text-theme-accent4 mt-1">
                  Estimated {task.estimatedDuration} hours
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center text-theme-accent4 mb-1">
                <Clock className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">Job Type</span>
              </div>
              <p className="text-lg font-semibold text-theme-primaryText capitalize">
                {task.jobType}
              </p>
            </div>

            <div>
              <div className="flex items-center text-theme-accent4 mb-1">
                <Calendar className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">Status</span>
              </div>
              <Badge variant="success" size="md" className="mt-1">
                {task.completionStatus.replace("_", " ")}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-theme-primaryText whitespace-pre-wrap">{task.description}</p>
        </CardContent>
      </Card>

      {/* Skills */}
      {task.skills && task.skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Required Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {task.skills.map((skill) => (
                <Badge key={skill} variant="default" size="md">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Info */}
      {task.client && (
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Avatar
                src={task.client.photoUrl}
                name={task.client.fullName}
                size="lg"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-theme-primaryText">
                    {task.client.fullName}
                  </h3>
                  {task.client.isVerified && (
                    <CheckCircle className="h-5 w-5 text-primary-500" />
                  )}
                </div>
                {task.client.totalRating && task.client.totalRating > 0 && (
                  <p className="text-sm text-theme-accent4">
                    ⭐ {task.client.totalRating.toFixed(1)} ({task.client.totalRating} reviews)
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Apply Button */}
      {showApplyButton && task.completionStatus === "open" && task.proposalAcceptance === "open" && (
        <div className="sticky bottom-0 bg-theme-primaryBackground border-t border-theme-accent2 p-4 -mx-6 -mb-6">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleApply}
          >
            Submit Proposal
          </Button>
        </div>
      )}
    </div>
  );
};

