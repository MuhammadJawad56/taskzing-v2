"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Moon,
  Sun,
  Monitor,
  Bell,
  MessageSquare,
  FileText,
  Globe,
  UserX,
  LogOut,
  Clapperboard,
  Shield,
  Lock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { useAuth } from "@/lib/api/AuthContext";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { useLanguage } from "@/lib/contexts/LanguageContext";

export default function SettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const { themePreference, setThemePreference } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [notifications, setNotifications] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);

  const themeSubtitle =
    themePreference === "system"
      ? t("settings.system")
      : themePreference === "dark"
        ? t("settings.dark")
        : t("settings.light");

  const themeRowIcon =
    themePreference === "system" ? (
      <Monitor className="h-6 w-6" />
    ) : themePreference === "dark" ? (
      <Moon className="h-6 w-6" />
    ) : (
      <Sun className="h-6 w-6" />
    );

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
  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent multiple clicks
    
    setIsLoggingOut(true);
    
    try {
      // Call Firebase logout (this will clear auth state and cookies)
      await logout();
      
      // Clear all cookies explicitly
      if (typeof document !== "undefined") {
        document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "auth-token=; path=/; domain=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
      
      // Force redirect to login page
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      // Even if there's an error, try to redirect
      window.location.href = "/login";
    } finally {
      setIsLoggingOut(false);
    }
  };



  const settingsItems = [
    {
      icon: <Bell className="h-5 w-5" />,
      title: t("settings.notifications"),
      description: t("settings.toggleNotifications"),
      action: (
        <Toggle
          checked={notifications}
          onChange={setNotifications}
        />
      ),
    },
    {
      icon: <Lock className="h-5 w-5" />,
      title: t("settings.changePasswordTitle"),
      description: t("settings.changePasswordDesc"),
      onClick: () => router.push("/dashboard/change-password"),
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: t("settings.twoFactor"),
      description: t("settings.twoFactorDesc"),
      onClick: () => router.push("/dashboard/two-factor"),
    },
    {
      icon: <Clapperboard className="h-5 w-5" />,
      title: "Reels",
      description: "Short videos from the community",
      onClick: () => router.push("/reels"),
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      title: t("settings.suggestions"),
      description: t("settings.suggestionsDesc"),
      onClick: () => router.push("/dashboard/suggestions-complaints"),
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: t("settings.terms"),
      description: t("settings.termsDesc"),
      onClick: () => router.push("/dashboard/terms-conditions"),
    },
    {
      icon: <Globe className="h-5 w-5" />,
      title: t("settings.language"),
      description: t("settings.chooseLanguage"),
      action: (
        <div className="flex gap-2">
          <Button
            variant={language === "english" ? "primary" : "outline"}
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setLanguage("english");
            }}
          >
            {t("settings.english")}
          </Button>
          <Button
            variant={language === "french" ? "primary" : "outline"}
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setLanguage("french");
            }}
          >
            {t("settings.french")}
          </Button>
        </div>
      ),
    },
    {
      icon: <UserX className="h-5 w-5" />,
      title: "Delete Account",
      description: "Permanently delete your account",
      onClick: () => router.push("/dashboard/account-deactivation"),
    },
    {
      icon: <LogOut className="h-5 w-5" />,
      title: t("settings.logOut"),
      description: t("settings.signOut"),
      onClick: handleLogout,
      value: isLoggingOut ? t("settings.loggingOut") : undefined,
      disabled: isLoggingOut,
    },
  ];

  const themeOptions = ["system", "light", "dark"] as const;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-theme-primaryText dark:text-white">{t("settings.title")}</h1>
        <p className="text-theme-accent4 dark:text-gray-300 mt-2">{t("settings.description")}</p>
      </div>

      {showThemeModal && (
        <div
          className="fixed inset-0 z-[270] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="theme-modal-title"
          onClick={() => setShowThemeModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-indigo-300/50 dark:bg-darkBlue-203"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="theme-modal-title"
              className="mb-5 text-lg font-bold text-gray-900 dark:text-white"
            >
              {t("settings.darkLightMode")}
            </h2>
            <div className="flex flex-col gap-1" role="radiogroup" aria-labelledby="theme-modal-title">
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
                      name="theme-preference"
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

      <button
        type="button"
        onClick={() => setShowThemeModal(true)}
        className="mb-4 flex w-full items-center gap-4 rounded-xl border-2 border-gray-200 bg-white px-5 py-4 text-left shadow-sm transition-colors hover:bg-gray-50 dark:border-white dark:ring-1 dark:ring-white dark:bg-darkBlue-203 dark:hover:bg-darkBlue-203/90"
      >
        <div className="flex-shrink-0 text-primary-500">{themeRowIcon}</div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-gray-900 dark:text-white">
            {t("settings.darkLightMode")}
          </h3>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-white/80">{themeSubtitle}</p>
        </div>
      </button>

      <div className="space-y-4">
        {settingsItems.map((item, index) => (
          <Card
            key={index}
            className={`transition-shadow dark:bg-darkBlue-203 dark:border-white dark:ring-1 dark:ring-white ${
              item.onClick && !item.disabled
                ? "cursor-pointer hover:shadow-md hover:bg-gray-50 dark:hover:bg-darkBlue-203/90"
                : "hover:shadow-md"
            } ${item.disabled ? "opacity-70" : ""}`}
            onClick={() => {
              if (item.onClick && !item.disabled) item.onClick();
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-primary-500 flex-shrink-0">{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-theme-primaryText dark:text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-theme-accent4 dark:text-white/80">{item.description}</p>
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-2">
                  {item.action ?? null}
                  {item.value ? (
                    <span className="text-sm font-medium text-theme-accent4 dark:text-white/80">
                      {item.value}
                    </span>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
}

