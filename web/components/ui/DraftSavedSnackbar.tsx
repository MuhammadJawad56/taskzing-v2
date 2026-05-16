"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { DRAFT_SAVED_EVENT, type DraftSavedDetail } from "@/lib/draftSavedEvents";

const AUTO_DISMISS_MS = 4500;

export function DraftSavedSnackbar() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const show = useCallback(
    (msg: string) => {
      clearTimer();
      setMessage(msg);
      setOpen(true);
      hideTimerRef.current = setTimeout(() => {
        setOpen(false);
        hideTimerRef.current = null;
      }, AUTO_DISMISS_MS);
    },
    [clearTimer],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onSaved = (ev: Event) => {
      const detail = (ev as CustomEvent<DraftSavedDetail>).detail?.message?.trim();
      if (!detail) return;
      show(detail);
    };
    window.addEventListener(DRAFT_SAVED_EVENT, onSaved as EventListener);
    return () => {
      window.removeEventListener(DRAFT_SAVED_EVENT, onSaved as EventListener);
      clearTimer();
    };
  }, [show, clearTimer]);

  if (!open || !message) return null;
  if (!mounted || typeof document === "undefined") return null;

  const bar = (
    <div
      className="pointer-events-auto fixed left-4 right-4 z-[9998] mx-auto max-w-lg transition-opacity duration-200"
      style={{
        bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))",
      }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-full bg-[#42B964] px-4 py-3.5 pl-3.5 shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/25 ring-2 ring-white/35"
          aria-hidden
        >
          <Check className="h-5 w-5 text-white" strokeWidth={2.8} />
        </div>
        <p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug tracking-tight text-white">
          {message}
        </p>
      </div>
    </div>
  );

  return createPortal(bar, document.body);
}
