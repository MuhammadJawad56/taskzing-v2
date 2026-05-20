"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  signUp,
  signInWithGoogle,
  signInWithApple,
  handleOAuthRedirect,
  getUserData,
  AuthError,
  OAUTH_REDIRECT_PENDING_CODE,
  getSocialSignInErrorMessage,
  isTwoFactorLoginChallenge,
  setAuthCookie,
} from "@/lib/api/auth";
import { navigateAfterAuth } from "@/lib/auth/postLoginNavigation";
import { isBackendConfigured } from "@/lib/backendConfig";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { CreditCard, X } from "lucide-react";
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
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
// Initialize Stripe lazily
let stripePromise: Promise<any> | null = null;

const getStripePromise = (): Promise<any> | null => {
  if (typeof window === "undefined") return null;

  // Return cached promise if already initialized
  if (stripePromise !== null) return stripePromise;

  const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!stripeKey || stripeKey === "pk_test_your_publishable_key_here" || !stripeKey.startsWith("pk_")) {
    return null;
  }

  try {
    stripePromise = loadStripe(stripeKey).catch((error) => {
      console.warn("Stripe.js failed to load. Payment features will be unavailable:", error);
      stripePromise = null; // Reset on error so we can retry
      return null;
    });
    return stripePromise;
  } catch (error) {
    console.warn("Failed to initialize Stripe:", error);
    return null;
  }
};

const cardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "#1f2937",
      fontFamily: '"Inter", sans-serif',
      "::placeholder": {
        color: "#9ca3af",
      },
    },
    invalid: {
      color: "#ef4444",
    },
  },
  hidePostalCode: false,
};

// Payment Card Form Component
function PaymentCardForm({
  onSuccess,
  onCancel,
  userId
}: {
  onSuccess: () => void;
  onCancel: () => void;
  userId?: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardholderName, setCardholderName] = useState("");

  const handleCardChange = (event: any) => {
    setCardError(event.error ? event.error.message : null);
    setCardComplete(event.complete);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    if (!cardholderName.trim()) {
      setCardError("Please enter the cardholder name");
      return;
    }

    setIsProcessing(true);
    setCardError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setIsProcessing(false);
      return;
    }

    try {
      // Create payment method
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: {
          name: cardholderName,
        },
      });

      if (pmError) {
        setCardError(pmError.message || "An error occurred");
        setIsProcessing(false);
        return;
      }

      if (!paymentMethod) {
        setCardError("Failed to create payment method");
        setIsProcessing(false);
        return;
      }

      // Charge $1.00 for provider verification
      const chargeResponse = await fetch("/api/stripe/charge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          amount: 100, // $1.00 in cents
          userId: userId || "temp",
        }),
      });

      const chargeData = await chargeResponse.json();

      if (!chargeResponse.ok || !chargeData.success) {
        setCardError(chargeData.error || "Failed to process payment");
        setIsProcessing(false);
        return;
      }

      onSuccess();
    } catch (err: any) {
      console.error("Error processing payment:", err);
      setCardError(err.message || "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Add Payment Card</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 font-medium">
            Pay $1.00 and verify your identity to become a Provider.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cardholder Name
            </label>
            <input
              type="text"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Card Details
            </label>
            <div className="p-4 border border-gray-300 rounded-lg bg-white">
              <CardElement options={cardElementOptions} onChange={handleCardChange} />
            </div>
            {cardError && (
              <p className="mt-2 text-sm text-red-600">{cardError}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!stripe || isProcessing || !cardComplete}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Add card
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SignupPageContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [apiReady, setApiReady] = useState(true);
  const oauthBusy = isGoogleLoading || isAppleLoading;
  const [signUpAs, setSignUpAs] = useState<"client" | "client+provider">(
    (roleParam === "provider" ? "client+provider" : "client") as "client" | "client+provider"
  );
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  const [currentStripePromise, setCurrentStripePromise] = useState<Promise<any> | null>(null);

  // Initialize Stripe promise when component mounts
  useEffect(() => {
    const promise = getStripePromise();
    if (promise) {
      setCurrentStripePromise(promise);
    }
  }, []);

  useEffect(() => {
    const ready = isBackendConfigured();
    setApiReady(ready);
    if (!ready) {
      console.warn("[signup] API base URL is not configured.");
    }
  }, []);

  // Complete Google / Apple sign-in after redirect (e.g. popup blocked)
  useEffect(() => {
    handleOAuthRedirect()
      .then(async (result) => {
        if (result) {
          setAuthCookie(result.user);
          await navigateAfterAuth(router, result.user);
        }
      })
      .catch((err) => {
        const msg = getSocialSignInErrorMessage(err, t);
        if (msg) setError(msg);
      });
  }, [router, t]);

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case "auth/email-already-in-use":
        return "This email is already registered. Please sign in instead.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/operation-not-allowed":
        return "Email/password accounts are not enabled.";
      case "auth/weak-password":
        return "Password should be at least 6 characters.";
      case "auth/popup-closed-by-user":
        return "Sign-in popup was closed.";
      case "auth/cancelled-popup-request":
        return "Sign-in was cancelled.";
      case "auth/account-exists-with-different-credential":
        return "An account already exists with this email.";
      case "auth/invalid-credential":
        return "Invalid credentials.";
      default:
        return "An error occurred. Please try again.";
    }
  };

  const handleGoogleSignUp = async () => {
    console.info("[signup] Continue with Google clicked");
    setError("");
    setIsGoogleLoading(true);

    try {
      const signupRole =
        signUpAs === "client+provider" ? "client+provider" : "client";
      const userCredential = await signInWithGoogle({
        pendingSignupRole: signupRole,
      });
      if (isTwoFactorLoginChallenge(userCredential)) {
        router.push("/login");
        return;
      }
      setAuthCookie(userCredential.user);
      await navigateAfterAuth(router, userCredential.user);
    } catch (err) {
      if (err instanceof AuthError && err.code === OAUTH_REDIRECT_PENDING_CODE) {
        return;
      }
      const msg = getSocialSignInErrorMessage(err, t);
      if (msg) setError(msg);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    console.info("[signup] Continue with Apple clicked");
    setError("");
    setIsAppleLoading(true);

    try {
      const signupRole =
        signUpAs === "client+provider" ? "client+provider" : "client";
      const userCredential = await signInWithApple({
        pendingSignupRole: signupRole,
      });
      if (isTwoFactorLoginChallenge(userCredential)) {
        router.push("/login");
        return;
      }
      setAuthCookie(userCredential.user);
      await navigateAfterAuth(router, userCredential.user);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (!emailRegex.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    if (!confirmPassword) {
      setError("Confirm Password is required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    // Check payment method requirement for Client + Provider
    if (signUpAs === "client+provider") {
      if (!currentStripePromise) {
        setError("Payment processing is not available. Please try again later.");
        return;
      }
      if (!hasPaymentMethod) {
        setError("Please add a payment card to continue with Client + Provider registration.");
        return;
      }
    }

    setIsLoading(true);

    try {
      // Sign up with role - use "client+provider" for both roles
      const role = signUpAs === "client+provider" ? "client+provider" : "client";
      // Full name is now collected in onboarding step 2 before initial-profile.
      const result = await signUp(email, password, "TaskZing User", role);
      // Flutter parity: if email already verified (rare for email/password)
      // skip email-confirmation and go straight to sign-in. Otherwise the
      // signUp helper has already signed the user out for us — show the
      // verification screen.
      if (result.user.emailVerified) {
        router.push("/login");
      } else {
        const verifyEmail = result.user.email || email.trim().toLowerCase();
        router.push(
          `/email-confirmation?email=${encodeURIComponent(verifyEmail)}&role=${encodeURIComponent(role)}`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthShell mode="signup">
        <>
          {!apiReady ? (
            <div
              className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 px-4 py-3 text-sm text-amber-800 dark:text-amber-200 mb-4"
              role="alert"
            >
              API base URL is not configured. Set <code>NEXT_PUBLIC_API_BASE_URL</code> in{" "}
              <code>.env.local</code> if needed.
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

          <form onSubmit={handleSubmit} className="min-w-0 space-y-4">
            <AuthPillInput
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <AuthPasswordPill
              placeholder="Password"
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggleShow={() => setShowPassword((s) => !s)}
              autoComplete="new-password"
            />

            <AuthPasswordPill
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirmPassword}
              onToggleShow={() => setShowConfirmPassword((s) => !s)}
              autoComplete="new-password"
            />

            {signUpAs === "client+provider" && (
              <div>
                {hasPaymentMethod ? (
                  <div className="rounded-2xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 p-4 flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                    <span className="text-sm text-green-800 dark:text-green-200">
                      Payment card added successfully
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 text-center leading-snug">
                      Pay $1.00 and verify your identity to become a Provider.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowPaymentForm(true)}
                      className="w-full rounded-full bg-[#e31837] hover:bg-[#c91529] dark:hover:bg-[#ff3b45] text-white text-sm font-semibold py-3 flex items-center justify-center gap-2 transition-colors"
                    >
                      <CreditCard className="h-4 w-4" />
                      Add card
                    </button>
                    <p className="text-xs text-red-600 dark:text-red-400 text-center">
                      Add a verified card to continue with provider registration.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowPaymentForm(true)}
                      className="w-full rounded-full border-2 border-[#e31837] dark:border-[#ff5c64] bg-white dark:bg-[#013453] text-[#e31837] dark:text-[#ff5c64] text-sm font-semibold py-3 flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    >
                      <CreditCard className="h-4 w-4" />
                      Manage cards
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="pt-1">
              <AuthPrimaryButton
                loading={isLoading}
                disabled={
                  oauthBusy ||
                  isLoading ||
                  (signUpAs === "client+provider" && !hasPaymentMethod)
                }
              >
                {isLoading ? t("auth.signingUp") : t("auth.signUp")}
              </AuthPrimaryButton>
            </div>

            <p className="px-1 text-center text-sm leading-relaxed text-black dark:text-white">
              By signing up you are agreeing to our{" "}
              <Link
                href="/terms-conditions"
                className="font-medium text-blue-600 underline decoration-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Terms of Services and Privacy Policy
              </Link>
            </p>

            <p className="px-1 text-center text-base font-medium text-black dark:text-white sm:text-lg">
              {t("auth.alreadyHaveAccount")}{" "}
              <Link href="/login" className="font-semibold text-[#F21A1A] hover:underline">
                {t("header.logIn")}
              </Link>
            </p>

            <p className="py-2 text-center text-base font-semibold text-black dark:text-white">
              {t("common.or")}
            </p>

            <div className="relative z-20 space-y-3">
              <AuthSocialButton
                onClick={handleGoogleSignUp}
                disabled={isLoading || oauthBusy}
                loading={isGoogleLoading}
                icon={<GoogleIcon />}
                label={isGoogleLoading ? t("auth.signingUp") : t("auth.signUpWithGoogle")}
              />
              <AuthSocialButton
                onClick={handleAppleSignUp}
                disabled={isLoading || oauthBusy}
                loading={isAppleLoading}
                icon={<AppleIcon />}
                label={isAppleLoading ? t("auth.signingUp") : t("auth.signUpWithApple")}
              />
            </div>
          </form>
        </>
      </AuthShell>

      {showPaymentForm && currentStripePromise ? (
        <Elements stripe={currentStripePromise}>
          <PaymentCardForm
            onSuccess={() => {
              setShowPaymentForm(false);
              setHasPaymentMethod(true);
            }}
            onCancel={() => setShowPaymentForm(false)}
          />
        </Elements>
      ) : showPaymentForm && !currentStripePromise ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Configuration Error</h3>
              <button
                type="button"
                onClick={() => setShowPaymentForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Stripe is not configured. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your environment variables.
            </p>
            <button
              type="button"
              onClick={() => setShowPaymentForm(false)}
              className="w-full rounded-full px-4 py-3 bg-[#e31837] hover:bg-[#c91529] text-white font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function SignupPage() {
  return (
    <SocialAuthProviders>
      <Suspense
        fallback={
          <AuthShell mode="signup">
            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              Loading…
            </div>
          </AuthShell>
        }
      >
        <SignupPageContent />
      </Suspense>
    </SocialAuthProviders>
  );
}
