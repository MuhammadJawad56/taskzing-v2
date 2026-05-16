"use client";

import React, { useState } from "react";
import {
  finalizeReel,
  putVideoToUploadUrl,
  requestReelUploadSlot,
} from "@/lib/api/reels";
import { useLanguage } from "@/lib/contexts/LanguageContext";

function videoContentType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".webm")) return "video/webm";
  return "video/mp4";
}

export function ReelUploadSheet({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  if (!open) return null;

  const submit = async () => {
    if (!file) {
      setError(t("reels.uploadChooseError"));
      return;
    }
    setBusy(true);
    setError(null);
    setProgress(0.05);
    try {
      const contentType = videoContentType(file.name);
      const slot = await requestReelUploadSlot({
        fileName: file.name,
        contentType,
        byteSize: file.size,
      });
      setProgress(0.15);
      const buf = await file.arrayBuffer();
      await putVideoToUploadUrl(slot.uploadUrl, buf, contentType, slot.headers);
      setProgress(0.85);
      await finalizeReel({ objectKey: slot.objectKey, caption: caption.trim() });
      setProgress(1);
      setFile(null);
      setCaption("");
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("reels.uploadFailed"));
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal>
      <button type="button" className="absolute inset-0" aria-label={t("common.cancel")} onClick={onClose} />
      <div
        className="relative z-[1] w-full max-w-md rounded-2xl bg-zinc-900 p-5 text-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">{t("reels.uploadTitle")}</h2>
        <p className="mt-1 text-sm text-white/60">{t("reels.uploadSubtitle")}</p>
        <div className="mt-4">
          <input
            type="file"
            accept="video/*"
            disabled={busy}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-white/90 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-black"
          />
        </div>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={t("reels.caption")}
          rows={3}
          disabled={busy}
          className="mt-3 w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none"
        />
        {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
        {busy && progress > 0 ? (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-white transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full px-4 py-2 text-sm text-white/80"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {busy ? t("reels.uploading") : t("reels.uploadButton")}
          </button>
        </div>
      </div>
    </div>
  );
}
