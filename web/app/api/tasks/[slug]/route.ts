import { NextResponse } from "next/server";
import { getTaskBySlug, getTaskById } from "@/lib/mock-data/tasks";
import { getUserById } from "@/lib/mock-data/users";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const task = getTaskBySlug(params.slug) || getTaskById(params.slug);
  
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Enrich with client data
  const client = getUserById(task.clientId);
  const contractor = task.contractorId ? getUserById(task.contractorId) : undefined;

  const taskWithDetails = {
    ...task,
    client: client ? {
      id: client.id,
      fullName: client.fullName || "Unknown",
      photoUrl: client.photoUrl,
      isVerified: client.isVerified,
      totalRating: client.totalRating,
    } : undefined,
    contractor: contractor ? {
      id: contractor.id,
      fullName: contractor.fullName || "Unknown",
      photoUrl: contractor.photoUrl,
    } : undefined,
  };

  return NextResponse.json(taskWithDetails);
}

