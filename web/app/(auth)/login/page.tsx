"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  signIn,
  signInWithGoogle,
  signInWithApple,
  handleOAuthRedirect,
  resendEmailVerification,
  signOut,
  setAuthCookie,
  AuthError,
  OAUTH_REDIRECT_PENDING_CODE,
  getSocialSignInErrorMessage,
  isTwoFactorLoginChallenge,
  completeTwoFactorSignIn,
  type TwoFactorLoginChallenge,
} from "@/lib/api/auth";
import { isBackendConfigured } from "@/lib/backendConfig";
import { isProfileComplete } from "@/lib/api/users";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import {
  AuthShell,
  AuthPillInput,
  AuthPasswordPill,
  AuthPrimaryButton,
  AuthSocialButton,
  GoogleIcon,
  AppleIcon,
} from "@/components/auth/AuthShell";
import { SocialAuthProviders } from "@/components/auth/SocialAuthProviders";

function LoginPageContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const postLoginRoute = "/client-explore";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [apiReady, setApiReady] = useState(true);
  const [twoFaChallenge, setTwoFaChallenge] = useState<TwoFactorLoginChallenge | null>(null);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [twoFaBackupCode, setTwoFaBackupCode] = useState("");
  const [twoFaUseBackup, setTwoFaUseBackup] = useState(false);

  useEffect(() => {
    const ready = isBackendConfigured();
    setApiReady(ready);
    if (!ready) {
      console.warn("[login] API base URL is not configured.");
    }
  }, []);

  useEffect(() => {
    handleOAuthRedirect()
      .then(async (result) => {
        if (result) {
          setAuthCookie(result.user);
          const profileComplete = await isProfileComplete(result.user.uid);
          if (!profileComplete) {
            router.push("/initial-profile-steps");
            return;
          }
          router.push(postLoginRoute);
        }
      })
      .catch((err) => {
        const msg = getSocialSignInErrorMessage(err, t);
        if (msg) setError(msg);
      });
  }, [router, postLoginRoute, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await signIn(email, password);

      if (isTwoFactorLoginChallenge(userCredential)) {
        setTwoFaChallenge(userCredential);
        setIsLoading(false);
        return;
      }

      if (
        !userCredential.user.isGoogleOrAppleUser &&
        !userCredential.user.emailVerified
      ) {
        try {
          await resendEmailVerification();
        } catch {
          // ignore
        }
        try {
          await signOut();
        } catch {
          // ignore
        }
        router.push(
          `/email-confirmation?email=${encodeURIComponent(email.trim().toLowerCase())}`
        );
        return;
      }

      setAuthCookie(userCredential.user);

      const profileComplete = await isProfileComplete(
        userCredential.user.uid
      );
      if (!profileComplete) {
        router.push("/initial-profile-steps");
        return;
      }
      router.push(postLoginRoute);
    } catch (err) {
      if (err instanceof AuthError && err.code === "auth/email-not-verified") {
        router.push(
          `/email-confirmation?email=${encodeURIComponent(email.trim().toLowerCase())}`
        );
        return;
      }
      setError(err instanceof Error ? err.message : t("auth.errorOccurred"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFaChallenge) return;
    const backup = twoFaUseBackup ? twoFaBackupCode.trim() : "";
    const code = !twoFaUseBackup ? twoFaCode.trim() : "";
    if (!backup && !code) return;
    setError("");
    setIsLoading(true);
    try {
      const userCredential = await completeTwoFactorSignIn(
        twoFaChallenge.twoFactorToken,
        { code: code || undefined, backupCode: backup || undefined }
      );
      setAuthCookie(userCredential.user);
      setTwoFaChallenge(null);
      setTwoFaCode("");
      setTwoFaBackupCode("");
      setTwoFaUseBackup(false);
      const profileComplete = await isProfileComplete(userCredential.user.uid);
      if (!profileComplete) {
        router.push("/initial-profile-steps");
        return;
      }
      router.push(postLoginRoute);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.errorOccurred"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    console.info("[login] Continue with Google clicked");
    setError("");
    setIsGoogleLoading(true);
    try {
      const userCredential = await signInWithGoogle();
      if (isTwoFactorLoginChallenge(userCredential)) {
        setTwoFaChallenge(userCredential);
        return;
      }
      setAuthCookie(userCredential.user);
      const profileComplete = await isProfileComplete(userCredential.user.uid);
      if (!profileComplete) {
        router.push("/initial-profile-steps");
        return;
      }
      router.push(postLoginRoute);
    } catch (err) {
      if (err instanceof AuthError && err.code === OAUTH_REDIRECT_PENDING_CODE) {
        return;
      }
      console.error("Google Sign-in Error:", err);
      const msg = getSocialSignInErrorMessage(err, t);
      if (msg) setError(msg);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    console.info("[login] Continue with Apple clicked");
    setError("");
    setIsAppleLoading(true);
    try {
      const userCredential = await signInWithApple();
      if (isTwoFactorLoginChallenge(userCredential)) {
        setTwoFaChallenge(userCredential);
        return;
      }
      setAuthCookie(userCredential.user);
      const profileComplete = await isProfileComplete(userCredential.user.uid);
      if (!profileComplete) {
        router.push("/initial-profile-steps");
        return;
      }
      router.push(postLoginRoute);
    } catch (err) {
      if (err instanceof AuthError && err.code === OAUTH_REDIRECT_PENDING_CODE) {
        return;
      }
      console.error("Apple Sign-in Error:", err);
      const msg = getSocialSignInErrorMessage(err, t);
      if (msg) setError(msg);
    } finally {
      setIsAppleLoading(false);
    }
  };

  const busy = isGoogleLoading || isAppleLoading;

  return (
    <AuthShell mode="login" subtitle="Enter your Credentials to access your Account">
      <>
        {!apiReady ? (
          <div
            className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 px-4 py-3 text-sm text-amber-800 dark:text-amber-200 mb-4"
            role="alert"
          >
            API base URL is not configured. Set <code>NEXT_PUBLIC_API_BASE_URL</code> in{" "}
            <code>.env.local</code> if you are not using the default production backend.
          </div>
        ) : null}
        {error ? (
          <div
            className="rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 px-4 py-3 text-sm text-red-700 dark:text-red-200 mb-4"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <form
          onSubmit={twoFaChallenge ? handleTwoFactorSubmit : handleSubmit}
          className="min-w-0 space-y-4"
        >
          {twoFaChallenge ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Enter the verification code sent to your email ({twoFaChallenge.method}).
            </p>
          ) : null}
          <AuthPillInput
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required={!twoFaChallenge}
            readOnly={!!twoFaChallenge}
            autoComplete="email"
            aria-label={t("auth.email")}
          />

          {twoFaChallenge ? (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={twoFaUseBackup}
                  onChange={(e) => {
                    setTwoFaUseBackup(e.target.checked);
                    setTwoFaCode("");
                    setTwoFaBackupCode("");
                  }}
                  className="rounded"
                />
                {t("twoFa.useBackupCode")}
              </label>
              {twoFaUseBackup ? (
                <AuthPillInput
                  type="text"
                  placeholder={t("twoFa.backupCode")}
                  value={twoFaBackupCode}
                  onChange={(e) => setTwoFaBackupCode(e.target.value)}
                  required
                  autoComplete="off"
                  aria-label={t("twoFa.backupCode")}
                />
              ) : (
                <AuthPillInput
                  type="text"
                  inputMode="numeric"
                  placeholder="6-digit code"
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  autoComplete="one-time-code"
                  aria-label="Two-factor code"
                />
              )}
            </div>
          ) : (
          <div className="space-y-2">
            <AuthPasswordPill
              placeholder="Password"
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggleShow={() => setShowPassword((s) => !s)}
              autoComplete="current-password"
            />
            <div className="flex w-full justify-end">
              <Link
                href="/forgot-password"
                className="text-sm font-normal text-[#F21A1A] hover:underline sm:text-base"
              >
                {t("auth.forgotPassword")}
              </Link>
            </div>
          </div>
          )}

          <div className="flex justify-center pt-2">
            <button
              type="submit"
              disabled={busy || isLoading}
              className="flex h-[51px] w-[165px] items-center justify-center gap-2 rounded-2xl bg-[#F21A1A] text-base font-semibold text-white transition-colors hover:bg-[#d91515] disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:w-[210px] sm:text-lg lg:w-full lg:rounded-full"
            >
              {isLoading ? (
                <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : null}
              {twoFaChallenge ? "Verify code" : t("auth.signIn")}
            </button>
          </div>

          {twoFaChallenge ? (
            <button
              type="button"
              className="w-full text-center text-sm text-[#F21A1A] hover:underline"
              onClick={() => {
                setTwoFaChallenge(null);
                setTwoFaCode("");
              }}
            >
              Back to password
            </button>
          ) : (
            <>
          <p className="px-1 pt-1 text-center text-base font-medium text-black dark:text-white sm:text-lg">
            Don&apos;t have an Account?{" "}
            <Link href="/signup" className="font-semibold text-[#F21A1A] hover:underline">
              Sign Up
            </Link>
          </p>

          <p className="py-2 text-center text-base font-semibold text-black dark:text-white">
            {t("common.or")}
          </p>

          <div className="relative z-20 space-y-3">
            <AuthSocialButton
              onClick={handleGoogleSignIn}
              disabled={isLoading || busy}
              loading={isGoogleLoading}
              icon={<GoogleIcon />}
              label={isGoogleLoading ? t("auth.signingIn") : t("auth.continueWithGoogle")}
            />
            <AuthSocialButton
              onClick={handleAppleSignIn}
              disabled={isLoading || busy}
              loading={isAppleLoading}
              icon={<AppleIcon />}
              label={isAppleLoading ? t("auth.signingIn") : t("auth.continueWithApple")}
            />
          </div>
            </>
          )}
        </form>
      </>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <SocialAuthProviders>
      <Suspense
        fallback={
          <AuthShell mode="login" subtitle="Enter your Credentials to access your Account">
            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              Loading…
            </div>
          </AuthShell>
        }
      >
        <LoginPageContent />
      </Suspense>
    </SocialAuthProviders>
  );
}

