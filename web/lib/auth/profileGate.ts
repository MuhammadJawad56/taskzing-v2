import type { UserData } from "@/lib/api/client";

/** Flutter `nav.dart`: `onboardingCompletedAt != null && onboardingStep >= 4`, plus legacy `onboardingStepsCompleted`. */
export function isOnboardingFlowCompleteForNav(
  d: UserData | null | undefined
): boolean {
  if (!d) return false;
  const step = d.onboardingStep ?? 0;
  const flutterDone = Boolean(d.onboardingCompletedAt) && step >= 4;
  return flutterDone || Boolean(d.onboardingStepsCompleted);
}

/** Flutter `OnboardingStateEntity` completion from `onboarding_mapper.dart`. */
export function isOnboardingEntityCompleted(
  d: UserData | null | undefined
): boolean {
  if (!d) return false;
  const step = d.onboardingStep ?? 0;
  return Boolean(d.onboardingCompletedAt) && step >= 4;
}

/** Flutter `OnboardingCubit._nextUiStepFromBackendStep` including completed → 5. */
export function nextUiOnboardingStepFromBackend(
  backendStep: number,
  entityCompleted: boolean
): 1 | 2 | 3 | 4 | 5 {
  if (entityCompleted) return 5;
  const normalized = backendStep <= 0 ? 1 : backendStep + 1;
  return (normalized > 5 ? 5 : normalized) as 1 | 2 | 3 | 4 | 5;
}

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
