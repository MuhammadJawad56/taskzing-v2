import React from "react";
import Link from "next/link";
import { Calendar, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description: "Latest news, tips, and insights from TaskZing",
};

// Mock blog posts
const blogPosts = [
  {
    id: "1",
    title: "10 Tips for Finding the Right Professional",
    excerpt:
      "Learn how to choose the best professional for your task with these proven tips and strategies.",
    author: "TaskZing Team",
    date: "2024-01-15",
    category: "Tips",
  },
  {
    id: "2",
    title: "How to Write an Effective Task Description",
    excerpt:
      "A well-written task description can help you attract better proposals and find the right professional faster.",
    author: "TaskZing Team",
    date: "2024-01-10",
    category: "Guide",
  },
  {
    id: "3",
    title: "Building Your Professional Profile on TaskZing",
    excerpt:
      "Discover how to create a compelling profile that attracts clients and helps you stand out from the competition.",
    author: "TaskZing Team",
    date: "2024-01-05",
    category: "For Professionals",
  },
  {
    id: "4",
    title: "The Future of Freelancing",
    excerpt:
      "Explore trends and insights into the growing freelance economy and how TaskZing is shaping the future.",
    author: "TaskZing Team",
    date: "2023-12-28",
    category: "Industry",
  },
  {
    id: "5",
    title: "Success Stories: How TaskZing Changed Lives",
    excerpt:
      "Read inspiring stories from professionals and clients who have found success through our platform.",
    author: "TaskZing Team",
    date: "2023-12-20",
    category: "Stories",
  },
  {
    id: "6",
    title: "Getting Started as a Professional on TaskZing",
    excerpt:
      "A comprehensive guide for new professionals looking to start their journey on TaskZing.",
    author: "TaskZing Team",
    date: "2023-12-15",
    category: "Guide",
  },
];

export default function BlogPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-secondary-900 mb-4">Blog</h1>
          <p className="text-xl text-secondary-600">
            Latest news, tips, and insights
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map((post) => (
            <Link key={post.id} href={`/blog/${post.id}`}>
              <Card className="hover:shadow-lg transition-shadow h-full">
                <CardContent className="p-6">
                  <div className="mb-3">
                    <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                      {post.category}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-secondary-900 mb-3 line-clamp-2">
                    {post.title}
                  </h2>
                  <p className="text-secondary-600 mb-4 line-clamp-3">{post.excerpt}</p>
                  <div className="flex items-center text-sm text-secondary-500 space-x-4">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      <span>{post.author}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{new Date(post.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

