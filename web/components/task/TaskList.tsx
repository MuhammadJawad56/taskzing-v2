import React from "react";
import { Task } from "@/lib/types/task";
import { TaskCard } from "./TaskCard";
import { Skeleton } from "@/components/ui/Loading";

export interface TaskListProps {
  tasks: Task[];
  isLoading?: boolean;
  showClient?: boolean;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, isLoading, showClient }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-48 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-theme-accent4 text-lg">No tasks found</p>
        <p className="text-theme-accent4 text-sm mt-2">
          Try adjusting your filters or check back later
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tasks.map((task) => (
        <TaskCard key={task.jobId} task={task} showClient={showClient} />
      ))}
    </div>
  );
};

