import { Order } from "@/lib/types/order";

export const orders: Order[] = [
  {
    orderId: "order-1",
    jobId: "task-3",
    clientId: "user-5",
    providerId: "user-3",
    taskTitle: "Fix Leaky Kitchen Faucet",
    amount: 150,
    status: "completed",
    paymentStatus: "paid",
    startedAt: "2024-01-22T16:00:00Z",
    completedAt: "2024-01-22T17:00:00Z",
    createdAt: "2024-01-22T16:00:00Z",
    updatedAt: "2024-01-22T17:00:00Z",
  },
  {
    orderId: "order-2",
    jobId: "task-2",
    clientId: "user-5",
    providerId: "user-4",
    taskTitle: "House Cleaning - 3 Bedroom Apartment",
    amount: 180,
    status: "in_progress",
    paymentStatus: "pending",
    startedAt: "2024-01-23T09:00:00Z",
    dueDate: "2024-01-26T18:00:00Z",
    createdAt: "2024-01-23T09:00:00Z",
    updatedAt: "2024-01-23T09:00:00Z",
  },
];

export function getOrderById(id: string): Order | undefined {
  return orders.find((order) => order.orderId === id);
}

export function getOrdersByClientId(clientId: string): Order[] {
  return orders.filter((order) => order.clientId === clientId);
}

export function getOrdersByProviderId(providerId: string): Order[] {
  return orders.filter((order) => order.providerId === providerId);
}

