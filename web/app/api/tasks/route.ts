import { NextResponse } from "next/server";
import { tasks, getTasksByCategory, getOpenTasks } from "@/lib/mock-data/tasks";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const status = searchParams.get("status");

  let filteredTasks = tasks;

  if (category) {
    filteredTasks = getTasksByCategory(category);
  }

  if (status === "open") {
    filteredTasks = filteredTasks.filter((task) => task.completionStatus === "open");
  }

  return NextResponse.json(filteredTasks);
}

