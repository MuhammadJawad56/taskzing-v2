"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { ConfirmDialog } from "@/components/settings/ConfirmDialog";
import { useAuth } from "@/lib/api/AuthContext";
import { useLanguage } from "@/lib/contexts/LanguageContext";

const SUPPORT_EMAIL = "customercare@taskzing.com";

const deactivationReasons = [
  "I have a duplicate or second account.",
  "I'm concerned about my privacy or data security.",
  "I no longer find the app useful.",
  "I'm taking a break or spending too much time here.",
  "I'm switching to a different platform.",
  "I'm not satisfied with the app experience.",
  "I'm receiving too many emails or notifications.",
  "Other (please specify)",
];

export default function AccountDeletionPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const { t } = useLanguage();
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [otherReason, setOtherReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOtherSelected = selectedReason === "Other (please specify)";
  const minChars = 50;
  const maxChars = 1500;
  const isValid =
    Boolean(selectedReason) &&
    (!isOtherSelected ||
      (otherReason.trim().length >= minChars && otherReason.trim().length <= maxChars));

  const resolvedReason = isOtherSelected ? otherReason.trim() : selectedReason;

  const handleRequestDeletion = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      // Flutter parity: local dummy success, then sign out.
      console.info("[Account deletion] Request recorded:", {
        reason: resolvedReason,
        timestamp: new Date().toISOString(),
      });
      await logout();
      if (typeof document !== "undefined") {
        document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
      alert(t("settings.deletionSuccess"));
      window.location.href = "/";
    } catch (e) {
      console.error("Account deletion request failed:", e);
      setError(
        `${t("settings.deletionFailed")}: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
    }
  };

  const handleEmailRequest = () => {
    const subject = encodeURIComponent(t("settings.deletionEmailSubject"));
    const body = encodeURIComponent(t("settings.deletionEmailBody"));
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    window.location.href = mailto;
    alert(t("settings.deletionEmailOpened"));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <ConfirmDialog
        open={showConfirm}
        title={t("settings.deletionConfirmTitle")}
        message={t("settings.deletionConfirmMessage")}
        cancelLabel={t("settings.cancel")}
        confirmLabel={t("settings.deletionConfirmButton")}
        confirmVariant="danger"
        onCancel={() => setShowConfirm(false)}
        onConfirm={() => void handleRequestDeletion()}
      />

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
          {t("settings.accountDeletion")}
        </h1>
        <p className="text-theme-accent4 mt-2">{t("settings.deletionReasonTitle")}</p>
      </div>

      <div className="mb-6 flex gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-500/30 dark:bg-orange-900/20">
        <Info className="h-5 w-5 shrink-0 text-orange-600 dark:text-orange-300" />
        <p className="text-sm text-gray-800 dark:text-white/90">{t("settings.deletionInfo")}</p>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <Card>
        <CardContent className="p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isValid) return;
              setShowConfirm(true);
            }}
            className="space-y-6"
          >
            <div className="space-y-4">
              {deactivationReasons.map((reason, index) => (
                <label
                  key={index}
                  className="flex items-start gap-3 cursor-pointer group"
                >
                  <input
                    type="radio"
                    name="deletionReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="mt-1 h-5 w-5 text-primary-500 border-2 border-primary-500 focus:ring-primary-500 focus:ring-2 cursor-pointer accent-primary-500"
                    style={{ accentColor: "#ef4444" }}
                  />
                  <span className="flex-1 text-theme-primaryText dark:text-white group-hover:text-primary-500 transition-colors">
                    {reason}
                  </span>
                </label>
              ))}
            </div>

            {isOtherSelected ? (
              <div className="mt-4">
                <div className="relative">
                  <Textarea
                    value={otherReason}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= maxChars) setOtherReason(value);
                    }}
                    placeholder="Please specify... (50-1500 characters)"
                    rows={6}
                    className={`pr-24 ${
                      otherReason.length > 0 && otherReason.length < minChars
                        ? "border-accent-error focus:border-accent-error focus:ring-accent-error"
                        : "border-gray-300"
                    }`}
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-theme-accent4">
                    {otherReason.length}/{maxChars}{" "}
                    {otherReason.length > 0 && otherReason.length < minChars
                      ? `(min: ${minChars})`
                      : ""}
                  </div>
                </div>
                {otherReason.length > 0 && otherReason.length < minChars ? (
                  <p className="mt-2 text-sm text-accent-error">
                    Please enter at least {minChars} characters.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col items-center gap-4 pt-4 sm:flex-row sm:justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/settings")}
              >
                {t("settings.cancel")}
              </Button>
              <Button
                type="submit"
                variant={isValid ? "primary" : "outline"}
                size="lg"
                disabled={!isValid || isSubmitting}
                isLoading={isSubmitting}
                className="min-w-[200px]"
              >
                {t("settings.requestPermanentDeletion")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 text-center">
        <p className="text-sm text-theme-accent4 dark:text-white/70">
          {t("settings.deletionEmailHint")}
        </p>
        <button
          type="button"
          onClick={handleEmailRequest}
          className="mt-2 text-sm font-semibold text-theme-primaryText underline dark:text-white"
        >
          {SUPPORT_EMAIL}
        </button>
      </div>
    </div>
  );
}
