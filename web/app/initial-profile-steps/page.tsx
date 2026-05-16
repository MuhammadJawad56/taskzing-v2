"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/api/AuthContext";
import {
  getUserData,
  isOnboardingEntityCompleted,
  isOnboardingFlowCompleteForNav,
  nextUiOnboardingStepFromBackend,
} from "@/lib/api/auth";
import {
  completeOnboarding,
  patchMeFullName,
  submitOnboardingStep,
} from "@/lib/api/onboarding";

type Step = 1 | 2 | 3 | 4 | 5;

export default function InitialProfileStepsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [serverOnboardingStep, setServerOnboardingStep] = useState(0);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [fullName, setFullName] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  const [agreeAge, setAgreeAge] = useState(false);
  const [agreeTermsAndUse, setAgreeTermsAndUse] = useState(false);
  const [agreePrivacyCollection, setAgreePrivacyCollection] = useState(false);
  const [confirmAccurateInfo, setConfirmAccurateInfo] = useState(false);
  const [agreeCommunityUse, setAgreeCommunityUse] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  const refreshServerStep = useCallback(async () => {
    if (!user) return;
    const data = await getUserData(user.uid);
    if (data) {
      setServerOnboardingStep(data.onboardingStep ?? 0);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await getUserData(user.uid);
        if (cancelled) return;

        if (data?.profileCompleted) {
          const role = data.role || "";
          const currentRole = data.currentRole || "";
          if (role === "client" && currentRole === "client") {
            router.replace("/client-home");
          } else {
            router.replace("/dashboard");
          }
          return;
        }

        if (data && isOnboardingFlowCompleteForNav(data)) {
          router.replace("/initial-profile");
          return;
        }

        if (data) {
          const backendStep = data.onboardingStep ?? 0;
          const entityCompleted = isOnboardingEntityCompleted(data);
          const uiStep = nextUiOnboardingStepFromBackend(backendStep, entityCompleted);
          setServerOnboardingStep(backendStep);
          setCurrentStep(uiStep);
          if (uiStep > 1) {
            setAgreeAge(true);
          }
          const initialName = String(data.fullName || user.displayName || "").trim();
          if (initialName) {
            setFullName(initialName);
          }
        }
      } catch {
        // Keep user on this screen. They can still proceed.
      } finally {
        if (!cancelled) {
          setBootstrapped(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, router]);

  const progress = useMemo(() => (currentStep / 5) * 100, [currentStep]);

  const stepCanContinue = useMemo(() => {
    if (currentStep === 1) return agreeAge;
    if (currentStep === 2) return fullName.trim().length >= 2;
    if (currentStep === 3) return true;
    if (currentStep === 4) return agreeTermsAndUse && agreePrivacyCollection;
    return confirmAccurateInfo && agreeCommunityUse;
  }, [
    currentStep,
    agreeAge,
    fullName,
    agreeTermsAndUse,
    agreePrivacyCollection,
    confirmAccurateInfo,
    agreeCommunityUse,
  ]);

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => (s - 1) as Step);
      return;
    }
    router.back();
  };

  const handleContinue = async () => {
    setError("");

    if (currentStep === 2) {
      const trimmed = fullName.trim();
      const fullNameRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
      if (!fullNameRegex.test(trimmed)) {
        setError("Enter a valid full name using only letters and spaces.");
        return;
      }
    }

    if (!user) {
      setError("Please sign in to continue.");
      return;
    }

    setIsBusy(true);
    try {
      if (currentStep === 1) {
        if (serverOnboardingStep < 1) {
          await submitOnboardingStep({ step: 1, ageConfirmed: agreeAge });
        }
        await refreshServerStep();
        setCurrentStep(2);
        return;
      }
      if (currentStep === 2) {
        if (serverOnboardingStep < 2) {
          await patchMeFullName(fullName.trim());
          await submitOnboardingStep({ step: 2 });
        }
        await refreshServerStep();
        setCurrentStep(3);
        return;
      }
      if (currentStep === 3) {
        if (serverOnboardingStep < 3) {
          await submitOnboardingStep({ step: 3, aupAcknowledged: true });
        }
        await refreshServerStep();
        setCurrentStep(4);
        return;
      }
      if (currentStep === 4) {
        if (serverOnboardingStep < 4) {
          await submitOnboardingStep({ step: 4, privacyAgreed: agreePrivacyCollection });
        }
        await refreshServerStep();
        setCurrentStep(5);
        return;
      }
      const fresh = await getUserData(user.uid);
      if (!fresh || !isOnboardingFlowCompleteForNav(fresh)) {
        await completeOnboarding(confirmAccurateInfo, agreeCommunityUse);
      }
      router.push("/initial-profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to continue.");
    } finally {
      setIsBusy(false);
    }
  };

  if (authLoading || !user || !bootstrapped) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] dark:bg-[#013453]">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-red-200 border-t-[#F21A1A]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#013453]">
      <header
        className="bg-white dark:bg-[#013453] relative"
        style={{
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
          boxShadow: "0 3px 6px rgba(0,0,0,0.2)",
        }}
      >
        <div className="flex h-[80px] items-center justify-center px-4">
          <button
            type="button"
            onClick={handleBack}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="h-6 w-6 text-gray-800 dark:text-white" />
          </button>
          <Link href="/" className="inline-flex items-center" aria-label="TaskZing home">
            <Image
              src="/images/logos/Taskzing-Logo-light-mode_1.png"
              alt="TaskZing"
              width={300}
              height={78}
              className="h-[26px] w-auto sm:h-[34px] md:h-[42px] dark:hidden"
              priority
            />
            <Image
              src="/images/logos/Taskzing-Logo-dark-mode_1.png"
              alt="TaskZing"
              width={300}
              height={78}
              className="hidden h-[26px] w-auto sm:h-[34px] md:h-[42px] dark:block"
              priority
            />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[460px] px-5 py-5 sm:px-6 sm:max-w-[520px]">
        <p className="text-[18px] font-semibold leading-none text-gray-900 dark:text-white sm:text-[24px]">
          Step {currentStep} of 5
        </p>
        <div className="mt-4 h-[8px] w-full overflow-hidden rounded-full bg-gray-300 dark:bg-white/20">
          <div
            className="h-full rounded-full bg-[#F21A1A] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {error ? (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/60 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </p>
        ) : null}

        <section className="mt-9 space-y-4">
          {currentStep === 1 ? (
            <>
              <h1 className="text-[40px] font-semibold leading-[1.05] text-gray-900 dark:text-white sm:text-[52px]">
                Hello, I&apos;m TaskZing
              </h1>
              <p className="text-[20px] leading-tight text-gray-700 dark:text-gray-200 sm:text-[28px]">
                Next-generation AI job platform for job seekers, clients, and freelancers.
              </p>
              <label className="mt-10 flex items-start gap-3 text-[16px] leading-tight text-gray-800 dark:text-gray-100 sm:gap-4 sm:text-[22px]">
                <input
                  type="checkbox"
                  checked={agreeAge}
                  onChange={(e) => setAgreeAge(e.target.checked)}
                  className="mt-1.5 h-4 w-4 accent-[#F21A1A] sm:mt-2 sm:h-6 sm:w-6"
                />
                <span>I confirm I am at least 18 years of age.</span>
              </label>
            </>
          ) : null}

          {currentStep === 2 ? (
            <>
              <h1 className="text-[40px] font-semibold leading-[1.05] text-gray-900 dark:text-white sm:text-[52px]">Your Full Name</h1>
              <p className="text-[20px] leading-tight text-gray-700 dark:text-gray-200 sm:text-[28px]">
                You can change your name once in Initial Profile and once in Edit Profile.
              </p>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                className="mt-5 w-full rounded-3xl border-2 border-gray-500 bg-[#f7f7f7] px-4 py-4 text-[18px] text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F21A1A]/40 sm:text-[24px] dark:border-white/70 dark:bg-[#0f4567] dark:text-white dark:placeholder:text-gray-300"
              />
            </>
          ) : null}

          {currentStep === 3 ? (
            <>
              <h1 className="text-[40px] font-semibold leading-[1.05] text-gray-900 dark:text-white sm:text-[52px]">Acceptable Use</h1>
              <p className="text-[20px] leading-tight text-gray-700 dark:text-gray-200 sm:text-[28px]">
                TaskZing&apos;s{" "}
                <Link
                  href="/terms-conditions"
                  className="font-semibold text-[#cc2f2f] underline"
                >
                  Acceptable Use Policy
                </Link>{" "}
                prohibits use of TaskZing for harm, including sharing violent, abusive, or deceptive information, etc.
              </p>
              <div className="mt-4 flex items-start gap-3 text-[16px] leading-tight text-gray-700 dark:text-gray-200 sm:text-[20px]">
                <AlertTriangle className="mt-1 h-6 w-6 text-green-600 dark:text-green-400" />
                <p>
                  TaskZing regularly reviews information flagged for abusive content and uses it to improve and keep the job community safe.
                </p>
              </div>
            </>
          ) : null}

          {currentStep === 4 ? (
            <>
              <h1 className="text-[40px] font-semibold leading-[1.05] text-gray-900 dark:text-white sm:text-[52px]">
                Terms &amp; Conditions
              </h1>
              <p className="text-[20px] leading-tight text-gray-700 dark:text-gray-200 sm:text-[28px]">
                Please read and accept the following to continue.
              </p>
              <label className="mt-8 flex items-start gap-3 text-[16px] leading-tight text-gray-800 dark:text-gray-100 sm:gap-4 sm:text-[20px]">
                <input
                  type="checkbox"
                  checked={agreeTermsAndUse}
                  onChange={(e) => setAgreeTermsAndUse(e.target.checked)}
                  className="mt-1.5 h-4 w-4 accent-[#F21A1A] sm:mt-2 sm:h-6 sm:w-6"
                />
                <span>
                  I agree to TaskZing&apos;s{" "}
                  <Link href="/terms-conditions" className="font-semibold text-[#cc2f2f] underline">
                    Consumer Terms
                  </Link>
                  {" "}and{" "}
                  <Link href="/terms-conditions" className="font-semibold text-[#cc2f2f] underline">
                    Acceptable Use Policy
                  </Link>{" "}
                  and confirm that I am at least 18 years of age.
                </span>
              </label>
              <label className="mt-3 flex items-start gap-3 text-[16px] leading-tight text-gray-800 dark:text-gray-100 sm:gap-4 sm:text-[20px]">
                <input
                  type="checkbox"
                  checked={agreePrivacyCollection}
                  onChange={(e) => setAgreePrivacyCollection(e.target.checked)}
                  className="mt-1.5 h-4 w-4 accent-[#F21A1A] sm:mt-2 sm:h-6 sm:w-6"
                />
                <span>
                  I consent to the collection and use of my personal information in accordance
                  with the{" "}
                  <Link href="/privacy-policy" className="font-semibold text-[#cc2f2f] underline">
                    App Privacy Policy
                  </Link>
                  .
                </span>
              </label>
            </>
          ) : null}

          {currentStep === 5 ? (
            <>
              <h1 className="text-[40px] font-semibold leading-[1.05] text-gray-900 dark:text-white sm:text-[52px]">Almost done</h1>
              <p className="text-[20px] leading-tight text-gray-700 dark:text-gray-200 sm:text-[28px]">
                Please confirm the following to finish setup.
              </p>
              <label className="mt-8 flex items-start gap-3 text-[16px] leading-tight text-gray-800 dark:text-gray-100 sm:gap-4 sm:text-[20px]">
                <input
                  type="checkbox"
                  checked={confirmAccurateInfo}
                  onChange={(e) => setConfirmAccurateInfo(e.target.checked)}
                  className="mt-1.5 h-4 w-4 accent-[#F21A1A] sm:mt-2 sm:h-6 sm:w-6"
                />
                <span>I confirm that the information I provided is accurate.</span>
              </label>
              <label className="mt-3 flex items-start gap-3 text-[16px] leading-tight text-gray-800 dark:text-gray-100 sm:gap-4 sm:text-[20px]">
                <input
                  type="checkbox"
                  checked={agreeCommunityUse}
                  onChange={(e) => setAgreeCommunityUse(e.target.checked)}
                  className="mt-1.5 h-4 w-4 accent-[#F21A1A] sm:mt-2 sm:h-6 sm:w-6"
                />
                <span>I agree to use TaskZing in line with its policies and community standards.</span>
              </label>
            </>
          ) : null}
        </section>

        <div className="mt-10 pb-8">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!stepCanContinue || isBusy}
            className="flex h-[56px] w-full items-center justify-center rounded-[16px] bg-[#F21A1A] text-[20px] font-semibold text-white transition-colors hover:bg-[#d91515] disabled:cursor-not-allowed disabled:bg-[#a9a9a9] sm:h-[64px] sm:rounded-[18px] sm:text-[28px]"
          >
            {isBusy
              ? "Saving..."
              : currentStep === 3
                ? "Acknowledge & Continue"
                : "Continue"}
          </button>
        </div>
      </main>
    </div>
  );
}
