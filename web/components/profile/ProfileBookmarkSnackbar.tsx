"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/api/AuthContext";
import { bookmarkProfile, removeProfileBookmarkQuietly } from "@/lib/api/users";
import {
  PROFILE_BOOKMARK_RESTORED_EVENT,
  PROFILE_SAVED_EVENT,
  PROFILE_UNSAVED_EVENT,
  type ProfileBookmarkRestoredDetail,
  type ProfileSavedDetail,
  type ProfileUnsavedDetail,
} from "@/lib/profileBookmarkEvents";

const AUTO_DISMISS_SECONDS = 10;

type ToastMode = "unsaved" | "saved";

type Pending = ProfileUnsavedDetail;

export function ProfileBookmarkSnackbar() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ToastMode>("unsaved");
  const [secondsLeft, setSecondsLeft] = useState(AUTO_DISMISS_SECONDS);
  const [pending, setPending] = useState<Pending | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const pendingRef = useRef<Pending | null>(null);
  const modeRef = useRef<ToastMode>("unsaved");
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    clearTick();
    setOpen(false);
    setPending(null);
    pendingRef.current = null;
    setIsUndoing(false);
  }, [clearTick]);

  const openWith = useCallback(
    (nextMode: ToastMode, detail: Pending) => {
      clearTick();
      modeRef.current = nextMode;
      pendingRef.current = detail;
      setPending(detail);
      setMode(nextMode);
      setOpen(true);
      setIsUndoing(false);
      setSecondsLeft(AUTO_DISMISS_SECONDS);
    },
    [clearTick],
  );

  useEffect(() => {
    const onUnsaved = (ev: Event) => {
      const e = ev as CustomEvent<ProfileUnsavedDetail>;
      const detail = e.detail;
      if (!detail?.bookmarkedBy || !detail.profileUserId) return;
      if (!user || detail.bookmarkedBy !== user.uid) return;
      openWith("unsaved", detail);
    };

    const onSaved = (ev: Event) => {
      const e = ev as CustomEvent<ProfileSavedDetail>;
      const detail = e.detail;
      if (!detail?.bookmarkedBy || !detail.profileUserId) return;
      if (!user || detail.bookmarkedBy !== user.uid) return;
      openWith("saved", detail);
    };

    window.addEventListener(PROFILE_UNSAVED_EVENT, onUnsaved as EventListener);
    window.addEventListener(PROFILE_SAVED_EVENT, onSaved as EventListener);
    return () => {
      window.removeEventListener(PROFILE_UNSAVED_EVENT, onUnsaved as EventListener);
      window.removeEventListener(PROFILE_SAVED_EVENT, onSaved as EventListener);
    };
  }, [user, openWith]);

  useEffect(() => {
    if (!open || !pending) return;

    let s = AUTO_DISMISS_SECONDS;
    setSecondsLeft(s);
    tickRef.current = setInterval(() => {
      s -= 1;
      setSecondsLeft(s);
      if (s <= 0) {
        clearTick();
        setOpen(false);
        setPending(null);
        pendingRef.current = null;
        setIsUndoing(false);
      }
    }, 1000);

    return () => clearTick();
  }, [open, pending, clearTick]);

  const restartTimerAfterUndoError = useCallback(() => {
    setIsUndoing(false);
    let s = AUTO_DISMISS_SECONDS;
    setSecondsLeft(s);
    tickRef.current = setInterval(() => {
      s -= 1;
      setSecondsLeft(s);
      if (s <= 0) {
        clearTick();
        setOpen(false);
        setPending(null);
        pendingRef.current = null;
        setIsUndoing(false);
      }
    }, 1000);
  }, [clearTick]);

  const handleUndo = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUndoing) return;

    const d = pendingRef.current ?? pending;
    if (!d?.bookmarkedBy || !d.profileUserId) return;

    const { bookmarkedBy, profileUserId } = d;
    setIsUndoing(true);
    clearTick();

    try {
      if (modeRef.current === "unsaved") {
        await bookmarkProfile(bookmarkedBy, profileUserId, { suppressSavedToast: true });
        window.dispatchEvent(
          new CustomEvent<ProfileBookmarkRestoredDetail>(PROFILE_BOOKMARK_RESTORED_EVENT, {
            detail: { profileUserId },
          }),
        );
      } else {
        await removeProfileBookmarkQuietly(bookmarkedBy, profileUserId);
      }
      close();
    } catch (err) {
      console.error("Profile bookmark toast undo failed:", err);
      restartTimerAfterUndoError();
    }
  };

  if (!open || !pending) return null;
  if (!mounted || typeof document === "undefined") return null;

  const isSaved = mode === "saved";
  const label = isSaved ? "Profile saved!" : "Profile unsaved";
  const barClass = isSaved
    ? "bg-emerald-600 text-white shadow-lg"
    : "bg-black text-white shadow-lg";

  const bar = (
    <div
      className={`pointer-events-auto fixed left-3 right-3 z-[9999] mx-auto max-w-lg touch-manipulation rounded-lg px-4 py-3 ${barClass}`}
      style={{
        bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))",
      }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex shrink-0 items-center gap-3">
          <span className={`tabular-nums text-sm ${isSaved ? "text-white/90" : "text-white/90"}`}>
            {secondsLeft}s
          </span>
          <button
            type="button"
            disabled={isUndoing}
            onClick={(ev) => void handleUndo(ev)}
            className="min-h-[44px] min-w-[44px] px-2 text-sm font-bold uppercase tracking-wide underline-offset-2 hover:underline disabled:opacity-50"
          >
            {isUndoing ? "…" : "UNDO"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(bar, document.body);
}
