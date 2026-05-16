"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function RecentSearchesPage() {
  const searches = [
    "Web Developer",
    "Graphic Designer",
    "Mobile App Developer",
    "Content Writer",
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-theme-primaryText mb-8">Recent Searches</h1>
        
        <Card>
          <CardContent className="p-6">
            {searches.length === 0 ? (
              <p className="text-theme-accent4 text-center">No recent searches</p>
            ) : (
              <div className="space-y-2">
                {searches.map((search, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 hover:bg-theme-accent2 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Search className="h-4 w-4 text-theme-accent4" />
                      <span className="text-theme-primaryText">{search}</span>
                    </div>
                    <Button variant="ghost" size="sm">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

