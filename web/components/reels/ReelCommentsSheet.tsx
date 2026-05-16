"use client";

import React, { useEffect, useState } from "react";
import { Send } from "lucide-react";
import type { Reel, ReelComment } from "@/lib/reels/types";
import { useLanguage } from "@/lib/contexts/LanguageContext";

export function ReelCommentsSheet({
  open,
  reel,
  onClose,
  loadComments,
  onSubmitComment,
}: {
  open: boolean;
  reel: Reel | null;
  onClose: () => void;
  loadComments: (reelId: string) => Promise<ReelComment[]>;
  onSubmitComment: (reelId: string, text: string) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [items, setItems] = useState<ReelComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!open || !reel) return;
    setText("");
    setLoading(true);
    void loadComments(reel.id).then((list) => {
      setItems(list);
      setLoading(false);
    });
  }, [open, reel, loadComments]);

  if (!open || !reel) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60" role="dialog" aria-modal>
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div
        className="relative z-[1] flex max-h-[65vh] w-full max-w-lg flex-col rounded-t-2xl bg-zinc-900/95 p-3 pb-[env(safe-area-inset-bottom,12px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center text-sm font-medium text-white">{t("reels.comments")}</p>
        <div className="mt-2 flex min-h-[200px] flex-1 flex-col overflow-hidden">
          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <p className="flex flex-1 items-center justify-center text-sm text-white/60">{t("reels.noComments")}</p>
          ) : (
            <ul className="flex-1 space-y-2 overflow-y-auto pr-1">
              {items.map((c) => (
                <li key={c.id} className="border-b border-white/10 pb-2">
                  <p className="text-sm font-medium text-white">@{c.user.username}</p>
                  <p className="text-sm text-white/70">{c.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2 border-t border-white/10 pt-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("reels.writeComment")}
            className="min-w-0 flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none"
          />
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white"
            onClick={async () => {
              const t = text.trim();
              if (!t) return;
              await onSubmitComment(reel.id, t);
              setText("");
              const next = await loadComments(reel.id);
              setItems(next);
            }}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
