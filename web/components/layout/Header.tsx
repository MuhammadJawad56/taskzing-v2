"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/api/AuthContext";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguage } from "@/lib/contexts/LanguageContext";

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, userData, loading } = useAuth();
  const pathname = usePathname();
  const { t } = useLanguage();

  // Full-page auth UI provides its own branding (no duplicate top bar)
  if (pathname === "/login" || pathname === "/signup") {
    return null;
  }

  // Routes where this header should never appear (app shell has its own DashboardHeader)
  const isAppRoute =
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/client-home") ||
    pathname?.startsWith("/provider-dashboard") ||
    pathname?.startsWith("/googlemap") ||
    pathname?.startsWith("/post-task") ||
    pathname?.startsWith("/all-jobs") ||
    pathname?.startsWith("/messages") ||
    pathname?.startsWith("/initial-profile") ||
    pathname?.startsWith("/become-provider") ||
    pathname?.startsWith("/profile") ||
    pathname?.startsWith("/follower-manage") ||
    pathname?.startsWith("/work-details") ||
    pathname?.startsWith("/chats") ||
    pathname?.startsWith("/edit-profile") ||
    pathname?.startsWith("/my-profile") ||
    pathname?.startsWith("/provider-explore") ||
    pathname?.startsWith("/showcase-work") ||
    pathname?.startsWith("/reviews") ||
    pathname?.startsWith("/recently-viewed") ||
    pathname?.startsWith("/recent-searches") ||
    pathname?.startsWith("/notifications") ||
    pathname?.startsWith("/job-details") ||
    pathname?.startsWith("/job-proposals") ||
    pathname?.startsWith("/account-deletion") ||
    pathname?.startsWith("/change-password") ||
    pathname?.startsWith("/reels");

  // Explore routes only hide when the user is confirmed logged in (uses DashboardHeader)
  const isAuthExplore =
    !loading &&
    !!user &&
    (pathname?.startsWith("/explore") || pathname?.startsWith("/client-explore"));

  if (isAppRoute || isAuthExplore) {
    return null;
  }

  const isLandingPage = !pathname || pathname === "/";

  // Determine which auth buttons to show.
  // While loading: show Log in / Sign up (safe default — swaps to "Open app" once auth resolves).
  const isLoggedIn = !loading && !!user;
  const roleForRouting = String(userData?.currentRole || userData?.role || "").toLowerCase();
  const appHomeHref =
    roleForRouting === "provider" || roleForRouting === "both" || roleForRouting === "client+provider"
      ? "/provider-dashboard"
      : "/client-home";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-theme-accent2 bg-theme-primaryBackground dark:border-darkBlue-203 dark:bg-darkBlue-003">
      <div className="container mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex h-14 w-full items-center gap-2 sm:h-16 sm:gap-4">
          {/* Logo */}
          <Link href={isLoggedIn ? appHomeHref : "/"} className="flex shrink-0 items-center border-0">
            <Image
              src="/images/logos/Taskzing-Logo-light-mode_1.png"
              alt="TaskZing"
              width={140}
              height={40}
              className="h-8 w-auto max-w-[min(132px,42vw)] object-contain object-left dark:hidden sm:h-9 sm:max-w-none md:h-10"
              priority
              suppressHydrationWarning
            />
            <Image
              src="/images/logos/Taskzing-Logo-dark-mode_1.png"
              alt="TaskZing"
              width={140}
              height={40}
              className="hidden h-8 w-auto max-w-[min(132px,42vw)] object-contain object-left dark:block sm:h-9 sm:max-w-none md:h-10"
              priority
              suppressHydrationWarning
            />
          </Link>

          {/* Tablet+ nav links */}
          <nav className="hidden shrink-0 items-center gap-4 text-sm font-medium md:flex lg:gap-6">
            <Link
              href="/how-it-works"
              className="whitespace-nowrap text-theme-primaryText transition-colors hover:text-primary-500 dark:text-white dark:hover:text-primary-400"
            >
              {t("header.howItWorks")}
            </Link>
            <Link
              href="/about"
              className="whitespace-nowrap text-theme-primaryText transition-colors hover:text-primary-500 dark:text-white dark:hover:text-primary-400"
            >
              {t("header.about")}
            </Link>
          </nav>

          {/* Search — large screens only (hidden on landing; home uses hero discovery UI) */}
          {!isLandingPage && (
            <div className="mx-4 hidden min-w-0 max-w-md flex-1 lg:flex">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-theme-accent4 dark:text-gray-400" />
                <input
                  type="text"
                  placeholder={t("header.searchTasks")}
                  className="w-full rounded-lg border border-theme-accent2 bg-theme-primaryBackground py-2 pl-10 pr-4 text-theme-primaryText placeholder:text-theme-accent4 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-darkBlue-203 dark:bg-darkBlue-203 dark:text-white dark:placeholder:text-gray-400"
                />
              </div>
            </div>
          )}

          {/* Right: language (md+) + auth buttons + hamburger (< md) */}
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2 md:gap-3">
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>
            <div className="flex flex-nowrap items-center gap-1">
              {isLoggedIn ? (
                <Link href={appHomeHref} className="border-0">
                  <Button
                    variant="primary"
                    size="sm"
                    className="h-8 border-0 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm"
                  >
                    {t("header.openApp")}
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login" className="border-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 border-0 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
                    >
                      {t("header.logIn")}
                    </Button>
                  </Link>
                  <Link href="/signup" className="border-0">
                    <Button
                      variant="primary"
                      size="sm"
                      className="h-8 border-0 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm"
                    >
                      {t("header.signUp")}
                    </Button>
                  </Link>
                </>
              )}
            </div>
            <button
              type="button"
              className="flex shrink-0 rounded-lg border-0 p-2 text-theme-primaryText hover:bg-theme-accent2 dark:text-white dark:hover:bg-darkBlue-203 md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile / small tablet: extra links + language */}
        {isMenuOpen && (
          <div className="border-t border-theme-accent2 py-4 dark:border-darkBlue-203 md:hidden">
            <nav className="flex flex-col gap-3">
              <Link
                href="/how-it-works"
                className="text-sm font-medium text-theme-primaryText dark:text-white"
                onClick={() => setIsMenuOpen(false)}
              >
                {t("header.howItWorks")}
              </Link>
              <Link
                href="/about"
                className="text-sm font-medium text-theme-primaryText dark:text-white"
                onClick={() => setIsMenuOpen(false)}
              >
                {t("header.about")}
              </Link>
              <div className="border-t border-theme-accent2 pt-3 dark:border-darkBlue-203">
                <LanguageSwitcher />
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
