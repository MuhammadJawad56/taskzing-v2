import { NextResponse } from "next/server";
import {
  orders,
  getOrdersByClientId,
  getOrdersByProviderId,
} from "@/lib/mock-data/orders";
import { getUserById } from "@/lib/mock-data/users";
import { getTaskById } from "@/lib/mock-data/tasks";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const providerId = searchParams.get("providerId");

  let filteredOrders = orders;

  if (clientId) {
    filteredOrders = getOrdersByClientId(clientId);
  } else if (providerId) {
    filteredOrders = getOrdersByProviderId(providerId);
  }

  // Enrich with client, provider, and task data
  const enrichedOrders = filteredOrders.map((order) => {
    const client = getUserById(order.clientId);
    const provider = getUserById(order.providerId);
    const task = getTaskById(order.jobId);

    return {
      ...order,
      client: client ? {
        id: client.id,
        fullName: client.fullName || "Unknown",
        photoUrl: client.photoUrl,
      } : undefined,
      provider: provider ? {
        id: provider.id,
        fullName: provider.fullName || "Unknown",
        photoUrl: provider.photoUrl,
      } : undefined,
      task: task ? {
        jobId: task.jobId,
        title: task.title,
        description: task.description,
      } : undefined,
    };
  });

  return NextResponse.json(enrichedOrders);
}

