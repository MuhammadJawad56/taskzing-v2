"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Inbox } from "lucide-react";
import {
  resendEmailVerificationToEmail,
  getCurrentUser,
  signOut,
  type AuthUser,
} from "@/lib/api/auth";

function EmailConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryEmail = searchParams.get("email");

  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState("");
  const [resolvedEmail, setResolvedEmail] = useState<string>(queryEmail || "");

  // Mirrors the Flutter `email_confirmation_widget` post-frame logic.
  // 1. If a user is signed in but is a Google/Apple account, redirect them to
  //    sign-in (they should never see this screen).
  // 2. If the user is signed in with an unverified email/password account,
  //    sign them out so they stay logged out until they confirm their email.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const user: AuthUser | null = await getCurrentUser();
        if (cancelled) return;
        if (!user) return;
        if (!resolvedEmail && user.email) {
          setResolvedEmail(user.email);
        }
        if (user.isGoogleOrAppleUser) {
          router.replace("/login");
          return;
        }
        if (!user.emailVerified) {
          await signOut();
        }
      } catch {
        // ignore — user can still resend / continue manually
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, resolvedEmail]);

  const handleResend = async () => {
    setIsResending(true);
    setError("");
    setResendSuccess(false);
    try {
      const emailToUse = (resolvedEmail || queryEmail || "").trim();
      if (!emailToUse) {
        setError("Missing email address. Return to sign up and try again.");
        return;
      }
      await resendEmailVerificationToEmail(emailToUse);
      setResendSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to resend verification email. Please try again."
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleContinue = async () => {
    try {
      // Flutter signs the user out before sending them to sign-in.
      await signOut();
    } catch {
      // ignore
    }
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#013453]">
      {/* Header bar with logo (page-wide background, no card separation). */}
      <header className="bg-white dark:bg-[#013453]">
        <div className="flex h-[80px] items-center justify-center px-4">
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

      {/* Body */}
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto mt-[40px] sm:mt-[60px] w-full max-w-[600px] p-6 sm:p-10">
          <div className="flex flex-col items-center text-center">
            <Inbox
              className="h-14 w-14 sm:h-20 sm:w-20"
              style={{ color: "#FCC21B" }}
              aria-hidden
            />

            <h1 className="mt-2 text-[20px] sm:text-[28px] md:text-[32px] font-semibold text-[#F21A1A]">
              Email Confirmation
            </h1>

            <p className="mt-4 mb-8 px-2 text-sm sm:text-lg md:text-xl text-gray-700 dark:text-gray-200 leading-relaxed">
              We sent an email on{" "}
              <span className="font-bold text-[#F21A1A] break-all">
                {resolvedEmail || "your email address"}
              </span>{" "}
              Please check your email and confirm. We need to verify to complete your
              registration.
            </p>

            <div className="w-full border-t border-black dark:border-white" />

            <p className="mt-5 text-xs sm:text-base md:text-lg text-gray-700 dark:text-gray-200">
              If you did not receive any email,{" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="font-bold text-[#ED3326] hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isResending ? "Sending..." : "Resend Confirmation Email"}
              </button>
            </p>

            {resendSuccess ? (
              <p
                className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-200"
                role="status"
              >
                Verification email sent! Please check your inbox.
              </p>
            ) : null}

            {error ? (
              <p
                className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </div>
        </div>

        {/* Continue to Sign In button */}
        <div className="mt-8 flex justify-center pb-12">
          <button
            type="button"
            onClick={handleContinue}
            className="flex h-10 w-[210px] items-center justify-center rounded-[12px] bg-[#F21A1A] text-sm font-semibold text-white transition-colors hover:bg-[#d91515] sm:h-[60px] sm:w-[240px] sm:text-2xl"
          >
            Continue to Sign In
          </button>
        </div>
      </main>
    </div>
  );
}

export default function EmailConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#013453]">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-red-200 border-t-[#F21A1A]" />
        </div>
      }
    >
      <EmailConfirmationContent />
    </Suspense>
  );
}
