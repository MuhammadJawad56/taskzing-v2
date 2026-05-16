"use client";

import React, { useState, useEffect } from "react";
import { OrderCard } from "@/components/dashboard/OrderCard";
import { OrderWithDetails } from "@/lib/types/order";
import { getMockSession } from "@/lib/auth/mock";

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "completed">("all");
  const session = getMockSession();

  useEffect(() => {
    if (session) {
      fetch(`/api/orders?clientId=${session.id}`)
        .then((res) => res.json())
        .then((data) => {
          setOrders(data);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    }
  }, [session]);

  const filteredOrders =
    activeTab === "all"
      ? orders
      : activeTab === "active"
      ? orders.filter((o) => o.status === "in_progress" || o.status === "pending")
      : orders.filter((o) => o.status === "completed");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900">Orders</h1>
        <p className="text-secondary-600 mt-2">Manage your orders</p>
      </div>

      <div className="mb-6 border-b border-secondary-200">
        <div className="flex space-x-4">
          {(["all", "active", "completed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-2 border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? "border-primary-600 text-primary-600 font-medium"
                  : "border-transparent text-secondary-600 hover:text-secondary-900"
              }`}
            >
              {tab} ({tab === "all" ? orders.length : filteredOrders.length})
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12">
            <p className="text-secondary-500">Loading orders...</p>
          </div>
        ) : filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <OrderCard key={order.orderId} order={order} viewType="client" />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-secondary-500">No orders found</p>
          </div>
        )}
      </div>
    </div>
  );
}

