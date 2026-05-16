import React from "react";
import { notFound } from "next/navigation";
import { getCategoryBySlug, getCategoryById } from "@/lib/mock-data/categories";
import { getTasksByCategory } from "@/lib/mock-data/tasks";
import { TaskList } from "@/components/task/TaskList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { Metadata } from "next";

interface CategoryPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const category = getCategoryBySlug(params.slug) || getCategoryById(params.slug);
  
  if (!category) {
    return {
      title: "Category Not Found",
    };
  }

  return {
    title: `${category.mainCategory}${category.subCategory ? ` - ${category.subCategory}` : ""}`,
    description: `Browse ${category.mainCategory}${category.subCategory ? ` - ${category.subCategory}` : ""} tasks on TaskZing`,
  };
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const category = getCategoryBySlug(params.slug) || getCategoryById(params.slug);

  if (!category) {
    notFound();
  }

  const tasks = getTasksByCategory(category.mainCategory);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-secondary-900 mb-2">
          {category.mainCategory}
          {category.subCategory && (
            <span className="text-2xl text-secondary-600"> - {category.subCategory}</span>
          )}
        </h1>
        <p className="text-lg text-secondary-600">
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"} available
        </p>
      </div>

      {category.items && category.items.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Services in this category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {category.items.map((item, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-secondary-100 text-secondary-700 rounded-full text-sm"
                >
                  {item}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-2xl font-semibold text-secondary-900 mb-6">Available Tasks</h2>
        <TaskList tasks={tasks} />
      </div>
    </div>
  );
}

