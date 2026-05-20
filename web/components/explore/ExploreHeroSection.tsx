"use client";

import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useTheme } from "@/lib/contexts/ThemeContext";

export const EXPLORE_HERO_QUOTE =
  '"Task Zing is the easiest way for service professionals to receive, manage, and complete online orders, all from one app."';

const HERO_SLIDES = [
  "/images/Vector 7.svg",
  "https://picsum.photos/seed/628/1600/900",
  "https://picsum.photos/seed/684/1600/900",
] as const;

type ExploreHeroSectionProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onNearMe: () => void;
  onSearchFocus?: () => void;
  isFetchingLocation?: boolean;
  isSearching?: boolean;
};

export function ExploreHeroSection({
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  onNearMe,
  onSearchFocus,
  isFetchingLocation = false,
  isSearching = false,
}: ExploreHeroSectionProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4800);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="relative w-full">
      <div className="relative min-h-[340px] sm:min-h-[400px] md:min-h-[480px]">
        <div className="absolute inset-0 overflow-hidden [clip-path:polygon(0_0,100%_0,100%_86%,50%_100%,0_86%)]">
          {HERO_SLIDES.map((src, index) => (
            <img
              key={src}
              src={src}
              alt=""
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
                index === heroSlideIndex ? "opacity-100" : "opacity-0",
              )}
            />
          ))}
          <div className="absolute inset-0 bg-[#0d1f3c]/55 dark:bg-darkBlue-013/60" aria-hidden />
        </div>

        <div className="absolute inset-0 z-[1] flex items-center justify-center px-4 pb-28 pt-6 sm:pb-32 md:pb-36">
          <p className="max-w-4xl text-center text-lg font-bold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] sm:text-xl md:text-3xl">
            {EXPLORE_HERO_QUOTE}
          </p>
        </div>

        <div className="absolute left-1/2 top-[62%] z-[2] w-full max-w-3xl -translate-x-1/2 px-4 sm:top-[64%] md:top-[66%]">
          <form
            onSubmit={onSearchSubmit}
            className={cn(
              "mx-auto flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 shadow-lg",
              isLight
                ? "border-gray-200 bg-white"
                : "border-gray-600 bg-darkBlue-003",
            )}
          >
            <button
              type="button"
              onClick={onNearMe}
              disabled={isFetchingLocation}
              aria-label="Find jobs near me"
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-full bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              Near me
            </button>
            <Search
              className={cn(
                "h-5 w-5 shrink-0",
                isLight ? "text-gray-400" : "text-white/60",
              )}
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              onFocus={onSearchFocus}
              placeholder="Search for services"
              disabled={isSearching}
              className={cn(
                "min-w-0 flex-1 bg-transparent text-sm focus:outline-none disabled:opacity-60 sm:text-base",
                isLight
                  ? "text-gray-900 placeholder:text-gray-400"
                  : "text-white placeholder:text-gray-500",
              )}
              aria-label="Search for services"
            />
          </form>
        </div>

        <div className="absolute bottom-10 left-1/2 z-[2] flex -translate-x-1/2 items-center gap-2 sm:bottom-12">
          {HERO_SLIDES.map((_, index) => {
            const active = index === heroSlideIndex;
            return (
              <button
                key={`explore-hero-dot-${index}`}
                type="button"
                aria-label={`Go to slide ${index + 1}`}
                onClick={() => setHeroSlideIndex(index)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  active ? "w-4 bg-red-600" : "w-2 bg-white/75 hover:bg-white",
                )}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}