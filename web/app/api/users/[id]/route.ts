import { NextResponse } from "next/server";
import { getUserById, getUserBySlug } from "@/lib/mock-data/users";
import { getTasksByClientId } from "@/lib/mock-data/tasks";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = getUserById(params.id) || getUserBySlug(params.id);
  
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // If provider, get their completed tasks
  if (user.currentRole === "provider" || user.role === "provider") {
    const completedTasks = getTasksByClientId(user.id).filter(
      (task) => task.completionStatus === "completed"
    );

    return NextResponse.json({
      ...user,
      completedTasks: completedTasks.length,
    });
  }

  return NextResponse.json(user);
}

