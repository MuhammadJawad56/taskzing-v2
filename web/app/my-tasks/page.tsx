"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/api/AuthContext";
import { Task } from "@/lib/types/task";
import { cn } from "@/lib/utils/cn";
import { RefreshCw, ClipboardList, MapPin, Calendar, Clock } from "lucide-react";
import Link from "next/link";
import { getJobsByContractorId } from "@/lib/api/jobs";
import { MarkTaskCompleteButton } from "@/components/task/MarkTaskCompleteButton";

type TabType = "all" | "completed" | "in_progress";

export default function MyTasksPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadTasks();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const loadTasks = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const userTasks = await getJobsByContractorId(user.uid);
      setTasks(userTasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadTasks();
    setIsRefreshing(false);
  };

  // Filter tasks by status
  const allTasks = tasks;
  const completedTasks = tasks.filter((t) => t.completionStatus === "completed");
  const inProgressTasks = tasks.filter((t) => t.completionStatus === "in_progress");

  const getTasksForTab = () => {
    switch (activeTab) {
      case "all":
        return allTasks;
      case "completed":
        return completedTasks;
      case "in_progress":
        return inProgressTasks;
      default:
        return [];
    }
  };

  const tabs = [
    { id: "all" as TabType, label: "All Tasks", count: allTasks.length },
    { id: "completed" as TabType, label: "Completed", count: completedTasks.length },
    { id: "in_progress" as TabType, label: "In Progress", count: inProgressTasks.length },
  ];

  const formatPrice = (task: Task) => {
    if (task.jobType === "fixed") {
      return `$${task.fixedPrice || task.price}`;
    }
    return `$${task.hourlyRate || task.price}/hr`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkBlue-013 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Tasks</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Manage your tasks from here
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex-1 sm:flex-none">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-red-500 text-white"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                {tab.label} {tab.count}
              </button>
            ))}
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ml-auto"
          >
            <RefreshCw
              className={cn(
                "h-5 w-5 text-gray-500",
                isRefreshing && "animate-spin"
              )}
            />
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          </div>
        ) : getTasksForTab().length === 0 ? (
          /* Empty State */
          <div className="bg-white dark:bg-darkBlue-003 rounded-lg border border-gray-200 dark:border-gray-700 p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <ClipboardList className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-400 dark:text-gray-500 mb-2">
                No tasks yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-1">
                No tasks available yet.
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm">
                Tasks will appear here when they are assigned to you.
              </p>
            </div>
          </div>
        ) : (
          /* Task List */
          <div className="space-y-4">
            {getTasksForTab().map((task) => (
              <Link
                key={task.jobId}
                href={`/job-details/${task.jobId}`}
                className="block bg-white dark:bg-darkBlue-003 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* Task Image */}
                  <div className="w-20 h-20 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden">
                    {task.photos && task.photos.length > 0 ? (
                      <img
                        src={task.photos[0]}
                        alt={task.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-red-500 font-bold text-sm">Task</span>
                      </div>
                    )}
                  </div>

                  {/* Task Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                        {task.title}
                      </h3>
                      <span
                        className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium flex-shrink-0",
                          task.completionStatus === "completed"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : task.completionStatus === "in_progress"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        )}
                      >
                        {task.completionStatus === "in_progress"
                          ? "In Progress"
                          : task.completionStatus.charAt(0).toUpperCase() +
                            task.completionStatus.slice(1)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{task.address}</span>
                    </div>

                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDate(task.createdAt)}</span>
                      </div>
                      {task.estimatedDuration && (
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{task.estimatedDuration} hrs</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-red-500 font-semibold text-sm">
                        {formatPrice(task)}
                      </p>
                      {task.completionStatus === "in_progress" ? (
                        <MarkTaskCompleteButton task={task} onCompleted={loadTasks} />
                      ) : null}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
