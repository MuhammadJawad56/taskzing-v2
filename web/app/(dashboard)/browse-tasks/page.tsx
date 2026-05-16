"use client";

import React, { useState, useEffect } from "react";
import { TaskList, TaskFilters, TaskSearch } from "@/components/task";
import { Task } from "@/lib/types/task";

export default function BrowseTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Fetch tasks
    fetch("/api/tasks?status=open")
      .then((res) => res.json())
      .then((data) => {
        setTasks(data);
        setFilteredTasks(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query) {
      setFilteredTasks(tasks);
      return;
    }
    const filtered = tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(query.toLowerCase()) ||
        task.description.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredTasks(filtered);
  };

  const handleFilterChange = (filters: any) => {
    let filtered = tasks;

    if (filters.category && filters.category !== "all") {
      // Filter by category would need category matching logic
    }

    if (filters.jobType && filters.jobType !== "all") {
      filtered = filtered.filter((task) => task.jobType === filters.jobType);
    }

    if (filters.urgency && filters.urgency !== "all") {
      filtered = filtered.filter((task) => task.urgency === filters.urgency);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTasks(filtered);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900">Browse Tasks</h1>
        <p className="text-secondary-600 mt-2">Find tasks that match your skills</p>
      </div>

      <div className="mb-6">
        <TaskSearch onSearch={handleSearch} />
      </div>

      <TaskFilters onFilterChange={handleFilterChange} />

      <TaskList tasks={filteredTasks} isLoading={isLoading} />
    </div>
  );
}

