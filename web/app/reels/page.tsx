import { Suspense } from "react";
import type { Metadata } from "next";
import { ReelsFeedClient } from "@/components/reels/ReelsFeedClient";

export const metadata: Metadata = {
  title: "Reels | TaskZing",
  description: "Watch and share short videos on TaskZing.",
};

export default function ReelsPage({
  searchParams,
}: {
  searchParams: { reelId?: string };
}) {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-[100] bg-zinc-900 animate-pulse" aria-hidden />
      }
    >
      <ReelsFeedClient initialReelId={searchParams.reelId ?? null} />
    </Suspense>
  );
}
