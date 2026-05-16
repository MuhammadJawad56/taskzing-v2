/**
 * Nest onboarding — matches Flutter `OnboardingRemoteDataSource`:
 * - `PATCH /users/me/onboarding` with step DTOs / complete DTO
 * - `PATCH /users/me` with `{ fullName }` only for step 2 name
 */

import { apiFetchJson, isBackendConfigured } from "./http";
import { AuthError } from "./auth";

function requireApi(): void {
  if (!isBackendConfigured()) {
    throw new AuthError("API is not configured.", "auth/configuration-error");
  }
}

/** Mirrors `OnboardingStepRequestDto.toJson()`. */
export async function submitOnboardingStep(params: {
  step: number;
  ageConfirmed?: boolean;
  aupAcknowledged?: boolean;
  privacyAgreed?: boolean;
}): Promise<void> {
  requireApi();
  const body: Record<string, unknown> = { step: params.step };
  if (params.ageConfirmed !== undefined) body.ageConfirmed = params.ageConfirmed;
  if (params.aupAcknowledged !== undefined) body.aupAcknowledged = params.aupAcknowledged;
  if (params.privacyAgreed !== undefined) body.privacyAgreed = params.privacyAgreed;

  const res = await apiFetchJson<unknown>("/users/me/onboarding", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new AuthError(res.message || "Onboarding step failed", "onboarding/step-failed");
  }
}

/** Mirrors `updateFullName` — only `fullName`, no extra client-only fields. */
export async function patchMeFullName(fullName: string): Promise<void> {
  requireApi();
  const trimmed = fullName.trim();
  if (!trimmed) {
    throw new AuthError("Full name is required.", "profile/full-name-required");
  }
  const res = await apiFetchJson<unknown>("/users/me", {
    method: "PATCH",
    body: JSON.stringify({ fullName: trimmed }),
  });
  if (!res.ok) {
    throw new AuthError(res.message || "Failed to update name", "profile/update-failed");
  }
}

/** Mirrors `OnboardingCompleteRequestDto.toJson()`. */
export async function completeOnboarding(
  finalAckAccurate: boolean,
  finalAckPolicies: boolean
): Promise<void> {
  requireApi();
  const res = await apiFetchJson<unknown>("/users/me/onboarding", {
    method: "PATCH",
    body: JSON.stringify({
      step: 5,
      completed: true,
      finalAckAccurate,
      finalAckPolicies,
    }),
  });
  if (!res.ok) {
    throw new AuthError(res.message || "Onboarding complete failed", "onboarding/complete-failed");
  }
}
