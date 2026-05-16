import React from "react";
import { Card, CardContent } from "@/components/ui/Card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about TaskZing and our mission to connect clients with skilled professionals",
};

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-secondary-900 mb-4">About TaskZing</h1>
          <p className="text-xl text-secondary-600">
            Connecting clients with skilled professionals, one task at a time
          </p>
        </div>

        <div className="space-y-8 mb-12">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-semibold text-secondary-900 mb-4">Our Mission</h2>
              <p className="text-secondary-700 leading-relaxed">
                TaskZing was founded with a simple mission: to make it easy for people to find
                skilled professionals for any task, big or small. We believe that everyone deserves
                access to quality services, and every professional deserves a platform to showcase
                their skills.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-semibold text-secondary-900 mb-4">What We Do</h2>
              <p className="text-secondary-700 leading-relaxed mb-4">
                TaskZing is a marketplace that connects clients with verified professionals across
                various categories including home services, tech services, delivery, personal care,
                and more.
              </p>
              <ul className="list-disc list-inside space-y-2 text-secondary-700">
                <li>AI models for smarter task matching and recommendations</li>
                <li>Bidding system for competitive offers and transparent pricing</li>
                <li>Easy communication tools</li>
                <li>Quality assurance and dispute resolution</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-semibold text-secondary-900 mb-4">Our Values</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-secondary-900 mb-2">Trust</h3>
                  <p className="text-secondary-600 text-sm">
                    We verify all professionals and maintain a transparent review system
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-secondary-900 mb-2">Quality</h3>
                  <p className="text-secondary-600 text-sm">
                    We ensure high standards through our rating and review system
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-secondary-900 mb-2">Accessibility</h3>
                  <p className="text-secondary-600 text-sm">
                    We make professional services accessible to everyone
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-secondary-900 mb-2">Innovation</h3>
                  <p className="text-secondary-600 text-sm">
                    We continuously improve our platform to serve you better
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

