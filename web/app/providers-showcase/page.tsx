import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Providers Showcase",
  description: "View showcases from TaskZing providers",
};

export default function ProvidersShowcasePage() {
  const showcases = [
    {
      id: "1",
      title: "E-commerce Website",
      description: "Modern e-commerce platform",
      image: "/images/placeholder_image.png",
      provider: {
        name: "John Doe",
        avatar: "/images/icons/profile.jpg",
        rating: 4.8,
      },
      tags: ["Web Development", "React"],
    },
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-theme-primaryText mb-4">Providers Showcase</h1>
        <p className="text-lg text-theme-accent4">View work from our talented providers</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {showcases.map((showcase) => (
          <Link key={showcase.id} href={`/profile/${showcase.provider.name}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <div className="relative h-48 w-full">
                <Image
                  src={showcase.image}
                  alt={showcase.title}
                  fill
                  className="object-cover rounded-t-lg"
                />
              </div>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Avatar src={showcase.provider.avatar} alt={showcase.provider.name} />
                  <div>
                    <CardTitle className="text-lg">{showcase.title}</CardTitle>
                    <p className="text-sm text-theme-accent4">{showcase.provider.name}</p>
                  </div>
                </div>
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
          </Link>
        ))}
      </div>
    </div>
  );
}

