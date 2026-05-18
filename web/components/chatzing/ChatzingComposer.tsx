"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, Mic, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const MAX_TEXTAREA_HEIGHT = 200;

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onImageFile: (file: File) => void;
  onClearImage: () => void;
  imagePreview?: string | null;
  disabled?: boolean;
  canSend?: boolean;
  placeholder?: string;
  locale: "en" | "fr";
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  fileInputRef?: React.RefObject<HTMLInputElement>;
  onVoiceClick?: () => void;
  isRecording?: boolean;
  className?: string;
};

export function ChatzingComposer({
  value,
  onChange,
  onSend,
  onImageFile,
  onClearImage,
  imagePreview,
  disabled,
  canSend = true,
  placeholder,
  locale,
  textareaRef: externalTextareaRef,
  fileInputRef,
  onVoiceClick,
  isRecording = false,
  className,
}: Props) {
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalTextareaRef ?? internalTextareaRef;

  const [isDragOver, setIsDragOver] = useState(false);
  const dragDepthRef = useRef(0);

  const isFr = locale === "fr";
  const resolvedPlaceholder =
    placeholder ??
    (imagePreview
      ? isFr
        ? "Posez une question sur cette image…"
        : "Ask about this image…"
      : isFr
        ? "Envoyer un message…"
        : "Ask anything");

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [textareaRef]);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const pickImageFromFileList = (files: FileList | null | undefined) => {
    const file = files?.[0];
    if (!file?.type.startsWith("image/")) return;
    onImageFile(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragOver(false);
    if (disabled) return;
    pickImageFromFileList(e.dataTransfer.files);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (disabled) return;
    const file = Array.from(e.clipboardData.files).find((f) =>
      f.type.startsWith("image/")
    );
    if (!file) return;
    e.preventDefault();
    onImageFile(file);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend && !disabled) onSend();
    }
  };

  const sendEnabled = canSend && !disabled;
  const showSendButton = sendEnabled && !isRecording;
  const showVoiceButton = !!onVoiceClick && !showSendButton;

  return (
    <div className={cn("relative w-full", className)}>
      <div
        className="relative flex w-full items-end gap-2"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isDragOver && !disabled && (
          <div
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[26px] border-2 border-dashed border-gray-400/80 bg-white/90 backdrop-blur-sm dark:border-white/40 dark:bg-[#2f2f2f]/95"
            aria-hidden
          >
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {isFr ? "Déposez une image ici" : "Drop image here"}
            </p>
          </div>
        )}

        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col rounded-[26px] border bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_2px_12px_rgba(0,0,0,0.08)] transition-shadow",
            "border-black/10 dark:border-white/10 dark:bg-[#2f2f2f] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06)]",
            isDragOver && !disabled && "ring-2 ring-gray-300/80 dark:ring-white/20"
          )}
        >
        {imagePreview && (
          <div className="flex items-start gap-2 px-3 pt-3">
            <div className="relative flex-shrink-0">
              <img
                src={imagePreview}
                alt=""
                className="h-14 w-14 rounded-xl object-cover ring-1 ring-black/10 dark:ring-white/10"
              />
              <button
                type="button"
                onClick={onClearImage}
                disabled={disabled}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-[#3a3a3a] dark:text-gray-200 dark:hover:bg-[#454545]"
                aria-label={isFr ? "Retirer l'image" : "Remove image"}
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-end gap-1 px-2 pb-2 pt-1 sm:px-3 sm:pb-3">
          <button
            type="button"
            onClick={() => fileInputRef?.current?.click()}
            disabled={disabled}
            className="mb-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-white/10"
            aria-label={isFr ? "Joindre une image" : "Attach image"}
          >
            <Plus className="h-5 w-5" strokeWidth={2} />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={resolvedPlaceholder}
            disabled={disabled}
            className="max-h-[200px] min-h-[44px] flex-1 resize-none border-0 bg-transparent py-3 text-[15px] leading-6 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-100 dark:placeholder:text-gray-400"
            aria-label={isFr ? "Message" : "Message"}
          />

          {showVoiceButton ? (
            <button
              type="button"
              onClick={onVoiceClick}
              disabled={disabled}
              className={cn(
                "mb-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-colors",
                isRecording
                  ? "bg-red-500/15 text-red-500 animate-pulse dark:bg-red-500/20 dark:text-red-400"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200"
              )}
              aria-label={
                isRecording
                  ? isFr
                    ? "Arrêter l'enregistrement"
                    : "Stop recording"
                  : isFr
                    ? "Message vocal"
                    : "Voice message"
              }
              aria-pressed={isRecording}
            >
              {isRecording ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Mic className="h-5 w-5" strokeWidth={2} />
              )}
            </button>
          ) : null}
        </div>
        </div>

        {showSendButton && (
          <button
            type="button"
            onClick={onSend}
            disabled={!sendEnabled}
            className="mb-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-black text-white shadow-md transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            aria-label={isFr ? "Envoyer" : "Send message"}
          >
            <ArrowUp className="h-5 w-5" strokeWidth={2.25} />
          </button>
        )}
      </div>

      <p className="mt-2 text-center text-[11px] leading-snug text-gray-500 dark:text-gray-400">
        {isFr
          ? "ChatZing peut faire des erreurs. Vérifiez les informations importantes."
          : "ChatZing can make mistakes. Check important info."}
      </p>
    </div>
  );
}
