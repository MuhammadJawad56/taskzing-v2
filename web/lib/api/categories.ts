import type { Category } from "@/lib/types/category";

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "home-services",
    mainCategory: "Home Services",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cleaning",
    mainCategory: "Cleaning",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "delivery",
    mainCategory: "Delivery",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tech",
    mainCategory: "Tech & IT",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "other",
    mainCategory: "Other",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Loads marketplace categories (static defaults; replace with `/categories` API if added).
 */
export async function fetchCategoriesFromFirestore(): Promise<Category[]> {
  return [...DEFAULT_CATEGORIES].sort((a, b) =>
    a.mainCategory.localeCompare(b.mainCategory)
  );
}
