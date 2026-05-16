"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ListFilter } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ProfileJobFilter } from "@/lib/profile/profileHelpers";
import { useLanguage } from "@/lib/contexts/LanguageContext";

export type ProfileJobFilterOption = {
  id: ProfileJobFilter;
  label: string;
};

type ProfileJobsFilterBarProps = {
  value: ProfileJobFilter;
  options: ProfileJobFilterOption[];
  onChange: (value: ProfileJobFilter) => void;
  className?: string;
};

/** Flutter profile jobs tab — “Filter” label + status dropdown (All Jobs / Active / Complete). */
export function ProfileJobsFilterBar({
  value,
  options,
  onChange,
  className,
}: ProfileJobsFilterBarProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const selectedLabel = options.find((opt) => opt.id === value)?.label ?? options[0]?.label ?? "";

  const updateMenuPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 152),
      zIndex: 300,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      const list = document.getElementById(listId);
      if (list?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, listId]);

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <ul
            id={listId}
            role="listbox"
            aria-label={t("profile.filter")}
            style={menuStyle}
            className="overflow-hidden rounded-lg border border-white/20 bg-darkBlue-013 shadow-lg"
          >
            {options.map((opt) => {
              const selected = opt.id === value;
              return (
                <li key={opt.id} role="presentation" className="border-b border-white/10 last:border-b-0">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(opt.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full px-3 py-2.5 text-left text-sm font-medium text-white transition-colors",
                      selected
                        ? "bg-[#2563eb] font-semibold"
                        : "hover:bg-darkBlue-203",
                    )}
                  >
                    {opt.label}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div
      className={cn(
        "relative z-0 flex items-center justify-between gap-3 overflow-visible border-b border-gray-200 px-4 py-3 dark:border-[#4a5f8a]/70 lg:px-0",
        open && "z-[50]",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
        <ListFilter className="h-5 w-5 shrink-0" aria-hidden />
        <span>{t("profile.filter")}</span>
      </div>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t("profile.filter")}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex min-w-[9.5rem] shrink-0 items-center justify-between gap-2 rounded-lg border border-[#F21A1A] py-2 pl-3 pr-2 text-sm font-medium",
          "bg-white text-gray-900 dark:bg-darkBlue-203 dark:text-white",
          "focus:outline-none focus:ring-2 focus:ring-[#F21A1A]/40",
          open && "ring-2 ring-[#F21A1A]/40",
        )}
      >
        <span className="min-w-0 truncate">{selectedLabel}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-gray-600 transition-transform dark:text-white/80",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {menu}
    </div>
  );
}
