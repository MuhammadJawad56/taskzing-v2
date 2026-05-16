/**
 * Category types
 * Based on the categories table schema
 */

export interface Category {
  id: string;
  mainCategory: string;
  subCategory?: string;
  items?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryWithStats extends Category {
  taskCount?: number;
  averagePrice?: number;
  popularSkills?: string[];
}

