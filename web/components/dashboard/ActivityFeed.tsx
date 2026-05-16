import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface ActivityItem {
  id: string;
  type: "proposal" | "message" | "order" | "task";
  title: string;
  description: string;
  timestamp: string;
  link?: string;
}

export interface ActivityFeedProps {
  activities: ActivityItem[];
  maxItems?: number;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  maxItems = 10,
}) => {
  const displayActivities = activities.slice(0, maxItems);

  if (displayActivities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-theme-accent4 text-center py-8">No recent activity</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start space-x-4 pb-4 border-b border-theme-accent2 last:border-0 last:pb-0"
            >
              <div className="flex-1">
                <h4 className="font-medium text-theme-primaryText dark:text-white mb-1">
                  {activity.title}
                </h4>
                <p className="text-sm text-theme-accent4 dark:text-gray-300 mb-2">
                  {activity.description}
                </p>
                <div className="flex items-center text-xs text-theme-accent4 dark:text-gray-300">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>
                    {formatDistanceToNow(new Date(activity.timestamp), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

