"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/api/AuthContext";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import {
  requestTwoFaDisableCode,
  requestTwoFaEnableCode,
  twoFaDisable,
  twoFaEnable,
  twoFaSetup,
} from "@/lib/api/twoFactor";

type Props = {
  totpEnabled: boolean;
};

export function TwoFactorSettingsClient({ totpEnabled: initialTotpEnabled }: Props) {
  const router = useRouter();
  const { refreshUserData } = useAuth();
  const { t } = useLanguage();

  const [totpEnabled, setTotpEnabled] = useState(initialTotpEnabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [enableOtp, setEnableOtp] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableBackup, setDisableBackup] = useState("");
  const [disableEmailOtp, setDisableEmailOtp] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const run = async (fn: () => Promise<void>) => {
    clearMessages();
    setLoading(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("twoFa.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = useCallback(async () => {
    await refreshUserData();
  }, [refreshUserData]);

  const startSetup = () =>
    run(async () => {
      const data = await twoFaSetup();
      setOtpauthUrl(data.otpauthUrl);
      setSecret(data.secret);
      await requestTwoFaEnableCode();
      setSuccess(t("twoFa.enableCodeSent"));
    });

  const sendEnableCode = () =>
    run(async () => {
      await requestTwoFaEnableCode();
      setSuccess(t("twoFa.enableCodeSent"));
    });

  const enable = () =>
    run(async () => {
      if (enableOtp.trim().length !== 6) {
        setError(t("twoFa.codeSixDigits"));
        return;
      }
      const codes = await twoFaEnable(enableOtp);
      setTotpEnabled(true);
      setOtpauthUrl(null);
      setSecret(null);
      setEnableOtp("");
      setSuccess(t("twoFa.enabledSuccess"));
      if (codes.length > 0) setBackupCodes(codes);
      await refreshProfile();
    });

  const sendDisableCode = () =>
    run(async () => {
      await requestTwoFaDisableCode();
      setSuccess(t("twoFa.disableCodeSent"));
    });

  const disable = () =>
    run(async () => {
      if (!disablePassword.trim()) {
        setError(t("twoFa.passwordRequired"));
        return;
      }
      await twoFaDisable({
        password: disablePassword,
        code: disableEmailOtp.trim().length === 6 ? disableEmailOtp : null,
        backupCode: disableBackup.trim() || null,
      });
      setTotpEnabled(false);
      setDisablePassword("");
      setDisableBackup("");
      setDisableEmailOtp("");
      setSuccess(t("twoFa.disabledSuccess"));
      await refreshProfile();
    });

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push("/dashboard/settings")}
          className="mb-4 flex items-center text-theme-primaryText dark:text-white hover:text-primary-500 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span>{t("twoFa.back")}</span>
        </button>
        <h1 className="text-3xl font-bold text-theme-primaryText dark:text-white">
          {t("twoFa.title")}
        </h1>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200" role="alert">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200" role="status">
          {success}
        </div>
      ) : null}

      <Card className="dark:bg-darkBlue-203 dark:border-white dark:ring-1 dark:ring-white">
        <CardContent className="p-6 space-y-5">
          {!totpEnabled ? (
            <>
              <p className="text-sm text-theme-accent4 dark:text-white/80 leading-relaxed">
                {t("twoFa.disabledDescription")}
              </p>

              {otpauthUrl ? (
                <>
                  <div className="flex justify-center">
                    <QRCodeSVG value={otpauthUrl} size={200} level="M" />
                  </div>
                  {secret ? (
                    <p className="text-xs text-theme-accent4 dark:text-white/70 break-all">
                      {t("twoFa.secretLabel")}: {secret}
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={loading}
                    onClick={() => void sendEnableCode()}
                  >
                    {t("twoFa.sendEnableCode")}
                  </Button>
                  <div>
                    <label className="block text-sm font-medium text-theme-primaryText dark:text-white mb-2">
                      {t("twoFa.enterEmailCode")}
                    </label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={enableOtp}
                      onChange={(e) =>
                        setEnableOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="000000"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    className="w-full"
                    disabled={loading || enableOtp.length !== 6}
                    onClick={() => void enable()}
                  >
                    {t("twoFa.enableButton")}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  className="w-full"
                  disabled={loading}
                  onClick={() => void startSetup()}
                >
                  {t("twoFa.startSetup")}
                </Button>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-theme-accent4 dark:text-white/80 leading-relaxed">
                {t("twoFa.enabledDescription")}
              </p>
              <h2 className="text-lg font-semibold text-theme-primaryText dark:text-white">
                {t("twoFa.turnOffTitle")}
              </h2>
              <Input
                label={t("twoFa.password")}
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                autoComplete="current-password"
              />
              <Input
                label={t("twoFa.backupCodeOptional")}
                type="text"
                value={disableBackup}
                onChange={(e) => setDisableBackup(e.target.value)}
                autoComplete="off"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={loading}
                onClick={() => void sendDisableCode()}
              >
                {t("twoFa.sendDisableCode")}
              </Button>
              <div>
                <label className="block text-sm font-medium text-theme-primaryText dark:text-white mb-2">
                  {t("twoFa.emailCode")}
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={disableEmailOtp}
                  onChange={(e) =>
                    setDisableEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                />
              </div>
              <Button
                type="button"
                variant="primary"
                className="w-full"
                disabled={loading || !disablePassword.trim()}
                onClick={() => void disable()}
              >
                {t("twoFa.disableButton")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {backupCodes && backupCodes.length > 0 ? (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="backup-codes-title"
        >
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-indigo-300/50 dark:bg-darkBlue-203">
            <h2 id="backup-codes-title" className="text-lg font-bold text-gray-900 dark:text-white mb-3">
              {t("twoFa.saveBackupCodes")}
            </h2>
            <pre className="max-h-48 overflow-auto rounded-lg bg-gray-100 p-3 text-sm text-gray-900 dark:bg-black/30 dark:text-white whitespace-pre-wrap">
              {backupCodes.join("\n")}
            </pre>
            <Button
              type="button"
              variant="primary"
              className="mt-4 w-full"
              onClick={() => setBackupCodes(null)}
            >
              OK
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}


