"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/api/AuthContext";
import { backfillShowcaseSubmissions } from "@/lib/api/showcase";

export default function BackfillShowcasesPage() {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto py-10 px-4">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Sign in to run the showcase backfill.
        </p>
      </div>
    );
  }

  const handleRun = async () => {
    if (running) return;
    setRunning(true);
    setResult(null);
    try {
      const count = await backfillShowcaseSubmissions();
      setResult(`Backfill complete. Updated ${count} showcase submissions.`);
    } catch (err: any) {
      console.error("Backfill error:", err);
      setResult(err?.message || "Backfill failed. Check console for details.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Backfill Showcases to Mobile Path
      </h1>
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
        This will mirror all existing <code className="px-1 rounded bg-gray-100 dark:bg-darkBlue-203">showcases</code> documents
        into <code className="px-1 rounded bg-gray-100 dark:bg-darkBlue-203">showcase_work/&lt;userId&gt;/submissions</code> so they are visible
        in the mobile app. You can run this more than once; it is idempotent.
      </p>
      <button
        type="button"
        onClick={handleRun}
        disabled={running}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {running ? "Running..." : "Run Backfill"}
      </button>
      {result && (
        <p className="mt-4 text-sm text-gray-800 dark:text-gray-200">
          {result}
        </p>
      )}
    </div>
  );
}

