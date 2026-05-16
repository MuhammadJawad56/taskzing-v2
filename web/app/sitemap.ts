import { MetadataRoute } from "next";
import { categories } from "@/lib/mock-data/categories";
import { tasks } from "@/lib/mock-data/tasks";
import { users } from "@/lib/mock-data/users";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://taskzing.com";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];

  // Dynamic category pages
  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${baseUrl}/category/${category.id}`,
    lastModified: new Date(category.updatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Dynamic task pages
  const taskPages: MetadataRoute.Sitemap = tasks.map((task) => ({
    url: `${baseUrl}/task/${task.jobId}`,
    lastModified: new Date(task.updatedAt),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  // Dynamic freelancer pages
  const freelancerPages: MetadataRoute.Sitemap = users
    .filter((user) => user.currentRole === "provider" || user.role === "provider")
    .map((user) => ({
      url: `${baseUrl}/freelancer/${user.id}`,
      lastModified: new Date(user.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  return [...staticPages, ...categoryPages, ...taskPages, ...freelancerPages];
}

