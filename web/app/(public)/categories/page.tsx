import React from "react";
import Link from "next/link";
import { categories } from "@/lib/mock-data/categories";
import { Card, CardContent } from "@/components/ui/Card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse all task categories on TaskZing",
  openGraph: {
    title: "Categories | TaskZing",
    description: "Browse all task categories on TaskZing",
  },
};

export default function CategoriesPage() {
  // Group categories by main category
  const groupedCategories = categories.reduce((acc, category) => {
    if (!acc[category.mainCategory]) {
      acc[category.mainCategory] = [];
    }
    acc[category.mainCategory].push(category);
    return acc;
  }, {} as Record<string, typeof categories>);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h1 className="mb-4 text-4xl font-bold text-theme-primaryText dark:text-white">Browse Categories</h1>
        <p className="text-lg text-theme-accent4 dark:text-white/80">
          Find professionals by category
        </p>
      </div>

      <div className="space-y-12">
        {Object.entries(groupedCategories).map(([mainCategory, cats]) => (
          <div key={mainCategory}>
            <h2 className="mb-6 text-2xl font-semibold text-theme-primaryText dark:text-white">{mainCategory}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cats.map((category) => (
                <Link key={category.id} href={`/category/${category.id}`}>
                  <Card className="hover:shadow-lg transition-shadow h-full">
                    <CardContent className="p-6">
                      <h3 className="mb-2 text-xl font-semibold text-theme-primaryText dark:text-white">
                        {category.subCategory || category.mainCategory}
                      </h3>
                      {category.items && category.items.length > 0 && (
                        <ul className="space-y-1">
                          {category.items.slice(0, 4).map((item, i) => (
                            <li key={i} className="text-sm text-theme-accent4 dark:text-white/80">
                              • {item}
                            </li>
                          ))}
                          {category.items.length > 4 && (
                            <li className="text-sm text-primary-500 font-medium">
                              +{category.items.length - 4} more
                            </li>
                          )}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

