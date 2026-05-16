import React from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Showcases",
  description: "Browse portfolio showcases from TaskZing providers",
};

export default function AllShowcasesPage() {
  const showcases = [
    {
      id: "1",
      title: "E-commerce Website",
      description: "Modern e-commerce platform built with React and Node.js",
      image: "/images/placeholder_image.png",
      provider: "John Doe",
      tags: ["Web Development", "React", "Node.js"],
    },
    {
      id: "2",
      title: "Mobile App Design",
      description: "UI/UX design for a fitness tracking mobile application",
      image: "/images/placeholder_image.png",
      provider: "Jane Smith",
      tags: ["UI/UX", "Mobile Design"],
    },
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-theme-primaryText mb-4">All Showcases</h1>
        <p className="text-lg text-theme-accent4">Browse portfolio work from our providers</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {showcases.map((showcase) => (
          <Card key={showcase.id} className="hover:shadow-lg transition-shadow">
            <div className="relative h-48 w-full">
              <Image
                src={showcase.image}
                alt={showcase.title}
                fill
                className="object-cover rounded-t-lg"
              />
            </div>
            <CardHeader>
              <CardTitle className="text-lg">{showcase.title}</CardTitle>
              <p className="text-sm text-theme-accent4">by {showcase.provider}</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-theme-accent4 mb-4">{showcase.description}</p>
              <div className="flex flex-wrap gap-2">
                {showcase.tags.map((tag, i) => (
                  <Badge key={i} variant="default">{tag}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

