import { NextResponse } from "next/server";
import { getCategoryBySlug } from "@/lib/mock-data/categories";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const category = getCategoryBySlug(params.slug);
  
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  return NextResponse.json(category);
}

