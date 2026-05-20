import type { UserData } from "@/lib/api/client";

/** Minimal session shape for routing (avoids importing auth module at load time). */
export type PostLoginUser = {
  uid: string;
  email: string | null;
  emailVerified?: boolean;
  isGoogleOrAppleUser?: boolean;
};
import { isAuthEntryRoute } from "@/lib/auth/routeAccess";
import {
  isOnboardingFlowCompleteForNav,
  isSplashProfileComplete,
} from "@/lib/auth/profileGate";

export {
  isOnboardingFlowCompleteForNav,
  isSplashProfileComplete,
} from "@/lib/auth/profileGate";

/**
 * Flutter `ResolvePostLoginRouteUseCase` — order: email verify → onboarding → initial profile → app home.
 */
export function resolvePostLoginPath(
  user: PostLoginUser,
  userData: UserData | null | undefined,
  options?: { redirect?: string | null }
): string {
  if (!userData) return "/login";

  if (!user.isGoogleOrAppleUser && !user.emailVerified) {
    const email = encodeURIComponent((user.email || "").trim().toLowerCase());
    return `/email-confirmation?email=${email}`;
  }

  if (!isOnboardingFlowCompleteForNav(userData)) {
    return "/initial-profile-steps";
  }

  if (!isSplashProfileComplete(userData)) {
    return "/initial-profile";
  }

  const currentRole = userData.currentRole || userData.role;
  if (!currentRole) return "/initial-profile";

  const redirect = options?.redirect?.trim();
  if (
    redirect &&
    redirect.startsWith("/") &&
    !redirect.startsWith("//") &&
    !redirect.includes("://") &&
    !isAuthEntryRoute(redirect) &&
    redirect !== "/initial-profile-steps" &&
    redirect !== "/initial-profile"
  ) {
    return redirect;
  }

  const cr = String(currentRole).toLowerCase();
  if (cr === "provider" || cr === "both" || cr === "client+provider") {
    return "/provider-dashboard";
  }
  return "/client-home";
}

export async function navigateAfterAuth(
  router: { push: (path: string) => void; replace?: (path: string) => void },
  user: PostLoginUser,
  userData?: UserData | null,
  options?: { redirect?: string | null; replace?: boolean }
): Promise<void> {
  const { getUserData } = await import("@/lib/api/auth");
  const data = userData ?? (await getUserData(user.uid));
  const path = resolvePostLoginPath(user, data, { redirect: options?.redirect });
  if (options?.replace && router.replace) {
    router.replace(path);
  } else {
    router.push(path);
  }
}
