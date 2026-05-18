"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { changePassword } from "@/lib/api/auth";

/** Flutter `BackendChangePasswordWidget` — settings → change password while logged in. */
export function ChangePasswordSettingsClient() {
  const router = useRouter();
  const { t } = useLanguage();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError(t("settings.changePassword.mismatch"));
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(t("settings.changePassword.success"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      window.setTimeout(() => router.push("/dashboard/settings"), 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.changePassword.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push("/dashboard/settings")}
          className="mb-4 flex items-center text-theme-primaryText dark:text-white hover:text-primary-500 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span>{t("settings.changePassword.back")}</span>
        </button>
        <h1 className="text-3xl font-bold text-theme-primaryText dark:text-white">
          {t("settings.changePasswordTitle")}
        </h1>
      </div>

      {error ? (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {success ? (
        <div
          className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200"
          role="status"
        >
          {success}
        </div>
      ) : null}

      <Card className="dark:bg-darkBlue-203 dark:border-white dark:ring-1 dark:ring-white">
        <CardContent className="p-6">
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <Input
              label={t("settings.changePassword.current")}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <Input
              label={t("settings.changePassword.new")}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <Input
              label={t("settings.changePassword.confirm")}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? t("settings.changePassword.saving") : t("settings.changePassword.save")}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-theme-accent4 dark:text-white/70">
            <Link href="/forgot-password" className="text-[#F21A1A] hover:underline font-medium">
              {t("settings.changePassword.forgotLink")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

