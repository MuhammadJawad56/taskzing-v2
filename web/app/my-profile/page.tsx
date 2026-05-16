"use client";

import React from "react";
import Link from "next/link";
import { Edit, Settings } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function MyProfilePage() {
  const profile = {
    fullName: "John Doe",
    bio: "Experienced professional with 5+ years in web development",
    email: "john.doe@example.com",
    phone: "+1234567890",
    location: "New York, USA",
    rating: 4.8,
    totalReviews: 24,
    completedTasks: 45,
    skills: ["Web Development", "React", "Node.js", "TypeScript"],
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-theme-primaryText">My Profile</h1>
          <div className="flex gap-2">
            <Link href="/edit-profile">
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </Link>
            <Link href="/dashboard/settings">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar size="lg" src="/images/icons/profile.jpg" alt={profile.fullName} />
                <div>
                  <CardTitle className="text-2xl">{profile.fullName}</CardTitle>
                  <p className="text-theme-accent4 mt-1">{profile.location}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-theme-primaryText mb-2">Bio</h3>
                <p className="text-theme-accent4">{profile.bio}</p>
              </div>
              <div>
                <h3 className="font-semibold text-theme-primaryText mb-2">Contact</h3>
                <p className="text-theme-accent4">{profile.email}</p>
                <p className="text-theme-accent4">{profile.phone}</p>
              </div>
              <div>
                <h3 className="font-semibold text-theme-primaryText mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, i) => (
                    <Badge key={i} variant="default">{skill}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-theme-accent4">Rating</p>
                <p className="text-2xl font-bold text-theme-primaryText">{profile.rating}</p>
                <p className="text-sm text-theme-accent4">{profile.totalReviews} reviews</p>
              </div>
              <div>
                <p className="text-sm text-theme-accent4">Completed Tasks</p>
                <p className="text-2xl font-bold text-theme-primaryText">{profile.completedTasks}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

