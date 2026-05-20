"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, X } from "lucide-react";
import { useAuth } from "@/lib/api/AuthContext";
import { resolveProfileDisplayName } from "@/lib/api/auth";
import { cn } from "@/lib/utils/cn";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import {
  getPlatformName,
  saveFeedbackSubmission,
} from "@/lib/settings/feedbackStorage";

export default function SuggestionsComplaintsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, userData, loading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedbackType, setFeedbackType] = useState<"suggestion" | "complaint">("complaint");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasTypedFeedbackContent = useMemo(
    () => subject.trim().length > 0 || message.trim().length > 0,
    [subject, message]
  );

  const userEmail = user?.email || userData?.email || "";
  const userName = resolveProfileDisplayName(user, userData);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-theme-accent4">Loading...</div>
        </div>
      </div>
    );
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 3) {
      alert("You can only upload up to 3 images");
      return;
    }

    const newImages = [...images, ...files.slice(0, 3 - images.length)];
    setImages(newImages);

    const newPreviews = newImages.map((file) => URL.createObjectURL(file));
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImagePreviews(newPreviews);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasTypedFeedbackContent) return;

    if (!subject.trim() || !message.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      saveFeedbackSubmission({
        type: feedbackType,
        subject: subject.trim(),
        message: message.trim(),
        userEmail: userEmail.trim(),
        userName: userName.trim(),
        platform: getPlatformName(),
        hasImages: images.length > 0,
        imageCount: images.length,
        userId: user?.uid || "",
      });

      alert(t("settings.feedbackSuccess"));

      setSubject("");
      setMessage("");
      setFeedbackType("complaint");
      setImages([]);
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setImagePreviews([]);

      router.push("/dashboard/settings");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md text-gray-900 dark:text-white md:max-w-2xl lg:max-w-3xl">
      <div className="rounded-3xl md:border md:border-gray-200 md:bg-white/80 md:p-8 lg:p-10 dark:md:border-white/15 dark:md:bg-[#0b4266]/40">
      <div className="mb-4 md:mb-6">
        <button
          onClick={() => router.push("/dashboard/settings")}
          className="mb-4 flex items-center text-gray-800 transition-opacity hover:opacity-80 dark:text-white/90"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
        </button>
        <h1 className="text-4xl font-extrabold leading-none tracking-tight md:text-5xl">
          Suggestions & Complaints
        </h1>
      </div>

      <div className="mb-5 flex items-center gap-3 md:mb-7">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#19a974] text-2xl font-semibold text-white">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="text-base font-medium text-gray-900 dark:text-white">{userName}</h3>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 pb-4 md:space-y-6 md:pb-0">
        <div>
          <label className="mb-2 block text-[15px] font-semibold text-gray-900 dark:text-white">
            Your Email
          </label>
          <input
            type="email"
            value={userEmail}
            disabled
            className="h-12 w-full rounded-[18px] border border-gray-300 bg-gray-100 px-4 text-[14px] text-gray-900 disabled:cursor-not-allowed dark:border-white/30 dark:bg-white/90 dark:text-[#1d2b39]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setFeedbackType("suggestion")}
              className={`h-9 min-w-[132px] rounded-full px-5 py-1.5 text-[16px] font-semibold leading-none md:h-auto md:min-w-0 md:px-6 md:py-2 md:text-[18px] ${
                feedbackType === "suggestion"
                  ? "bg-[#ff2a33] text-white"
                  : "bg-[#d3dde7] text-gray-900 dark:bg-[#315c80] dark:text-white"
              }`}
            >
              Suggestion
            </button>
            <button
              type="button"
              onClick={() => setFeedbackType("complaint")}
              className={`h-9 min-w-[132px] rounded-full px-5 py-1.5 text-[16px] font-semibold leading-none md:h-auto md:min-w-0 md:px-6 md:py-2 md:text-[18px] ${
                feedbackType === "complaint"
                  ? "bg-[#ff2a33] text-white"
                  : "bg-[#d3dde7] text-gray-900 dark:bg-[#315c80] dark:text-white"
              }`}
            >
              Complaint
            </button>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[15px] font-semibold text-gray-900 dark:text-white">
              Subject <span className="text-[#ff5f5f]">*</span>
            </label>
            <span className="text-xs text-gray-600 dark:text-white/80">{subject.length}/100</span>
          </div>
          <input
            type="text"
            value={subject}
            maxLength={100}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What is your feedback about?"
            required
            className="h-14 w-full rounded-[18px] border-2 border-gray-300 bg-white px-4 text-[16px] text-gray-900 placeholder:text-gray-500 focus:outline-none dark:border-white/80 dark:bg-transparent dark:text-white dark:placeholder:text-white/75"
          />
          <div className="mt-2 text-right text-[18px] leading-none text-gray-600 dark:text-white/90">
            {subject.length}/100
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[15px] font-semibold text-gray-900 dark:text-white">
              Message <span className="text-[#ff5f5f]">*</span>
            </label>
            <span className="text-xs text-gray-600 dark:text-white/80">{message.length}/1500</span>
          </div>
          <textarea
            value={message}
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= 1500) {
                setMessage(value);
              }
            }}
            placeholder="Please provide detailed feedback..."
            rows={5}
            required
            className="min-h-[140px] w-full resize-none rounded-[18px] border-2 border-gray-300 bg-white px-4 py-4 text-[16px] text-gray-900 placeholder:text-gray-500 focus:outline-none dark:border-white/80 dark:bg-transparent dark:text-white dark:placeholder:text-white/75"
          />
          <div className="mt-2 text-right text-[18px] leading-none text-gray-600 dark:text-white/90">
            {message.length}/1500
          </div>
        </div>

        {feedbackType === "complaint" ? (
          <div>
            <label className="mb-3 block text-[22px] font-semibold leading-tight text-black dark:text-white md:text-[18px]">
              Evidence Images <span className="text-[15px] font-normal text-black/70 dark:text-white/80 md:text-[14px]">(upto three images allowed)</span>
            </label>
            <div className="flex flex-wrap gap-4">
              {imagePreviews.map((preview, index) => (
                <div key={preview} className="relative h-32 w-32 overflow-hidden rounded-2xl border border-white/40 md:h-28 md:w-28">
                  <img src={preview} alt={`Evidence ${index + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute right-1 top-1 rounded-full bg-black/65 p-1 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < 3 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-32 w-32 flex-col items-center justify-center rounded-2xl bg-white text-black md:h-28 md:w-28 dark:bg-white/85 dark:text-gray-700"
                >
                  <Camera className="mb-1 h-8 w-8" />
                  <span className="text-base font-medium md:text-sm">Add Photo</span>
                </button>
              ) : null}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || !hasTypedFeedbackContent}
          className={cn(
            "mt-6 block h-[66px] w-full rounded-[16px] text-[16px] font-bold transition-colors disabled:cursor-not-allowed md:mx-auto md:mt-8 md:h-14 md:max-w-sm",
            hasTypedFeedbackContent
              ? "bg-[#ff1122] text-white hover:opacity-95 disabled:!opacity-70"
              : "bg-[#8E8E93] text-white/80 disabled:!opacity-100 dark:bg-[#5C5C5E] dark:text-white/55"
          )}
        >
          {isSubmitting ? "Sending..." : "Send Feedback"}
        </button>
      </form>
      </div>
    </div>
  );
}

