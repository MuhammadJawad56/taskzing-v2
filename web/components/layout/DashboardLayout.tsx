"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Home,
  PlusCircle,
  Search,
  FileText,
  MessageSquare,
  ShoppingBag,
  Wallet,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Compass,
  Briefcase,
  CheckSquare,
  User,
  Sun,
  Moon,
  Monitor,
  ArrowLeftRight,
  Plus,
  Users,
  Star,
  CreditCard,
  Check,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ChatZingRingIcon } from "@/components/chatzing/ChatZingRingIcon";
import { DashboardHeader } from "./DashboardHeader";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/api/AuthContext";
import { useAvailabilityLinkedStatusDot } from "@/lib/hooks/useAvailabilityLinkedStatusDot";
import { getUserData, isOnboardingFlowCompleteForNav } from "@/lib/api/auth";
import { isSplashProfileComplete } from "@/lib/auth/postLoginNavigation";
import {
  becomeProviderWithProfile,
  resolveProfileDisplayName,
  switchUserRole,
} from "@/lib/api/auth";
import { addStoredPaymentMethod, getStoredPaymentMethods } from "@/lib/api/payments";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/Button";

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

// Payment Card Form Component for Mobile
function MobilePaymentCardForm({ onSuccess, onCancel, userEmail, userId }: { onSuccess: () => void; onCancel: () => void; userEmail: string | null; userId: string }) {
  const stripe = useStripe();
  const elements = useElements();
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
    if (!stripe || !elements || !userId) return;

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
      addStoredPaymentMethod(userId, paymentMethodData);
      onSuccess();
    } catch (err: any) {
      setCardError(err.message || "Failed to add payment method.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Add Payment Method</h3>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-lg">
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {cardError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{cardError}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Cardholder Name</label>
        <input
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="John Doe"
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Card Details</label>
        <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
          <CardElement options={cardElementOptions} onChange={handleCardChange} />
        </div>
      </div>

      <Button type="submit" isLoading={isProcessing} disabled={!stripe || !elements || !cardComplete || isProcessing} className="w-full">
        {isProcessing ? "Adding Card..." : "Add Card"}
      </Button>
    </form>
  );
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

/** Explicit nav i18n keys — avoids broken dynamic keys (e.g. `nav.reels` showing literally). */
const NAV_I18N_KEYS: Record<string, string> = {
  Dashboard: "nav.dashboard",
  Home: "nav.home",
  Explore: "nav.explore",
  Reels: "nav.reels",
  Showcase: "nav.showcase",
  "Showcase Work": "nav.showcasework",
  "My Tasks": "nav.mytasks",
  Messages: "nav.messages",
  Profile: "nav.profile",
  Settings: "nav.settings",
  "Chat Zing": "nav.chatzing",
  "Post a Job": "nav.postajob",
  "All Jobs": "nav.alljobs",
};

function resolveNavLabel(itemName: string, t: (key: string) => string): string {
  const key =
    NAV_I18N_KEYS[itemName] ??
    `nav.${itemName.toLowerCase().replace(/\s+/g, "")}`;
  const translated = t(key);
  return translated && translated !== key ? translated : itemName;
}

/** Sidebar nav: same gradient ring as dashboard header ChatZing link */
function ChatZingNavIcon({ className }: { className?: string }) {
  return <ChatZingRingIcon className={cn("h-5 w-5", className)} strokeWidth={14} />;
}

// Desktop navigation items (provider view) - will be updated with user ID dynamically
const getDesktopNavItems = (userId: string): NavItem[] => [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Explore", href: "/provider-explore", icon: Compass },
  { name: "Reels", href: "/reels", icon: Video },
  { name: "Showcase", href: "/dashboard/showcase", icon: Briefcase },
  { name: "My Tasks", href: "/dashboard/my-tasks", icon: CheckSquare },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { name: "Profile", href: `/profile/${userId}`, icon: User },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Chat Zing", href: "/dashboard/chatzing-ai", icon: ChatZingNavIcon },
];

// Desktop navigation items (client view) - will be updated with user ID dynamically
const getClientDesktopNavItems = (userId: string): NavItem[] => [
  { name: "Home", href: "/client-home", icon: Home },
  { name: "Explore", href: "/client-explore", icon: Compass },
  { name: "Reels", href: "/reels", icon: Video },
  { name: "Post a Job", href: "/post-task", icon: PlusCircle },
  { name: "All Jobs", href: "/all-jobs", icon: Briefcase },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  { name: "Profile", href: `/profile/${userId}`, icon: User },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Chat Zing", href: "/dashboard/chatzing-ai", icon: ChatZingNavIcon },
];

// Mobile/Tablet navigation items (provider view) - will be updated with user ID dynamically
const getMobileNavItems = (userId: string): NavItem[] => [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Explore", href: "/provider-explore", icon: Compass },
  { name: "Reels", href: "/reels", icon: Video },
  { name: "Showcase Work", href: "/dashboard/showcase", icon: Briefcase },
  { name: "My Tasks", href: "/dashboard/my-tasks", icon: CheckSquare },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { name: "Profile", href: `/profile/${userId}`, icon: User },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

// Mobile/Tablet navigation items (client view) - will be updated with user ID dynamically
const getClientMobileNavItems = (userId: string): NavItem[] => [
  { name: "Home", href: "/client-home", icon: Home },
  { name: "Explore", href: "/client-explore", icon: Compass },
  { name: "Reels", href: "/reels", icon: Video },
  { name: "Post a Job", href: "/post-task", icon: PlusCircle },
  { name: "All Jobs", href: "/all-jobs", icon: Briefcase },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  { name: "Profile", href: `/profile/${userId}`, icon: User },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export const DashboardLayout: React.FC<{
  children: React.ReactNode;
  onQRClick?: () => void;
  hideNavigationChrome?: boolean;
}> = ({
  children,
  onQRClick,
  hideNavigationChrome = false,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchModalTarget, setSwitchModalTarget] = useState<"client" | "provider">("client");
  const [hasProviderProfile, setHasProviderProfile] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const pathname = usePathname();
  const { themePreference, setThemePreference } = useTheme();
  const { t, language } = useLanguage();

  const themeSubtitle =
    themePreference === "system"
      ? t("settings.system")
      : themePreference === "dark"
        ? t("settings.dark")
        : t("settings.light");

  const themeRowIcon =
    themePreference === "system" ? (
      <Monitor className="h-5 w-5" />
    ) : themePreference === "dark" ? (
      <Moon className="h-5 w-5" />
    ) : (
      <Sun className="h-5 w-5" />
    );

  const themeOptions = ["system", "light", "dark"] as const;
  const router = useRouter();
  const { user, userData, loading: authLoading, refreshUserData } = useAuth();
  const statusDot = useAvailabilityLinkedStatusDot();
  const currentRole = userData?.currentRole || userData?.role || "provider";
  const userId = user?.uid || userData?.uid || "";
  const isClientOnly = userData?.role === "client" && currentRole === "client";

  // Become a Provider modal state
  const [showBecomeProviderModal, setShowBecomeProviderModal] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [serviceDescription, setServiceDescription] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [providerError, setProviderError] = useState("");
  const [isChromeHiddenByOverlay, setIsChromeHiddenByOverlay] = useState(false);
  const shouldHideChrome = hideNavigationChrome || isChromeHiddenByOverlay;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncChromeVisibility = () => {
      setIsChromeHiddenByOverlay(
        document.body.classList.contains("taskzing-hide-dashboard-chrome")
      );
    };
    syncChromeVisibility();
    window.addEventListener("taskzing:toggle-dashboard-chrome", syncChromeVisibility);
    return () => {
      window.removeEventListener("taskzing:toggle-dashboard-chrome", syncChromeVisibility);
    };
  }, []);

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
    }
  }, [userData]);

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

  useEffect(() => {
    if (!showThemeModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showThemeModal]);

  useEffect(() => {
    if (!showThemeModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowThemeModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showThemeModal]);

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


  // Flutter nav gate: onboarding → initial profile → app (use cached userData when possible)
  useEffect(() => {
    if (authLoading || !user) return;
    if (
      pathname === "/initial-profile" ||
      pathname === "/initial-profile-steps" ||
      pathname?.startsWith("/email-confirmation")
    ) {
      return;
    }

    const gate = async () => {
      try {
        const data = userData ?? (await getUserData(user.uid));
        if (!data) return;
        if (!isOnboardingFlowCompleteForNav(data)) {
          router.replace("/initial-profile-steps");
          return;
        }
        if (!isSplashProfileComplete(data)) {
          router.replace("/initial-profile");
        }
      } catch (error) {
        console.error("Error checking profile completion:", error);
      }
    };

    void gate();
  }, [user, userData, authLoading, pathname, router]);
  
  const desktopItems = useMemo(() => {
    const items =
      currentRole === "client"
        ? getClientDesktopNavItems(userId)
        : getDesktopNavItems(userId);
    return items.map((item) => ({
      ...item,
      name: resolveNavLabel(item.name, t),
    }));
  }, [currentRole, userId, t, language]);

  const mobileItems = useMemo(() => {
    const items =
      currentRole === "client"
        ? getClientMobileNavItems(userId)
        : getMobileNavItems(userId);
    return items.map((item) => ({
      ...item,
      name: resolveNavLabel(item.name, t),
    }));
  }, [currentRole, userId, t, language]);
  
  const userName = resolveProfileDisplayName(user, userData);
  const userInitial = userName.charAt(0).toUpperCase();
  const isClientRole = String(currentRole).toLowerCase() === "client";
  const profileAvatarShapeClass = "rounded-full";

  const handleSwitchToClient = async () => {
    if (!user) {
      alert("Please log in to switch roles.");
      return;
    }
    
    // Show confirmation modal first
    setSwitchModalTarget("client");
    setShowSwitchModal(true);
  };

  const handleSwitchToProvider = async () => {
    if (!user) {
      alert("Please log in to switch roles.");
      return;
    }
    
    // If client-only and doesn't have provider profile, navigate to become provider page
    if (isClientOnly && !hasProviderProfile) {
      router.push("/become-provider");
      return;
    }
    
    // Show confirmation modal first
    setSwitchModalTarget("provider");
    setShowSwitchModal(true);
  };

  const performRoleSwitch = async () => {
    if (!user) return;
    
    const targetRole = switchModalTarget;
    setShowSwitchModal(false);
    setIsSwitching(true);
    try {
      await switchUserRole(user.uid, targetRole);
      router.replace(targetRole === "client" ? "/client-home" : "/dashboard");
      void refreshUserData();
    } catch (error: any) {
      console.error(`Error switching to ${targetRole}:`, error);
      
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
    <div className="min-h-screen min-w-0 bg-[var(--app-bg)]">
      {showThemeModal && (
        <div
          className="fixed inset-0 z-[270] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-theme-modal-title"
          onClick={() => setShowThemeModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-indigo-300/50 dark:bg-darkBlue-203"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="mobile-theme-modal-title"
              className="mb-5 text-lg font-bold text-gray-900 dark:text-white"
            >
              {t("settings.darkLightMode")}
            </h2>
            <div className="flex flex-col gap-1" role="radiogroup" aria-labelledby="mobile-theme-modal-title">
              {themeOptions.map((value) => {
                const label =
                  value === "system"
                    ? t("settings.system")
                    : value === "light"
                      ? t("settings.light")
                      : t("settings.dark");
                const selected = themePreference === value;
                return (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
                  >
                    <input
                      type="radio"
                      name="mobile-theme-preference"
                      value={value}
                      checked={selected}
                      onChange={() => {
                        setThemePreference(value);
                        setShowThemeModal(false);
                      }}
                      className="sr-only"
                    />
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        selected
                          ? "border-cyan-400"
                          : "border-gray-400 dark:border-white/75"
                      }`}
                      aria-hidden
                    >
                      {selected ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                      ) : null}
                    </span>
                    <span className="text-base text-gray-900 dark:text-white">{label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Header */}
      {!shouldHideChrome ? (
        <DashboardHeader onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} onQRClick={onQRClick} />
      ) : null}

      {/* Mobile/Tablet Sidebar Drawer — must sit above bottom nav (260) and header (60); below modals (270). */}
      {!shouldHideChrome ? (
        <div
          className={cn(
            "lg:hidden fixed inset-0 z-[262] transition-opacity duration-300",
            isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[262] bg-black/50 transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Side Drawer */}
          <aside
            className={cn(
              "fixed right-0 top-0 bottom-0 z-[263] w-64 max-w-[85vw] dark:bg-darkBlue-013 bg-white shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col",
              isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
            )}
          >
            {/* Header with Logo and Close button */}
            <div className="flex items-center justify-between p-4 border-b border-theme-accent2 dark:border-gray-700">
              <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center">
                <Image
                  src="/images/logos/Taskzing-Logo-light-mode_1.png"
                  alt="TaskZing"
                  width={120}
                  height={40}
                  className="h-8 w-auto dark:hidden"
                  suppressHydrationWarning
                />
                <Image
                  src="/images/logos/Taskzing-Logo-dark-mode_1.png"
                  alt="TaskZing"
                  width={120}
                  height={40}
                  className="hidden h-8 w-auto dark:block"
                  suppressHydrationWarning
                />
              </Link>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-darkBlue-003 transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5 text-gray-700 dark:text-white" />
              </button>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {mobileItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href.startsWith("/profile/")
                  ? pathname?.startsWith("/profile/")
                  : pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary-500 text-white"
                        : "text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-theme-accent1 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}

              {/* Chat Zing */}
              <Link
                href="/dashboard/chatzing-ai"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  pathname === "/dashboard/chatzing-ai"
                    ? "bg-primary-500 text-white"
                    : "text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-theme-accent1 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <ChatZingRingIcon className="h-5 w-5" strokeWidth={14} />
                <span>{t("nav.chatzing")}</span>
              </Link>

              {/* Light / dark mode — same row style as Chat Zing / nav links */}
              <button
                type="button"
                onClick={() => setShowThemeModal(true)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm text-left font-medium transition-colors",
                  "text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-theme-accent1 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <div className="h-5 w-5 flex-shrink-0 text-primary-500">{themeRowIcon}</div>
                <span className="min-w-0 flex-1">
                  <span className="block leading-tight">{t("settings.darkLightMode")}</span>
                  <span className="mt-0.5 block text-xs font-normal text-gray-500 dark:text-gray-400">
                    {themeSubtitle}
                  </span>
                </span>
                <ChevronRight
                  className="h-5 w-5 shrink-0 text-gray-400 dark:text-gray-500"
                  aria-hidden
                />
              </button>
            </nav>

            {/* Switch Role Button */}
            <div className="p-4 border-t border-theme-accent2 dark:border-gray-700">
              {currentRole === "client" ? (
                <button
                  type="button"
                  onClick={() => {
                    handleSwitchToProvider();
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={isSwitching}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeftRight className="h-5 w-5" />
                  <span>
                    {isSwitching
                      ? "Switching..."
                      : isClientOnly && !hasProviderProfile
                        ? "Become a Provider"
                        : "Switch to Provider"}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    handleSwitchToClient();
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={isSwitching}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeftRight className="h-5 w-5" />
                  <span>{isSwitching ? "Switching..." : "Switch to Client"}</span>
                </button>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 bg-[var(--app-bg)]">
        {/* Sidebar - Desktop: below fixed header (h-16), full remaining height */}
        {!shouldHideChrome ? (
        <aside className={cn(
          "hidden lg:z-[55] lg:flex lg:flex-col lg:fixed lg:left-0 lg:top-16 lg:bottom-0 dark:bg-darkBlue-013 bg-white border-r border-theme-accent2 transition-all duration-300",
          isSidebarCollapsed ? "lg:w-20" : "lg:w-64"
        )}>
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {desktopItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href.startsWith("/profile/") 
                ? pathname?.startsWith("/profile/")
                : pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-500 text-white"
                      : "text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-theme-accent1 hover:text-gray-900 dark:hover:text-white",
                    isSidebarCollapsed && "justify-center"
                  )}
                  title={isSidebarCollapsed ? item.name : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isSidebarCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>
          
          {/* Sidebar Toggle Button */}
          <div className="p-4 border-t border-theme-accent2 dark:border-gray-700">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={cn(
                "flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-theme-accent1",
                isSidebarCollapsed && "justify-center"
              )}
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <div className="flex items-center gap-1.5">
                {/* Three horizontal lines (hamburger menu) */}
                <div className="flex flex-col gap-1">
                  <div className="w-4 h-0.5 bg-current"></div>
                  <div className="w-5 h-0.5 bg-current"></div>
                  <div className="w-4 h-0.5 bg-current"></div>
                </div>
                {/* Less-than sign */}
                {!isSidebarCollapsed && (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </div>
            </button>
          </div>
        </aside>
        ) : null}

        {/* Main Content */}
        <main className={cn(
          "relative z-0 min-w-0 flex-1 bg-[var(--app-bg)] isolate transition-all duration-300 pb-20 lg:pb-8",
          shouldHideChrome ? "lg:ml-0 pb-0 lg:pb-0" : isSidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        )}>
          <div
            className={cn(
              "container mx-auto min-w-0 max-w-full",
              shouldHideChrome ? "px-0 py-0" : "px-4 sm:px-6 lg:px-8 py-8"
            )}
          >
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile bottom chrome: above in-page overlays (e.g. z-[200] availability dialogs), below layout modals (z-[270]+) and filter sheets (z-[280]+). */}
      {!shouldHideChrome ? (
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[260] border-t border-theme-accent2 bg-[var(--app-surface)] shadow-lg dark:border-gray-700">
        <div className="flex items-center justify-around h-16 px-2">
          {currentRole === "client" ? (
            <>
              {/* Home */}
              <Link
                href="/client-home"
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                  pathname === "/client-home"
                    ? "text-red-500"
                    : "text-gray-600 dark:text-gray-400"
                )}
              >
                <Home className={cn(
                  "h-6 w-6",
                  pathname === "/client-home" && "fill-red-500"
                )} />
                <span className="text-xs mt-0.5">Home</span>
              </Link>
              
              {/* Explore */}
              <Link
                href="/client-explore"
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                  pathname === "/client-explore"
                    ? "text-red-500"
                    : "text-gray-600 dark:text-gray-400"
                )}
              >
                <Compass className="h-6 w-6" />
                <span className="text-xs mt-0.5">Explore</span>
              </Link>
              
              {/* Add/Create Button - Large Red Circle */}
              <button
                onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500 text-white shadow-lg -mt-5 transition-transform hover:scale-110 z-50"
              >
                {isPlusMenuOpen ? (
                  <X className="h-6 w-6" strokeWidth={3} />
                ) : (
                  <Plus className="h-6 w-6" strokeWidth={3} />
                )}
              </button>
              
              {/* Jobs — opens post-a-job form (All Jobs remains in drawer / desktop nav) */}
              <button
                type="button"
                onClick={() => router.push("/post-task")}
                className={cn(
                  "flex h-full flex-1 flex-col items-center justify-center transition-colors",
                  pathname === "/post-task"
                    ? "text-red-500"
                    : "text-gray-600 dark:text-gray-400"
                )}
                aria-label="Post a job"
              >
                <Briefcase className="h-6 w-6" />
                <span className="mt-0.5 text-xs">Jobs</span>
              </button>
              
              {/* Profile */}
              <Link
                href={userId ? `/profile/${userId}` : "/my-profile"}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full transition-colors relative",
                  pathname?.startsWith("/profile/")
                    ? "text-red-500"
                    : "text-gray-600 dark:text-gray-400"
                )}
              >
                <div className="relative inline-flex">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center bg-violet-600 text-sm font-semibold text-white",
                      profileAvatarShapeClass
                    )}
                  >
                    {userInitial}
                  </div>
                  <div
                    className={cn(
                      "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[var(--app-surface)] dark:border-darkBlue-013",
                      statusDot.active ? "bg-green-500" : "bg-gray-400"
                    )}
                    title={statusDot.title}
                    aria-label={statusDot.title}
                  />
                </div>
                <span className="text-xs mt-0.5">Profile</span>
              </Link>
            </>
          ) : (
            <>
              {/* Dashboard */}
              <Link
                href="/dashboard"
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                  pathname === "/dashboard"
                    ? "text-red-500"
                    : "text-gray-600 dark:text-gray-400"
                )}
              >
                <LayoutDashboard
                  className={cn("h-6 w-6", pathname === "/dashboard" && "text-red-500")}
                />
                <span className="mt-0.5 text-[10px] font-medium sm:text-xs">Dashboard</span>
              </Link>

              {/* Explore — job discovery for providers */}
              <Link
                href="/provider-explore"
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                  pathname === "/provider-explore" || pathname === "/explore"
                    ? "text-red-500"
                    : "text-gray-600 dark:text-gray-400"
                )}
              >
                <Compass className="h-6 w-6" />
                <span className="mt-0.5 text-[10px] font-medium sm:text-xs">Explore</span>
              </Link>

              {/* Add/Create Button - Large Red Circle */}
              <button
                onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                className="z-50 -mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-transform hover:scale-110"
              >
                {isPlusMenuOpen ? (
                  <X className="h-6 w-6" strokeWidth={3} />
                ) : (
                  <Plus className="h-6 w-6" strokeWidth={3} />
                )}
              </button>

              {/* Showcase Work */}
              <button
                type="button"
                onClick={() => router.push("/dashboard/showcase")}
                className={cn(
                  "flex h-full flex-1 flex-col items-center justify-center transition-colors",
                  pathname === "/showcase-work" ||
                    pathname?.startsWith("/showcase-work/") ||
                    pathname === "/dashboard/showcase" ||
                    pathname?.startsWith("/dashboard/showcase/")
                    ? "text-red-500"
                    : "text-gray-600 dark:text-gray-400"
                )}
                aria-label="Showcase work"
              >
                <Briefcase className="h-6 w-6" />
                <span className="mt-0.5 max-w-[4.5rem] truncate text-center text-[10px] font-medium leading-tight sm:text-xs">
                  Showcase Work
                </span>
              </button>

              {/* Profile */}
              <Link
                href={userId ? `/profile/${userId}` : "/dashboard/profile"}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center transition-colors",
                  pathname?.startsWith("/profile/")
                    ? "text-red-500"
                    : "text-gray-600 dark:text-gray-400"
                )}
              >
                <div className="relative inline-flex">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center bg-violet-600 text-sm font-semibold text-white",
                      profileAvatarShapeClass
                    )}
                  >
                    {userInitial}
                  </div>
                  <div
                    className={cn(
                      "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[var(--app-surface)] dark:border-darkBlue-013",
                      statusDot.active ? "bg-green-500" : "bg-gray-400"
                    )}
                    title={statusDot.title}
                    aria-label={statusDot.title}
                  />
                </div>
                <span className="mt-0.5 text-[10px] font-medium sm:text-xs">Profile</span>
              </Link>
            </>
          )}
        </div>
      </nav>
      ) : null}
      
      {/* Plus menu — parity with Flutter `ActionMenuBottomSheet` + `ArcPainter` (arcHeight 125 mobile, double-Q path, translate fractions, white/black pills). */}
      {!shouldHideChrome && isPlusMenuOpen && (
        <>
          <div
            className={cn(
              "lg:hidden fixed inset-0 z-[248] bg-black/45 transition-opacity duration-300 dark:bg-black/55",
              isPlusMenuOpen ? "opacity-100" : "opacity-0"
            )}
            onClick={() => setIsPlusMenuOpen(false)}
          />

          <div className="pointer-events-none fixed bottom-16 left-0 right-0 z-[252] lg:hidden">
            <div className="relative h-[125px] w-full pointer-events-auto">
              {/* ArcPainter: moveTo(0,H); two quadratics to peak y=0.027*H; light=white dark=darkBlue013 */}
              <svg
                className="absolute bottom-0 left-0 h-full w-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_4px_14px_rgba(0,0,0,0.45)]"
                viewBox="0 0 400 125"
                preserveAspectRatio="none"
                aria-hidden
              >
                <path
                  className="fill-white dark:fill-[#013453]"
                  d="M 0 125 Q 70 3.375 200 3.375 Q 330 3.375 400 125 Z"
                />
              </svg>

              {/* Flutter offsets: left (-0.315W,-0.102H), topL (-0.131W,-0.353H), topR (0.131W,-0.353H), right (0.315W,-0.102H) — anchor bottom-center → left % + translateX(-50%). */}
              {currentRole === "client" ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/dashboard/chatzing-ai");
                      setIsPlusMenuOpen(false);
                    }}
                    className="absolute flex max-w-[30vw] flex-col items-center -translate-x-1/2"
                    style={{ left: "18.5%", bottom: "10px" }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 shadow-[0_4px_8px_rgba(0,0,0,0.2)]">
                      <ChatZingRingIcon className="h-[18px] w-[18px]" strokeWidth={10} />
                    </div>
                    <span className="mt-2 max-w-[8.5rem] rounded-md bg-white/90 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-tight text-black shadow-sm dark:bg-white/90">
                      {t("plus.chatzingAi")}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/reels");
                      setIsPlusMenuOpen(false);
                    }}
                    className="absolute flex max-w-[30vw] flex-col items-center -translate-x-1/2"
                    style={{ left: "36.9%", bottom: "42px" }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 shadow-[0_4px_8px_rgba(0,0,0,0.2)]">
                      <Video className="h-[18px] w-[18px] text-white" strokeWidth={2} />
                    </div>
                    <span className="mt-2 max-w-[6.5rem] rounded-md bg-white/90 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-tight text-black shadow-sm dark:bg-white/90">
                      {resolveNavLabel("Reels", t)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/post-task");
                      setIsPlusMenuOpen(false);
                    }}
                    className="absolute flex max-w-[30vw] flex-col items-center -translate-x-1/2"
                    style={{ left: "63.1%", bottom: "42px" }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 shadow-[0_4px_8px_rgba(0,0,0,0.2)]">
                      <PlusCircle className="h-[18px] w-[18px] text-white" strokeWidth={2} />
                    </div>
                    <span className="mt-2 max-w-[6.5rem] rounded-md bg-white/90 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-tight text-black shadow-sm dark:bg-white/90">
                      Post a Job
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSwitchToProvider();
                      setIsPlusMenuOpen(false);
                    }}
                    disabled={isSwitching}
                    className="absolute flex max-w-[34vw] flex-col items-center -translate-x-1/2 disabled:opacity-50"
                    style={{ left: "81.5%", bottom: "10px" }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 shadow-[0_4px_8px_rgba(0,0,0,0.2)]">
                      <ArrowLeftRight className="h-[18px] w-[18px] text-white" strokeWidth={2} />
                    </div>
                    <span className="mt-2 max-w-[7.5rem] rounded-md bg-white/90 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-tight text-black shadow-sm dark:bg-white/90">
                      {isSwitching ? "Switching..." : "Switch Role"}
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/dashboard/chatzing-ai");
                      setIsPlusMenuOpen(false);
                    }}
                    className="absolute flex max-w-[30vw] flex-col items-center -translate-x-1/2"
                    style={{ left: "18.5%", bottom: "10px" }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 shadow-[0_4px_8px_rgba(0,0,0,0.2)]">
                      <ChatZingRingIcon className="h-[18px] w-[18px]" strokeWidth={10} />
                    </div>
                    <span className="mt-2 max-w-[8.5rem] rounded-md bg-white/90 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-tight text-black shadow-sm dark:bg-white/90">
                      {t("plus.chatzingAi")}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/reels");
                      setIsPlusMenuOpen(false);
                    }}
                    className="absolute flex max-w-[30vw] flex-col items-center -translate-x-1/2"
                    style={{ left: "36.9%", bottom: "42px" }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 shadow-[0_4px_8px_rgba(0,0,0,0.2)]">
                      <Video className="h-[18px] w-[18px] text-white" strokeWidth={2} />
                    </div>
                    <span className="mt-2 max-w-[6.5rem] rounded-md bg-white/90 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-tight text-black shadow-sm dark:bg-white/90">
                      {resolveNavLabel("Reels", t)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/dashboard/showcase");
                      setIsPlusMenuOpen(false);
                    }}
                    className="absolute flex max-w-[30vw] flex-col items-center -translate-x-1/2"
                    style={{ left: "63.1%", bottom: "42px" }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 shadow-[0_4px_8px_rgba(0,0,0,0.2)]">
                      <Briefcase className="h-[18px] w-[18px] text-white" strokeWidth={2} />
                    </div>
                    <span className="mt-2 max-w-[6.5rem] rounded-md bg-white/90 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-tight text-black shadow-sm dark:bg-white/90">
                      Showcase
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSwitchToClient();
                      setIsPlusMenuOpen(false);
                    }}
                    disabled={isSwitching}
                    className="absolute flex max-w-[30vw] flex-col items-center -translate-x-1/2 disabled:opacity-50"
                    style={{ left: "81.5%", bottom: "10px" }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 shadow-[0_4px_8px_rgba(0,0,0,0.2)]">
                      <Users className="h-[18px] w-[18px] text-white" strokeWidth={2} />
                    </div>
                    <span className="mt-2 max-w-[6.5rem] rounded-md bg-white/90 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-tight text-black shadow-sm dark:bg-white/90">
                      {isSwitching ? "Switching..." : "Switch Role"}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Switch Role Confirmation Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-[270] flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-darkBlue-013">
            {/* Modal Header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-4">
              <ArrowLeftRight className="h-6 w-6 text-red-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Switch to {switchModalTarget === "client" ? "Client" : "Provider"}
              </h2>
            </div>

            {/* Modal Body */}
            <div className="px-6 pb-6">
              {switchModalTarget === "client" ? (
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
              <MobilePaymentCardForm
                onSuccess={() => {
                  setShowPaymentForm(false);
                  setHasPaymentMethod(true);
                }}
                onCancel={() => setShowPaymentForm(false)}
                userEmail={user?.email || null}
                userId={user?.uid || ""}
              />
            </Elements>
          </div>
        </div>
      )}
    </div>
  );
};


