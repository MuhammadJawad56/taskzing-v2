"use client";

import { Footer } from "./Footer";
import { useAuth } from "@/lib/api/AuthContext";
import { usePathname } from "next/navigation";

export function ConditionalFooter() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  // Homepage includes its own marketing footer (QR, store badges, contact).
  if (pathname === "/") {
    return null;
  }

  if (pathname === "/login" || pathname === "/signup") {
    return null;
  }

  const isAppRoute =
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/provider-dashboard") ||
    pathname?.startsWith("/client-home") ||
    pathname?.startsWith("/client-explore") ||
    pathname?.startsWith("/become-provider") ||
    pathname?.startsWith("/initial-profile");
  
  // Always hide footer on authenticated app routes.
  if (isAppRoute) {
    return null;
  }

  // Also hide footer whenever a logged-in user is detected.
  if (!loading && user) {
    return null;
  }
  
  return <Footer />;
}

