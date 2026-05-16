"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { completePasswordReset, AuthError } from "@/lib/api/auth";

function NewPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token?.trim()) {
      setError("Reset link is invalid or expired. Request a new reset email.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      await completePasswordReset(token, password);
      setIsSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setError(
        err instanceof AuthError
          ? err.message
          : "Could not reset password. Try again or request a new link."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-primaryBackground py-12 px-4 sm:px-6 lg:px-8 dark:bg-darkBlue-003">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-accent-success/20 rounded-full flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-accent-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <CardTitle>Password Reset Successful</CardTitle>
              <CardDescription>Your password has been reset successfully</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-theme-accent4 text-center mb-4 dark:text-white/80">
                Redirecting to login page...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-primaryBackground py-12 px-4 sm:px-6 lg:px-8 dark:bg-darkBlue-003">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-theme-primaryText dark:text-white">
            Set New Password
          </h2>
          <p className="mt-2 text-center text-sm text-theme-accent4 dark:text-white/80">
            Enter your new password below
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>New Password</CardTitle>
            <CardDescription>Create a strong password for your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!token?.trim() && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900" role="status">
                  This page needs a reset token from your email.{" "}
                  <Link href="/forgot-password" className="underline font-medium">
                    Request a new link
                  </Link>
                  .
                </div>
              )}
              {error && (
                <div className="p-3 bg-red-50 border border-accent-error rounded-lg text-sm text-accent-error" role="alert">
                  {error}
                </div>
              )}
              <Input
                label="New Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                helperText="Must be at least 6 characters"
                aria-label="New password"
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                aria-label="Confirm new password"
              />
              <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
                Reset Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function NewPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-theme-primaryBackground dark:bg-darkBlue-003">
          <p className="text-theme-accent4 dark:text-white/80">Loading…</p>
        </div>
      }
    >
      <NewPasswordPageContent />
    </Suspense>
  );
}
