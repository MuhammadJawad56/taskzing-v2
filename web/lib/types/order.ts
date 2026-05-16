/**
 * Order types
 * Represents completed/accepted jobs with payment information
 */

export type OrderStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed";

export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";

export interface Order {
  orderId: string;
  jobId: string;
  clientId: string;
  providerId: string;
  taskTitle: string;
  amount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  startedAt?: string;
  completedAt?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderWithDetails extends Order {
  client?: {
    id: string;
    fullName: string;
    photoUrl?: string;
  };
  provider?: {
    id: string;
    fullName: string;
    photoUrl?: string;
  };
  task?: {
    jobId: string;
    title: string;
    description: string;
  };
}

