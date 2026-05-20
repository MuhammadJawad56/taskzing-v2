import {
  getUserData,
  isOnboardingFlowCompleteForNav,
  type AuthUser,
  type UserData,
} from "@/lib/api/auth";
import { isAuthEntryRoute } from "@/lib/auth/routeAccess";

export type ProfileOnboardingMeta = {
  profileComplete?: boolean;
  missingFields?: string[];
  lockedFields?: string[];
  editableFields?: string[];
};

/** Flutter `splash_profile_complete.dart` + `profileCompleted` from API. */
export function isSplashProfileComplete(
  userData: UserData | null | undefined
): boolean {
  if (!userData) return false;

  if (userData.profileCompleted === true) return true;

  const onboarding = userData.onboarding;
  if (onboarding != null && typeof onboarding.profileComplete === "boolean") {
    return onboarding.profileComplete;
  }

  const fullName = String(userData.fullName || userData.name || "").trim();
  const username = String(userData.username || "").trim();
  const location = String(userData.location || "").trim();
  const description = String(
    userData.description || userData.bio || userData.about || ""
  ).trim();
  const role = userData.role;
  const currentRole = userData.currentRole;

  if (!fullName || !role || !currentRole || !username || !location || !description) {
    return false;
  }

  const isProvider =
    currentRole === "provider" ||
    currentRole === "both" ||
    role === "provider" ||
    role === "client+provider";

  if (isProvider) {
    const skills = userData.skills || [];
    if (skills.length === 0) return false;
  }

  return true;
}

/**
 * Flutter `ResolvePostLoginRouteUseCase` — order: email verify → onboarding → initial profile → app home.
 */
export function resolvePostLoginPath(
  user: AuthUser,
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
  user: AuthUser,
  userData?: UserData | null,
  options?: { redirect?: string | null; replace?: boolean }
): Promise<void> {
  const data = userData ?? (await getUserData(user.uid));
  const path = resolvePostLoginPath(user, data, { redirect: options?.redirect });
  if (options?.replace && router.replace) {
    router.replace(path);
  } else {
    router.push(path);
  }
}
