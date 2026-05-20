import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isPublicRoute } from "@/lib/auth/routeAccess";

function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get("auth-token");
  return Boolean(token?.value?.trim());
}

function safeInternalRedirect(target: string | null): string | null {
  if (!target || !target.startsWith("/") || target.startsWith("//")) {
    return null;
  }
  if (target.includes("://")) return null;
  return target;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/site.webmanifest" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  // Public routes (login/signup/landing): do not redirect based on auth-token cookie alone.
  // Cookie can outlive JWT in localStorage; client validates session via /auth/me (see syncAuthSessionCookie).
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  if (!isAuthenticated(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|pdf|txt|html)$).*)",
  ],
};
