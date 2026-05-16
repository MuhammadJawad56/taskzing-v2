import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isAuthEntryRoute,
  isPublicRoute,
} from "@/lib/auth/routeAccess";

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

  if (isPublicRoute(pathname)) {
    if (isAuthenticated(request) && isAuthEntryRoute(pathname)) {
      const param =
        request.nextUrl.searchParams.get("redirect") ||
        request.nextUrl.searchParams.get("next");
      const dest = safeInternalRedirect(param) ?? "/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }
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
