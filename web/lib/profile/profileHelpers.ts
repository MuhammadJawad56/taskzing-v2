import type { User } from "@/lib/types/user";

export type ProfileTabId = "jobs" | "showcases" | "reviews";
export type ProfileJobFilter = "all" | "active" | "complete";

export function normalizeRole(role?: string | null): string {
  return String(role || "").trim().toLowerCase();
}

export function isClientRole(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === "client";
}

export function isProviderRole(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === "provider" || r === "both";
}

export function getViewedProfileRole(user: User | null): string {
  return normalizeRole(user?.currentRole || user?.role);
}

export function shouldShowShowcasesTab(
  viewerRole: string,
  viewedRole: string,
): boolean {
  const viewerIsClient = isClientRole(viewerRole) || viewerRole === "both";
  const viewerIsProvider = isProviderRole(viewerRole);
  const viewedIsProvider = isProviderRole(viewedRole);
  const viewedIsClient = isClientRole(viewedRole);

  if (viewerIsClient && viewedIsProvider) return true;
  if (viewerIsProvider && viewedIsProvider) return true;
  if (viewedIsClient) return false;
  return viewedIsProvider;
}

export function buildProfileTabs(viewerRole: string, viewedRole: string): ProfileTabId[] {
  const tabs: ProfileTabId[] = ["jobs"];
  if (shouldShowShowcasesTab(viewerRole, viewedRole)) {
    tabs.push("showcases");
  }
  tabs.push("reviews");
  return tabs;
}

export function getDefaultProfileTab(
  viewerRole: string,
  viewedRole: string,
): ProfileTabId {
  const tabs = buildProfileTabs(viewerRole, viewedRole);
  if (isProviderRole(viewerRole) && isProviderRole(viewedRole) && tabs.includes("jobs")) {
    return "jobs";
  }
  return tabs[0] ?? "jobs";
}

export function getAvatarShapeClass(_viewedRole?: string): string {
  return "rounded-full";
}

export function getProfileInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const first = trimmed.replace(/^@/, "").charAt(0);
  return first ? first.toUpperCase() : "?";
}
