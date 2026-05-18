"use client";

import React from "react";
import { TwoFactorSettingsClient } from "@/components/settings/TwoFactorSettingsClient";
import { useAuth } from "@/lib/api/AuthContext";

export default function TwoFactorSettingsPage() {
  const { userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center text-theme-accent4 dark:text-white/70">
        Loading…
      </div>
    );
  }

  return <TwoFactorSettingsClient totpEnabled={Boolean(userData?.totpEnabled)} />;
}
