"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bell, Send, Menu, ArrowLeftRight, Briefcase, Check, CreditCard, X, QrCode } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/api/AuthContext";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useAvailabilityLinkedStatusDot } from "@/lib/hooks/useAvailabilityLinkedStatusDot";
import { useHeaderUnreadCounts } from "@/lib/hooks/useHeaderUnreadCounts";
import {
  becomeProviderWithProfile,
  resolveProfileDisplayName,
  switchUserRole,
} from "@/lib/api/auth";
import { addStoredPaymentMethod, getStoredPaymentMethods } from "@/lib/api/payments";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
// Initialize Stripe - same as payment-method page
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_your_publishable_key_here"
);

const SKILLS = [
  "Cleaning", "Plumbing", "Electrical", "Carpentry", "Painting", "Landscaping",
  "Moving", "Delivery", "IT Support", "Web Development", "Graphic Design", "Photography",
  "Tutoring", "Consulting", "Legal Services", "Financial Services", "Others",
];

const cardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "#1f2937",
      fontFamily: '"Inter", sans-serif',
      "::placeholder": { color: "#9ca3af" },
    },
    invalid: { color: "#ef4444" },
  },
  hidePostalCode: false,
};

// Payment Card Form Component
function PaymentCardForm({ onSuccess, onCancel, userEmail }: { onSuccess: () => void; onCancel: () => void; userEmail: string | null }) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardholderName, setCardholderName] = useState("");

  const handleCardChange = (event: any) => {
    setCardComplete(event.complete);
    if (event.error) {
      setCardError(event.error.message);
    } else {
      setCardError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !user) return;

    if (!cardholderName.trim()) {
      setCardError("Please enter the cardholder name");
      return;
    }

    setIsProcessing(true);
    setCardError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setCardError("Card Element not found.");
      setIsProcessing(false);
      return;
    }

    try {
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: {
          name: cardholderName.trim(),
          email: userEmail || undefined,
        },
      });

      if (error) {
        setCardError(error.message || "An unknown error occurred.");
        setIsProcessing(false);
        return;
      }

      if (!paymentMethod) {
        setCardError("Failed to create payment method");
        setIsProcessing(false);
        return;
      }

      const paymentMethodData = {
        id: paymentMethod.id,
        paymentMethodId: paymentMethod.id,
        last4: paymentMethod.card?.last4 ?? "",
        cardBrand: paymentMethod.card?.brand || "unknown",
        expMonth: paymentMethod.card?.exp_month || 0,
        expYear: paymentMethod.card?.exp_year || 0,
        cardholderName: cardholderName.trim(),
        createdAt: new Date().toISOString(),
      };
      addStoredPaymentMethod(user.uid, paymentMethodData);
      onSuccess();
    } catch (err: any) {
      console.error("Error creating payment method:", err);
      setCardError(err.message || "Failed to add payment method. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Add Payment Method</h3>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {cardError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{cardError}</div>
      )}

      <div>
        <label htmlFor="cardholder-name" className="block text-sm font-medium text-gray-700 mb-2">Cardholder Name</label>
        <input
          id="cardholder-name"
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="John Doe"
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 bg-gray-50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Card Details</label>
        <div className="p-3 border border-gray-300 rounded-lg bg-gray-50 focus-within:ring-2 focus-within:ring-red-500">
          <CardElement options={cardElementOptions} onChange={handleCardChange} />
        </div>
      </div>

      <Button type="submit" isLoading={isProcessing} disabled={!stripe || !elements || !cardComplete || isProcessing} className="w-full">
        {isProcessing ? "Adding Card..." : "Add Card"}
      </Button>
    </form>
  );
}

interface DashboardHeaderProps {
  onMenuToggle?: () => void;
  onQRClick?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onMenuToggle, onQRClick }) => {
  const { user, userData, refreshUserData } = useAuth();
  const { active: statusDotActive, title: statusDotTitle } =
    useAvailabilityLinkedStatusDot();
  const router = useRouter();
  const [isSwitching, setIsSwitching] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [hasProviderProfile, setHasProviderProfile] = useState(false);
  const currentRole = userData?.currentRole || userData?.role || "provider";
  const isClientRole = String(currentRole).toLowerCase() === "client";
  const profileAvatarShapeClass = isClientRole ? "rounded-xl" : "rounded-full";
  const logoHomeHref = currentRole === "client" ? "/client-home" : "/dashboard";
  const switchTarget = currentRole === "client" ? "provider" : "client";
  const isClientOnly = userData?.role === "client" && currentRole === "client";
  const messagesHref = currentRole === "client" ? "/messages" : "/dashboard/messages";
  const { messageUnread, notificationUnread } = useHeaderUnreadCounts(user?.uid);

  // Become a Provider modal state
  const [showBecomeProviderModal, setShowBecomeProviderModal] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [serviceDescription, setServiceDescription] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [providerError, setProviderError] = useState("");
  const MAX_PROVIDER_DESCRIPTION_CHARS = 1500;

  // Pre-fill service description from initial profile when modal opens
  useEffect(() => {
    if (!showBecomeProviderModal) return;
    const fromProfile = (
      userData?.bio ||
      userData?.about ||
      userData?.description ||
      ""
    ).trim();
    if (!fromProfile) return;
    setServiceDescription((prev) => {
      if (prev.trim()) return prev;
      return fromProfile.slice(0, MAX_PROVIDER_DESCRIPTION_CHARS);
    });
  }, [
    showBecomeProviderModal,
    userData?.bio,
    userData?.about,
    userData?.description,
  ]);

  // Check if user has provider profile.
  // Flutter parity: any of role === Provider / Both / Client+Provider, or the
  // explicit hasBeenProvider / providerOnboardingCompleted / providerProfileCompleted
  // flags, indicates the user has a provider persona available.
  useEffect(() => {
    if (userData) {
      const hasProvider = Boolean(
        userData.role === "provider" ||
        userData.role === "both" ||
        userData.role === "client+provider" ||
        userData.hasBeenProvider === true ||
        userData.providerOnboardingCompleted === true ||
        userData.providerProfileCompleted === true ||
        (userData.skills && userData.skills.length > 0)
      );
      setHasProviderProfile(hasProvider);
    } else {
      setHasProviderProfile(false);
    }
  }, [userData, isClientOnly]);

  // Check if user has payment methods
  useEffect(() => {
    const checkPaymentMethods = async () => {
      if (!user) return;
      try {
        setHasPaymentMethod(getStoredPaymentMethods(user.uid).length > 0);
      } catch (error) {
        console.error("Error checking payment methods:", error);
      }
    };
    if (user) checkPaymentMethods();
  }, [user]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleBecomeProviderSubmit = async () => {
    if (!user) {
      setProviderError("Please sign in to continue");
      return;
    }

    if (selectedSkills.length === 0) {
      setProviderError("Please select at least one skill");
      return;
    }

    if (!serviceDescription.trim()) {
      setProviderError("Please provide a service description");
      return;
    }

    if (!hasPaymentMethod) {
      setProviderError("Please add a payment method to continue");
      return;
    }

    setIsSubmitting(true);
    setProviderError("");

    try {
      await becomeProviderWithProfile(user.uid, {
        description: serviceDescription.trim(),
        skills: selectedSkills,
      });

      setShowBecomeProviderModal(false);
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("Error updating provider profile:", err);
      setProviderError(err.message || "Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeBecomeProviderModal = () => {
    setShowBecomeProviderModal(false);
    setSelectedSkills([]);
    setServiceDescription("");
    setProviderError("");
    setShowPaymentForm(false);
  };

  const userName = resolveProfileDisplayName(user, userData);
  const userInitial = userName.charAt(0).toUpperCase();

  const handleSwitchRole = () => {
    if (!user) {
      alert("Please log in to switch roles.");
      return;
    }
    
    // If client-only and doesn't have provider profile, navigate to become provider page
    if (isClientOnly && !hasProviderProfile) {
      router.push("/become-provider");
      return;
    }
    
    // Show confirmation modal for both client and provider
    setShowSwitchModal(true);
  };


  const performRoleSwitch = async () => {
    if (!user) return;
    
    setShowSwitchModal(false);
    setIsSwitching(true);
    try {
      await switchUserRole(user.uid, switchTarget);
      router.replace(switchTarget === "client" ? "/client-home" : "/dashboard");
      void refreshUserData();
    } catch (error: any) {
      console.error("Error switching role:", error);
      
      // Provide user-friendly error messages
      let errorMessage = "Failed to switch role. Please try again.";
      if (error?.code === 'permission-denied') {
        errorMessage = "You don't have permission to update your role. Please contact support.";
      } else if (error?.code === 'unavailable') {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <header className="sticky top-0 z-[60] w-full overflow-hidden rounded-b-[22px] border-0 border-b border-solid border-theme-accent2 bg-[var(--app-surface)] shadow-[0_8px_20px_rgba(0,0,0,0.22)] dark:border-gray-700 dark:shadow-[0_10px_24px_rgba(0,0,0,0.45)]">
      <div className="mx-auto w-full max-w-full border-0 px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between border-0 sm:h-16">
          <Link href={logoHomeHref} className="flex shrink-0 items-center border-0">
            <Image
              src="/images/logos/Taskzing-Logo-light-mode_1.png"
              alt="TaskZing"
              width={140}
              height={40}
              className="block h-9 w-auto sm:h-10 dark:hidden"
              priority
              suppressHydrationWarning
            />
            <Image
              src="/images/logos/Taskzing-Logo-dark-mode_1.png"
              alt="TaskZing"
              width={140}
              height={40}
              className="hidden h-9 w-auto sm:h-10 dark:block"
              priority
              suppressHydrationWarning
            />
          </Link>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 border-0 sm:gap-3 lg:gap-4 [&_a]:border-0 [&_button]:border-0">
            {/* Switch to Client/Provider Button - Hidden on mobile/tablet */}
            <button
              type="button"
              onClick={handleSwitchRole}
              disabled={isSwitching}
              className="hidden lg:flex items-center justify-center whitespace-nowrap rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSwitching 
                ? "Switching..." 
                : isClientOnly && !hasProviderProfile
                  ? "Become a Provider"
                  : `Switch to ${switchTarget === "client" ? "Client" : "Provider"}`
              }
            </button>

            {/* Icons - Always visible */}
            <Link
              href="/notifications"
              className="relative inline-flex rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-darkBlue-003"
              aria-label={
                notificationUnread > 0
                  ? `Notifications, ${notificationUnread} unread`
                  : "Notifications"
              }
            >
              <Bell className="h-5 w-5 text-gray-700 dark:text-white" />
              {notificationUnread > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#FF2D2D] px-1 text-[10px] font-semibold leading-none text-white">
                  {notificationUnread > 99 ? "99+" : notificationUnread}
                </span>
              ) : null}
            </Link>

            <Link
              href={messagesHref}
              className="relative inline-flex rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-darkBlue-003"
              aria-label={
                messageUnread > 0 ? `Messages, ${messageUnread} unread` : "Messages"
              }
            >
              <Send className="h-5 w-5 text-gray-700 dark:text-white" strokeWidth={2} />
              {messageUnread > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#FF2D2D] px-1 text-[10px] font-semibold leading-none text-white">
                  {messageUnread > 99 ? "99+" : messageUnread}
                </span>
              ) : null}
            </Link>

            {onQRClick ? (
              <button
                type="button"
                onClick={onQRClick}
                className="inline-flex rounded-lg border border-gray-300 bg-gray-100 p-2 text-gray-900 transition-colors hover:bg-gray-200 dark:border-gray-600 dark:bg-darkBlue-203 dark:text-white dark:hover:bg-darkBlue-343"
                aria-label="QR Code"
              >
                <QrCode className="h-5 w-5" strokeWidth={2} />
              </button>
            ) : null}

            {/* Hamburger Menu - Visible on mobile/tablet, hidden on desktop */}
            <button
              type="button"
              onClick={() => onMenuToggle?.()}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-darkBlue-003 transition-colors"
              aria-label="Menu"
            >
              <div className="flex flex-col gap-1">
                <div className="w-4 h-0.5 bg-gray-700 dark:bg-white"></div>
                <div className="w-5 h-0.5 bg-gray-700 dark:bg-white"></div>
                <div className="w-4 h-0.5 bg-gray-700 dark:bg-white"></div>
              </div>
            </button>

            {/* User Avatar - Hidden on mobile/tablet, visible on desktop */}
            <button
              className="hidden lg:flex relative"
              onClick={() => router.push(user?.uid ? `/profile/${user.uid}` : "/my-profile")}
              aria-label="User menu"
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center bg-violet-600 text-base font-semibold text-white",
                  profileAvatarShapeClass
                )}
              >
                {userInitial}
              </div>
              <div
                className={cn(
                  "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[var(--app-surface)] dark:border-darkBlue-013",
                  statusDotActive ? "bg-green-500" : "bg-gray-400"
                )}
                title={statusDotTitle}
                aria-hidden
              />
            </button>
          </div>
        </div>
      </div>

      {/* Switch Role Confirmation Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-[270] flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-darkBlue-013">
            {/* Modal Header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-4">
              <ArrowLeftRight className="h-6 w-6 text-red-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Switch to {switchTarget === "client" ? "Client" : "Provider"}
              </h2>
            </div>

            {/* Modal Body */}
            <div className="px-6 pb-6">
              {switchTarget === "client" ? (
                <>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">
                    Are you sure you want to switch your role?
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    This will change your role while preserving all your signup data.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    You are about to switch your role from Client to Provider. Your previous provider data will be automatically retrieved, including:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                    <li>Skills and expertise</li>
                    <li>Service description</li>
                    <li>Provider rating and reviews</li>
                    <li>Job completion history</li>
                  </ul>
                  <p className="text-gray-700 dark:text-gray-300 font-medium">
                    Do you want to continue?
                  </p>
                </>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-4 px-6 pb-6 justify-end">
              <button
                onClick={() => setShowSwitchModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={performRoleSwitch}
                disabled={isSwitching}
                className="px-6 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSwitching ? "Switching..." : "Switch Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Become a Provider Modal */}
      {showBecomeProviderModal && (
        <div 
          className="fixed inset-0 z-[270] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeBecomeProviderModal();
          }}
        >
          <div 
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-darkBlue-013"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 rounded-t-2xl border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-darkBlue-013">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-500/20">
                    <Briefcase className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Become a Provider</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Complete your provider profile to start earning</p>
                  </div>
                </div>
                <button
                  onClick={closeBecomeProviderModal}
                  className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-darkBlue-203"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="space-y-6 p-6">
              {/* Error Message */}
              {providerError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-300">
                  {providerError}
                </div>
              )}

              {/* Role Confirmation */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-400/30 dark:bg-darkBlue-203">
                <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">You are becoming a:</p>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-600">Provider</span>
                  <div className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>

              {/* Select Your Skills */}
              <div>
                <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Select Your Skills</h2>
                <div className="grid grid-cols-3 gap-2">
                  {SKILLS.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        selectedSkills.includes(skill)
                          ? "bg-red-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-darkBlue-203 dark:text-gray-200 dark:hover:bg-darkBlue-343"
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Description */}
              <div>
                <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Service Description</h2>
                <textarea
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  placeholder="Describe your services and expertise..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-gray-600 dark:bg-darkBlue-013 dark:text-white dark:placeholder:text-gray-400"
                />
              </div>

              {/* Payment Details */}
              <div>
                {!hasPaymentMethod ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowPaymentForm(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-white transition-colors hover:bg-red-700"
                    >
                      <CreditCard className="h-5 w-5" />
                      <span>Add Payment Details</span>
                    </button>
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                      Add a payment method to verify your identity and enable payments.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-500/40 dark:bg-green-950/25">
                    <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-green-700 dark:text-green-300">Payment method added successfully</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 flex gap-3 rounded-b-2xl border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-darkBlue-013">
              <Button variant="secondary" onClick={closeBecomeProviderModal} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleBecomeProviderSubmit}
                disabled={isSubmitting || !hasPaymentMethod}
                isLoading={isSubmitting}
                className="flex-1"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Form Modal (nested inside Become a Provider) */}
      {showPaymentForm && (
        <div 
          className="fixed inset-0 z-[275] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPaymentForm(false);
          }}
        >
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-darkBlue-013" onClick={(e) => e.stopPropagation()}>
            <Elements stripe={stripePromise}>
              <PaymentCardForm
                onSuccess={() => {
                  setShowPaymentForm(false);
                  setHasPaymentMethod(true);
                }}
                onCancel={() => setShowPaymentForm(false)}
                userEmail={user?.email || null}
              />
            </Elements>
          </div>
        </div>
      )}

    </header>
  );
};


