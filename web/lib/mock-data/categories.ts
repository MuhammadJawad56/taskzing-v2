import { Category } from "@/lib/types/category";

export const categories: Category[] = [
  {
    id: "cat-1",
    mainCategory: "Home Services",
    subCategory: "Cleaning",
    items: ["House Cleaning", "Office Cleaning", "Deep Cleaning", "Move-in/Move-out"],
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "cat-2",
    mainCategory: "Home Services",
    subCategory: "Plumbing",
    items: ["Leak Repair", "Installation", "Drain Cleaning", "Water Heater"],
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "cat-3",
    mainCategory: "Home Services",
    subCategory: "Electrical",
    items: ["Wiring", "Light Installation", "Outlet Repair", "Panel Upgrade"],
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "cat-4",
    mainCategory: "Delivery",
    subCategory: "Food Delivery",
    items: ["Restaurant Pickup", "Grocery Delivery", "Meal Prep"],
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "cat-5",
    mainCategory: "Delivery",
    subCategory: "Package Delivery",
    items: ["Local Delivery", "Same-day Delivery", "Furniture Delivery"],
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "cat-6",
    mainCategory: "Tech Services",
    subCategory: "IT Support",
    items: ["Computer Repair", "Network Setup", "Software Installation", "Data Recovery"],
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "cat-7",
    mainCategory: "Tech Services",
    subCategory: "Web Development",
    items: ["Website Design", "E-commerce", "WordPress", "Custom Development"],
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "cat-8",
    mainCategory: "Personal Care",
    subCategory: "Beauty",
    items: ["Haircut", "Hair Styling", "Makeup", "Nail Services"],
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "cat-9",
    mainCategory: "Personal Care",
    subCategory: "Fitness",
    items: ["Personal Training", "Yoga Instruction", "Nutrition Coaching"],
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "cat-10",
    mainCategory: "Education",
    subCategory: "Tutoring",
    items: ["Math Tutoring", "Language Learning", "Test Prep", "Music Lessons"],
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
];

export function getCategoryById(id: string): Category | undefined {
  return categories.find((cat) => cat.id === id);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find(
    (cat) =>
      cat.id === slug ||
      `${cat.mainCategory.toLowerCase()}-${cat.subCategory?.toLowerCase()}` === slug
  );
}

export function getCategoriesByMainCategory(mainCategory: string): Category[] {
  return categories.filter((cat) => cat.mainCategory === mainCategory);
}

