"use client";

import React, { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Card, CardContent } from "@/components/ui/Card";
import { categories } from "@/lib/mock-data/categories";

export interface TaskFiltersProps {
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  category?: string;
  jobType?: "fixed" | "hourly" | "all";
  minPrice?: number;
  maxPrice?: number;
  urgency?: "low" | "normal" | "high" | "urgent" | "all";
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({ onFilterChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    jobType: "all",
    urgency: "all",
  });

  const handleFilterChange = (key: keyof FilterState, value: string | number) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters: FilterState = {
      jobType: "all",
      urgency: "all",
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const categoryOptions = [
    { value: "all", label: "All Categories" },
    ...categories.map((cat) => ({
      value: cat.id,
      label: `${cat.mainCategory}${cat.subCategory ? ` - ${cat.subCategory}` : ""}`,
    })),
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 text-theme-primaryText hover:text-primary-500 transition-colors"
          aria-expanded={isOpen}
          aria-controls="filter-panel"
        >
          <Filter className="h-5 w-5" />
          <span className="font-medium">Filters</span>
        </button>
        {(filters.category || filters.jobType !== "all" || filters.urgency !== "all") && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {isOpen && (
        <Card id="filter-panel" className="mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Category"
                options={categoryOptions}
                value={filters.category || "all"}
                onChange={(e) => handleFilterChange("category", e.target.value)}
              />

              <Select
                label="Job Type"
                options={[
                  { value: "all", label: "All Types" },
                  { value: "fixed", label: "Fixed Price" },
                  { value: "hourly", label: "Hourly Rate" },
                ]}
                value={filters.jobType || "all"}
                onChange={(e) => handleFilterChange("jobType", e.target.value as any)}
              />

              <Select
                label="Urgency"
                options={[
                  { value: "all", label: "All" },
                  { value: "low", label: "Low" },
                  { value: "normal", label: "Normal" },
                  { value: "high", label: "High" },
                  { value: "urgent", label: "Urgent" },
                ]}
                value={filters.urgency || "all"}
                onChange={(e) => handleFilterChange("urgency", e.target.value as any)}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

