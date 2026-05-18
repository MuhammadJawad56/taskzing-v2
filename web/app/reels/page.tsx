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
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900 animate-pulse lg:bg-[#121212]"
          aria-hidden
        >
          <div className="aspect-[9/16] w-[min(420px,calc((100dvh-180px)*9/16))] max-h-[min(calc(100dvh-180px),780px)] rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-900" />
        </div>
      }
    >
      <ReelsFeedClient initialReelId={searchParams.reelId ?? null} />
    </Suspense>
  );
}
