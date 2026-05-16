"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { resetPassword } from "@/lib/api/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await resetPassword(email);
      setIsSubmitted(true);
    } catch (err) {
      if (err instanceof Error && err.message.includes("user-not-found")) {
          setIsSubmitted(true);
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-primaryBackground py-12 px-4 sm:px-6 lg:px-8 dark:bg-darkBlue-003">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Check your email</CardTitle>
              <CardDescription>We've sent password reset instructions to your email</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-theme-accent4 dark:text-white/80">
                  If an account exists with {email}, you will receive password reset instructions shortly.
                </p>
                <Link href="/login">
                  <Button variant="primary" size="lg" className="w-full">
                    Back to Login
                  </Button>
                </Link>
              </div>
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
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-theme-accent4 dark:text-white/80">
            Remember your password?{" "}
            <Link href="/login" className="font-medium text-primary-500 hover:text-primary-600">
              Sign in
            </Link>
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Forgot Password</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you instructions to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-accent-error rounded-lg text-sm text-accent-error" role="alert">
                  {error}
                </div>
              )}
              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                aria-label="Email address"
              />
              <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
                Send Reset Instructions
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

