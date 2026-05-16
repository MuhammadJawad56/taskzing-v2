/**
 * Anonymous access allowlist. Everything else requires a session (see middleware + AuthProvider).
 */

function normalizePath(pathname: string): string {
  if (!pathname) return "/";
  const p = pathname.replace(/\/$/, "");
  return p === "" ? "/" : p;
}

export function isPublicRoute(pathname: string): boolean {
  const p = normalizePath(pathname);

  if (p === "/") return true;

  const exactPublic = new Set([
    "/login",
    "/signup",
    "/forgot-password",
    "/new-password",
    "/reset-password",
    "/verify-email",
    "/email-confirmation",
    "/change-password",
    "/privacy-policy",
    "/terms-conditions",
    "/categories",
    "/about",
    "/pricing",
    "/blog",
    "/how-it-works",
    "/robots.txt",
    "/sitemap.xml",
  ]);

  if (exactPublic.has(p)) return true;

  const publicPrefixes = ["/category/", "/freelancer/", "/task/"];
  if (publicPrefixes.some((pre) => p.startsWith(pre))) return true;

  return false;
}

/** Logged-in users are redirected away from these (to avoid loops, use redirect search param when present). */
export function isAuthEntryRoute(pathname: string): boolean {
  const p = normalizePath(pathname);
  return (
    p === "/login" ||
    p === "/signup" ||
    p === "/forgot-password" ||
    p === "/new-password" ||
    p === "/reset-password" ||
    p === "/verify-email" ||
    p === "/change-password"
  );
}
