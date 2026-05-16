"use client";

import { useAuth } from "@/lib/api/AuthContext";
import type { UserData } from "@/lib/api/auth";
import { useBrowserOnline } from "./useBrowserOnline";

function usesWorkAvailability(userData: UserData | null): boolean {
  if (!userData) return false;
  const r = userData.role;
  return r === "provider" || r === "both" || r === "client+provider";
}

export type AvailabilityStatusDot = {
  active: boolean;
  title: string;
};

/**
 * Status dot on the signed-in user's avatar: green when "Available For Work" is on
 * (same as dashboard toggle). Client-only accounts use browser tab + connectivity.
 */
export function useAvailabilityLinkedStatusDot(): AvailabilityStatusDot {
  const { userData } = useAuth();
  const browserOnline = useBrowserOnline();

  if (!userData) {
    return { active: false, title: "Offline" };
  }
  if (usesWorkAvailability(userData)) {
    const active = (userData as UserData & { availableFW?: boolean }).isAvailableForWork === true
      || (userData as UserData & { availableFW?: boolean }).availableFW === true;
    return {
      active,
      title: active ? "Available for work" : "Not available for work",
    };
  }
  return {
    active: browserOnline,
    title: browserOnline ? "Online" : "Offline",
  };
}
