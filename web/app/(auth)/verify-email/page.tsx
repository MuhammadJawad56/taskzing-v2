"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { verifyEmailToken, AuthError } from "@/lib/api/auth";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const redirect = searchParams.get("redirect") || "/client-explore";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token?.trim()) {
      setStatus("error");
      setMessage("Missing verification token. Open the link from your email, or request a new one.");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        await verifyEmailToken(token);
        if (cancelled) return;
        setStatus("success");
        setMessage("Your email is verified. Redirecting…");
        setTimeout(() => router.replace(redirect), 1200);
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          e instanceof AuthError
            ? e.message
            : "We could not verify your email. The link may have expired."
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, redirect, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-primaryBackground py-12 px-4 dark:bg-darkBlue-003">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Verifying your email</CardTitle>
            <CardDescription>Please wait…</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-primaryBackground py-12 px-4 dark:bg-darkBlue-003">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-accent-success/20 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-accent-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <CardTitle>Email verified</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-primaryBackground py-12 px-4 dark:bg-darkBlue-003">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Verification failed</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-theme-accent4 dark:text-white/80">
          <p>
            <Link href="/email-confirmation" className="text-accent-primary font-medium underline">
              Resend verification email
            </Link>{" "}
            or return to{" "}
            <Link href="/login" className="text-accent-primary font-medium underline">
              sign in
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-theme-primaryBackground dark:bg-darkBlue-003">
          <p className="text-theme-accent4 dark:text-white/80">Loading…</p>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
