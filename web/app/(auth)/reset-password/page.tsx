"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Email reset links may point to `/reset-password?token=…`.
 * The app implements the form on `/new-password`; forward the query there.
 */
function ResetPasswordRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token?.trim()) {
      router.replace(`/new-password?token=${encodeURIComponent(token)}`);
    } else {
      router.replace("/forgot-password");
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-primaryBackground dark:bg-darkBlue-003">
      <p className="text-theme-accent4 dark:text-white/80">Redirecting…</p>
    </div>
  );
}

export default function ResetPasswordAliasPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-theme-primaryBackground dark:bg-darkBlue-003">
          <p className="text-theme-accent4 dark:text-white/80">Loading…</p>
        </div>
      }
    >
      <ResetPasswordRedirectInner />
    </Suspense>
  );
}
