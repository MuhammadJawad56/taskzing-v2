import React from "react";
import Link from "next/link";
import { DollarSign, Calendar, CheckCircle, Clock, XCircle } from "lucide-react";
import { OrderWithDetails } from "@/lib/types/order";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";

export interface OrderCardProps {
  order: OrderWithDetails;
  viewType?: "client" | "provider";
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, viewType = "client" }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "in_progress":
        return "info";
      case "pending":
        return "warning";
      case "cancelled":
        return "danger";
      default:
        return "default";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "success";
      case "pending":
        return "warning";
      case "refunded":
        return "default";
      case "failed":
        return "danger";
      default:
        return "default";
    }
  };

  const otherUser = viewType === "client" ? order.provider : order.client;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-theme-primaryText dark:text-white mb-2">
              {order.taskTitle}
            </h3>
            {otherUser && (
              <div className="flex items-center space-x-3 mb-3">
                <Avatar src={otherUser.photoUrl} name={otherUser.fullName} size="md" />
                <div>
                  <span className="font-medium text-theme-primaryText dark:text-white">
                    {otherUser.fullName}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end space-y-2">
            <Badge variant={getStatusColor(order.status)} size="md">
              {order.status.replace("_", " ")}
            </Badge>
            <Badge variant={getPaymentStatusColor(order.paymentStatus)} size="sm">
              {order.paymentStatus}
            </Badge>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-theme-accent4 dark:text-gray-300">
            <DollarSign className="h-4 w-4 mr-1" />
            <span className="text-lg font-bold text-theme-primaryText dark:text-white">
              ${order.amount.toFixed(2)}
            </span>
          </div>
          {order.dueDate && (
            <div className="flex items-center text-sm text-theme-accent4 dark:text-gray-300">
              <Calendar className="h-4 w-4 mr-1" />
              <span>Due: {new Date(order.dueDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {order.completedAt && (
          <div className="flex items-center text-sm text-theme-accent4 dark:text-gray-300 pt-4 border-t border-theme-accent2">
            <CheckCircle className="h-4 w-4 mr-1 text-accent-success" />
            <span>Completed on {new Date(order.completedAt).toLocaleDateString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

