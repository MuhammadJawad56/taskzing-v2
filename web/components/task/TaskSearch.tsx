"use client";

import React, { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export interface TaskSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export const TaskSearch: React.FC<TaskSearchProps> = ({
  onSearch,
  placeholder = "Search tasks...",
}) => {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleClear = () => {
    setQuery("");
    onSearch("");
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-theme-accent4" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-20"
          aria-label="Search tasks"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-theme-accent2 rounded"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-theme-accent4" />
            </button>
          )}
          <Button type="submit" size="sm" variant="primary">
            Search
          </Button>
        </div>
      </div>
    </form>
  );
};

