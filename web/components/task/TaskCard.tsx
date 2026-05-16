import React from "react";
import Link from "next/link";
import { MapPin, Clock, DollarSign, User } from "lucide-react";
import { Task } from "@/lib/types/task";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";

export interface TaskCardProps {
  task: Task;
  showClient?: boolean;
  /** Reserve top-right space for an overlay dismiss control (e.g. recently viewed remove). */
  reserveCloseSpace?: boolean;
  className?: string;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  showClient = false,
  reserveCloseSpace = false,
  className,
}) => {
  const formatPrice = (price: number, jobType: string) => {
    if (jobType === "hourly") {
      return `$${price}/hr`;
    }
    return `$${price.toFixed(0)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "success";
      case "in_progress":
        return "info";
      case "completed":
        return "default";
      default:
        return "default";
    }
  };

  return (
    <Link href={`/job-details/${task.jobId}`}>
      <Card className={cn("hover:shadow-lg transition-shadow cursor-pointer h-full", className)}>
        <CardContent className="p-6">
          <div className="mb-3">
            <h3
              className={cn(
                "mb-2 line-clamp-2 text-lg font-semibold text-theme-primaryText dark:text-white",
                reserveCloseSpace && "pr-11",
              )}
            >
              {task.title}
            </h3>
            <Badge variant={getStatusColor(task.completionStatus)} size="sm" className="mb-2 w-fit">
              {task.completionStatus.replace("_", " ")}
            </Badge>
            <p className="line-clamp-2 text-sm text-theme-accent4 dark:text-white/75">
              {task.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {task.skills?.slice(0, 3).map((skill) => (
              <Badge key={skill} variant="default" size="sm">
                {skill}
              </Badge>
            ))}
            {task.skills && task.skills.length > 3 && (
              <Badge variant="default" size="sm">
                +{task.skills.length - 3}
              </Badge>
            )}
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-theme-accent4 dark:text-white/70">
              <DollarSign className="h-4 w-4 mr-2" />
              <span className="font-semibold text-theme-primaryText dark:text-white">
                {formatPrice(task.price, task.jobType)}
              </span>
              {task.jobType === "hourly" && task.estimatedDuration && (
                <span className="ml-2">• {task.estimatedDuration} hours</span>
              )}
            </div>

            <div className="flex items-center text-sm text-theme-accent4 dark:text-white/70">
              <MapPin className="h-4 w-4 mr-2" />
              <span className="line-clamp-1">{task.address}</span>
            </div>

            {showClient && (
              <div className="flex items-center text-sm text-theme-accent4 dark:text-white/70">
                <User className="h-4 w-4 mr-2" />
                <span>{task.posterName || "Client"}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-theme-accent2 pt-3">
            <div className="flex items-center text-xs text-theme-accent4 dark:text-white/65">
              <Clock className="h-3 w-3 mr-1" />
              <span>
                {new Date(task.createdAt).toLocaleDateString()}
              </span>
            </div>
            {task.isVerified && (
              <Badge variant="info" size="sm">
                Verified
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

