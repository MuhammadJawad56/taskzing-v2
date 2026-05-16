"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export interface GuestAuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Post-login return path (e.g. `/` or `/explore`) */
  loginRedirectPath?: string;
}

/**
 * Themed prompt for guests: log in or sign up before viewing jobs, saving, or applying.
 * Matches public app surfaces (white / darkBlue-013, primary red CTAs).
 */
export function GuestAuthPromptModal({
  isOpen,
  onClose,
  loginRedirectPath = "/",
}: GuestAuthPromptModalProps) {
  const router = useRouter();
  const loginHref = `/login?redirect=${encodeURIComponent(loginRedirectPath)}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log in or sign up" size="sm">
      <p className="mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        Create a free account or sign in to view full job details, save listings, and submit applications on
        TaskZing.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <Button
          variant="primary"
          className="w-full flex-1 gap-2"
          size="md"
          onClick={() => {
            onClose();
            router.push(loginHref);
          }}
        >
          <LogIn className="h-4 w-4 shrink-0" aria-hidden />
          Log in
        </Button>
        <Button
          variant="outline"
          className="w-full flex-1 gap-2 dark:border-gray-500 dark:text-white"
          size="md"
          onClick={() => {
            onClose();
            router.push("/signup");
          }}
        >
          <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
          Sign up
        </Button>
      </div>
    </Modal>
  );
}
