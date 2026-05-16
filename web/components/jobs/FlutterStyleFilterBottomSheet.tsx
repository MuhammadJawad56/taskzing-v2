"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const SHEET_MS = 320;

/** Matches Flutter `DraggableScrollableSheet` in all_jobs_widget.dart */
const MIN_CHILD_SIZE = 0.5;
const MAX_CHILD_SIZE = 0.9;
const INITIAL_CHILD_SIZE = 0.7;

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function viewportHeight() {
  if (typeof window === "undefined") return 800;
  return window.visualViewport?.height ?? window.innerHeight;
}

type FlutterStyleFilterBottomSheetProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

/**
 * Flutter `showModalBottomSheet` + `DraggableScrollableSheet`:
 * - initialChildSize: 0.7 → ~70% of viewport height
 * - minChildSize: 0.5, maxChildSize: 0.9
 * - Slides up from bottom; backdrop fades; drag handle resizes extent
 */
export function FlutterStyleFilterBottomSheet({
  open,
  onClose,
  children,
}: FlutterStyleFilterBottomSheetProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [extentFrac, setExtentFrac] = useState(INITIAL_CHILD_SIZE);
  const extentFracRef = useRef(INITIAL_CHILD_SIZE);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openRafRef = useRef<number | null>(null);
  const dragRef = useRef<{ startY: number; startExtent: number } | null>(null);

  useEffect(() => {
    extentFracRef.current = extentFrac;
  }, [extentFrac]);

  useEffect(() => {
    if (open) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setExtentFrac(INITIAL_CHILD_SIZE);
      setShouldRender(true);
      setAnimateIn(false);
      openRafRef.current = requestAnimationFrame(() => {
        openRafRef.current = requestAnimationFrame(() => {
          openRafRef.current = null;
          setAnimateIn(true);
        });
      });
      return () => {
        if (openRafRef.current != null) {
          cancelAnimationFrame(openRafRef.current);
          openRafRef.current = null;
        }
      };
    }

    setAnimateIn(false);
    closeTimerRef.current = setTimeout(() => {
      setShouldRender(false);
      closeTimerRef.current = null;
    }, SHEET_MS);
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [open]);

  useEffect(() => {
    if (!shouldRender || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [shouldRender]);

  const onHandlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startExtent: extentFracRef.current };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onHandlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dy = e.clientY - drag.startY;
    const h = viewportHeight();
    if (h <= 0) return;
    // Drag handle down → smaller sheet (matches DraggableScrollableSheet feel)
    const next = clamp(drag.startExtent - dy / h, MIN_CHILD_SIZE, MAX_CHILD_SIZE);
    setExtentFrac(next);
  }, []);

  const onHandlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  if (typeof document === "undefined" || !shouldRender) return null;

  const sheetHeightDvh = extentFrac * 100;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close filters"
        className={`fixed inset-0 z-[280] bg-black/40 transition-opacity duration-300 ease-out motion-reduce:transition-none dark:bg-black/60 ${
          animateIn ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-[281] flex flex-col rounded-t-[20px] bg-white shadow-2xl will-change-transform transition-transform duration-300 ease-out motion-reduce:transition-none dark:bg-darkBlue-013 ${
          animateIn ? "translate-y-0" : "translate-y-full"
        } motion-reduce:translate-y-0`}
        style={{
          height: `${sheetHeightDvh}dvh`,
          maxHeight: `${MAX_CHILD_SIZE * 100}dvh`,
          minHeight: `${MIN_CHILD_SIZE * 100}dvh`,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="flex shrink-0 cursor-grab touch-none flex-col items-center pt-3 pb-2 active:cursor-grabbing"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
        >
          <div
            className="h-1 w-10 rounded-full bg-gray-400 dark:bg-white/40"
            aria-hidden
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </>,
    document.body
  );
}
