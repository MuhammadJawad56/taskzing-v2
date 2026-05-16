"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy route: full showcase form lives under the dashboard shell. */
export default function ShowcaseWorkRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/showcase");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-gray-600 dark:bg-darkBlue-013 dark:text-gray-400">
      <p className="text-sm">Opening showcase form…</p>
    </div>
  );
}
