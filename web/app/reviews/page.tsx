"use client";

import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/api/AuthContext";
import {
  formatReviewDate,
  getUserReviewStats,
  type ReviewListItem,
  type UserReviewStats,
} from "@/lib/api/reviews";
export default function ReviewsPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<UserReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.uid) {
      setLoading(false);
      setStats(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const s = await getUserReviewStats(user.uid);
        if (!cancelled) setStats(s);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load reviews.");
          setStats(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, authLoading]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl px-3 py-4 sm:px-0">
        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">Reviews</h1>
        <p className="mb-6 text-sm text-gray-600 dark:text-white/80">
          Ratings others left for you after completed jobs (same rules as the mobile app).
        </p>

        {!authLoading && !user && (
          <p className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-gray-700 dark:border-white/15 dark:bg-white/5 dark:text-white">
            Sign in to see your reviews.{" "}
            <Link href="/login" className="font-semibold text-red-600 underline-offset-2 hover:underline dark:text-red-400">
              Log in
            </Link>
          </p>
        )}

        {error && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
            {error}
          </p>
        )}

        {user && !loading && stats && stats.totalReviews > 0 && (
          <div className="mb-6 flex flex-wrap items-baseline gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-white/15 dark:bg-darkBlue-203/60">
            <span className="text-sm font-medium text-gray-600 dark:text-white/90">Average rating</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              {stats.averageRating.toFixed(1)}
            </span>
            <span className="text-sm text-gray-500 dark:text-white/70">
              from {stats.totalReviews} review{stats.totalReviews === 1 ? "" : "s"}
            </span>
          </div>
        )}

        {user && loading && (
          <p className="py-12 text-center text-gray-500 dark:text-white/70">Loading reviews…</p>
        )}

        {user && !loading && stats && stats.reviews.length === 0 && !error && (
          <p className="rounded-xl border border-gray-200 bg-gray-50 py-12 text-center text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-white">
            No reviews yet. Completed jobs can lead to reviews from clients or providers.
          </p>
        )}

        {user && stats && stats.reviews.length > 0 && (
          <div className="space-y-4">
            {stats.reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function ReviewCard({ review }: { review: ReviewListItem }) {
  const rating = Math.round(Math.min(5, Math.max(1, review.rating)));
  const dateLabel = formatReviewDate(review.createdAt);

  return (
    <Card className="border-gray-200 dark:border-white/10 dark:bg-darkBlue-203/40">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar
              src={review.reviewerPhoto?.trim() || undefined}
              name={review.reviewerName}
              alt={review.reviewerName}
            />
            <div className="min-w-0">
              <CardTitle className="truncate text-lg text-gray-900 dark:text-white">
                {review.reviewerName}
              </CardTitle>
              <div className="mt-1 flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < rating ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-white/25"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          {dateLabel ? (
            <p className="shrink-0 text-sm text-gray-500 dark:text-white/70">{dateLabel}</p>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-gray-800 dark:text-white">{review.reviewText}</p>
      </CardContent>
    </Card>
  );
}
