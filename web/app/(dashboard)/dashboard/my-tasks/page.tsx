"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/api/AuthContext";
import { Task } from "@/lib/types/task";
import { cn } from "@/lib/utils/cn";
import { RefreshCw, ClipboardList, MapPin, Calendar, Clock, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Grid3x3, X, TrendingUp, DollarSign, CheckCircle2 } from "lucide-react";
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isMonthSummaryOpen, setIsMonthSummaryOpen] = useState(false);

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

  // Calendar functions
  const getMonthName = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  const isToday = (date: number) => {
    const today = new Date();
    return (
      date === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: number) => {
    return (
      date === selectedDate.getDate() &&
      currentDate.getMonth() === selectedDate.getMonth() &&
      currentDate.getFullYear() === selectedDate.getFullYear()
    );
  };

  const getTasksForDate = (date: number) => {
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), date);
    return tasks.filter((task) => {
      const taskDate = new Date(task.createdAt);
      return (
        taskDate.getDate() === checkDate.getDate() &&
        taskDate.getMonth() === checkDate.getMonth() &&
        taskDate.getFullYear() === checkDate.getFullYear()
      );
    });
  };

  // Generate calendar days
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Get upcoming events (tasks in the next 7 days)
  const getUpcomingEvents = () => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    return tasks.filter((task) => {
      const taskDate = new Date(task.createdAt);
      return taskDate >= today && taskDate <= nextWeek;
    }).slice(0, 5);
  };

  // Month Summary functions
  const getMonthSummary = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

    const monthTasks = tasks.filter((task) => {
      const taskDate = new Date(task.createdAt);
      return taskDate >= startOfMonth && taskDate <= endOfMonth;
    });

    const completedTasks = monthTasks.filter((t) => t.completionStatus === "completed");
    const inProgressTasks = monthTasks.filter((t) => t.completionStatus === "in_progress");
    const totalEarnings = completedTasks.reduce((sum, task) => {
      const price = task.fixedPrice || task.hourlyRate || task.price || 0;
      return sum + price;
    }, 0);

    const totalHours = monthTasks.reduce((sum, task) => {
      return sum + (task.estimatedDuration || 0);
    }, 0);

    return {
      totalTasks: monthTasks.length,
      completedTasks: completedTasks.length,
      inProgressTasks: inProgressTasks.length,
      totalEarnings,
      totalHours,
      tasks: monthTasks,
    };
  };

  return (
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
        <div className="flex flex-1 rounded-lg bg-gray-100 p-1 dark:bg-darkBlue-203 sm:flex-none">
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
          className="ml-auto rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-darkBlue-203"
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
        /* Empty state — merged with page in dark mode */
        <div className="rounded-xl border border-gray-200 bg-white p-12 dark:border-gray-600/35 dark:bg-transparent">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-darkBlue-203">
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
                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200 dark:bg-darkBlue-203">
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
                          : "bg-gray-100 text-gray-700 dark:bg-darkBlue-203 dark:text-gray-400"
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

      {/* Schedule Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Schedule</h2>
        
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-600/35">
          <div className="flex flex-col gap-px bg-gray-200 dark:bg-white/10 lg:flex-row">
          {/* Calendar */}
          <div className="flex-1 bg-white p-6 dark:bg-darkBlue-003">
            {/* Calendar Header */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={goToPreviousMonth}
                className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-darkBlue-203"
              >
                <ChevronLeft className="h-5 w-5 text-gray-500" />
              </button>
              
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {getMonthName(currentDate)}
                </h3>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-darkBlue-203"
                >
                  <RefreshCw
                    className={cn(
                      "h-5 w-5 text-gray-500",
                      isRefreshing && "animate-spin"
                    )}
                  />
                </button>
              </div>
              
              <button
                onClick={goToNextMonth}
                className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-darkBlue-203"
              >
                <ChevronRight className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={goToToday}
                className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <CalendarIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Today</span>
              </button>
              <button
                onClick={() => setIsMonthSummaryOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Grid3x3 className="h-4 w-4" />
                <span className="text-sm font-medium">Month Summary</span>
              </button>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              
              {/* Days of the month */}
              {days.map((day) => {
                const dayTasks = getTasksForDate(day);
                const hasTasks = dayTasks.length > 0;
                const isTodayDate = isToday(day);
                const isSelectedDate = isSelected(day);
                
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                    className={cn(
                      "aspect-square flex flex-col items-center justify-center rounded-lg transition-colors relative",
                      isSelectedDate
                        ? "bg-red-500 text-white"
                        : isTodayDate
                        ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-darkBlue-203"
                    )}
                  >
                    <span className={cn(
                      "text-sm font-medium",
                      isSelectedDate && "text-white"
                    )}>
                      {day}
                    </span>
                    {hasTasks && (
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full mt-1",
                        isSelectedDate ? "bg-white" : "bg-red-500"
                      )} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upcoming Events Sidebar */}
          <div className="w-full bg-gray-50 p-6 dark:bg-darkBlue-003 lg:w-80">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Upcoming Events
            </h3>
            {getUpcomingEvents().length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No upcoming events
              </p>
            ) : (
              <div className="space-y-3">
                {getUpcomingEvents().map((task) => (
                  <Link
                    key={task.jobId}
                    href={`/job-details/${task.jobId}`}
                    className="block rounded-lg border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md dark:border-gray-600/50 dark:bg-darkBlue-203"
                  >
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                      {task.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(task.createdAt)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Month Summary Modal */}
      {isMonthSummaryOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[200]"
            onClick={() => setIsMonthSummaryOpen(false)}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-darkBlue-003 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Month Summary
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {getMonthName(currentDate)}
                  </p>
                </div>
                <button
                  onClick={() => setIsMonthSummaryOpen(false)}
                  className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-darkBlue-203"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Summary Content */}
              <div className="p-6">
                {(() => {
                  const summary = getMonthSummary();
                  return (
                    <>
                      {/* Statistics Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gray-50 dark:bg-darkBlue-203 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <ClipboardList className="h-5 w-5 text-gray-500" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              Total Tasks
                            </span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {summary.totalTasks}
                          </p>
                        </div>

                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-400">
                              Completed
                            </span>
                          </div>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {summary.completedTasks}
                          </p>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-5 w-5 text-blue-500" />
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                              In Progress
                            </span>
                          </div>
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {summary.inProgressTasks}
                          </p>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="h-5 w-5 text-red-500" />
                            <span className="text-sm font-medium text-red-700 dark:text-red-400">
                              Earnings
                            </span>
                          </div>
                          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                            ${summary.totalEarnings.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Additional Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 dark:bg-darkBlue-203 rounded-lg p-4">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Total Hours
                          </span>
                          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                            {summary.totalHours} hrs
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-darkBlue-203 rounded-lg p-4">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Completion Rate
                          </span>
                          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                            {summary.totalTasks > 0
                              ? Math.round((summary.completedTasks / summary.totalTasks) * 100)
                              : 0}
                            %
                          </p>
                        </div>
                      </div>

                      {/* Task List */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Tasks This Month
                        </h3>
                        {summary.tasks.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No tasks for this month</p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {summary.tasks.map((task) => (
                              <Link
                                key={task.jobId}
                                href={`/job-details/${task.jobId}`}
                                className="block p-4 bg-gray-50 dark:bg-darkBlue-203 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                                      {task.title}
                                    </h4>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                      <span>{formatDate(task.createdAt)}</span>
                                      <span>{formatPrice(task)}</span>
                                    </div>
                                  </div>
                                  <span
                                    className={cn(
                                      "px-2 py-1 rounded-full text-xs font-medium flex-shrink-0",
                                      task.completionStatus === "completed"
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                        : task.completionStatus === "in_progress"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                        : "bg-gray-100 text-gray-700 dark:bg-darkBlue-203 dark:text-gray-400"
                                    )}
                                  >
                                    {task.completionStatus === "in_progress"
                                      ? "In Progress"
                                      : task.completionStatus.charAt(0).toUpperCase() +
                                        task.completionStatus.slice(1)}
                                  </span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
