import React from "react";
import { notFound } from "next/navigation";
import { getUserBySlug, getUserById } from "@/lib/mock-data/users";
import { getTasksByClientId } from "@/lib/mock-data/tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { CheckCircle, Star, MapPin, Briefcase } from "lucide-react";
import { TaskCard } from "@/components/task/TaskCard";
import type { Metadata } from "next";

interface FreelancerPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: FreelancerPageProps): Promise<Metadata> {
  const user = getUserBySlug(params.slug) || getUserById(params.slug);
  
  if (!user) {
    return {
      title: "Profile Not Found",
    };
  }

  return {
    title: `${user.fullName || user.username} - Freelancer Profile`,
    description: user.description || `View ${user.fullName || user.username}'s profile on TaskZing`,
  };
}

export default function FreelancerPage({ params }: FreelancerPageProps) {
  const user = getUserBySlug(params.slug) || getUserById(params.slug);

  if (!user || (user.currentRole !== "provider" && user.role !== "provider")) {
    notFound();
  }

  const completedTasks = getTasksByClientId(user.id).filter(
    (task) => task.completionStatus === "completed"
  );

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
              <Avatar src={user.photoUrl} name={user.fullName} size="xl" />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h1 className="text-3xl font-bold text-secondary-900">
                    {user.fullName || user.username}
                  </h1>
                  {user.isVerified && (
                    <CheckCircle className="h-6 w-6 text-primary-600" />
                  )}
                </div>
                {user.location && (
                  <div className="flex items-center text-secondary-600 mb-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{user.location}</span>
                  </div>
                )}
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-400 fill-yellow-400 mr-1" />
                    <span className="font-semibold text-secondary-900">
                      {user.totalRating.toFixed(1)}
                    </span>
                    <span className="text-secondary-600 ml-1">
                      ({user.totalReviews} reviews)
                    </span>
                  </div>
                  {user.rate && (
                    <div className="flex items-center text-secondary-600">
                      <Briefcase className="h-4 w-4 mr-1" />
                      <span>${user.rate}/hr</span>
                    </div>
                  )}
                </div>
                {user.description && (
                  <p className="text-secondary-700 mb-4">{user.description}</p>
                )}
                {user.skills && user.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {user.skills.map((skill) => (
                      <Badge key={skill} variant="default" size="md">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">
                {user.completedAt || 0}
              </div>
              <div className="text-secondary-600">Completed Tasks</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">
                {user.totalReviews}
              </div>
              <div className="text-secondary-600">Reviews</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">
                {user.totalRating.toFixed(1)}
              </div>
              <div className="text-secondary-600">Average Rating</div>
            </CardContent>
          </Card>
        </div>

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold text-secondary-900 mb-6">
              Completed Tasks
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedTasks.slice(0, 6).map((task) => (
                <TaskCard key={task.jobId} task={task} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

