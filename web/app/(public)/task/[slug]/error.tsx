"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function TaskError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md mx-auto text-center">
        <h2 className="text-2xl font-bold text-secondary-900 mb-4">
          Something went wrong!
        </h2>
        <p className="text-secondary-600 mb-6">
          We couldn't load the task. Please try again.
        </p>
        <Button onClick={reset} variant="primary">
          Try again
        </Button>
      </div>
    </div>
  );
}

