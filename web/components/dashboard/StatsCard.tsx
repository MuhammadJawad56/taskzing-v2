import React from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  className?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  trend,
  className,
}) => {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-theme-accent4 dark:text-gray-300 mb-1">{title}</p>
            <p className="text-2xl font-bold text-theme-primaryText dark:text-white">{value}</p>
            {trend && (
              <p className="text-sm mt-1 text-theme-accent4 dark:text-gray-300">
                {trend}
              </p>
            )}
          </div>
          <div className="p-3 bg-primary-100 rounded-lg">
            <div className="h-6 w-6 text-primary-500">{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

