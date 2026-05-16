"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { X, Camera } from "lucide-react";
import type { Task } from "@/lib/types/task";
import { useAuth } from "@/lib/api/AuthContext";
import { GhostOverlay } from "@/components/ui/GhostOverlay";
import { acceptGhostOnTab, acceptGhostOnTouchTap } from "@/lib/utils/ghostInputHandlers";
import { findGhostSuggestion } from "@/lib/utils/ghostSuggestion";
import { JOB_EXTRA_WORD_SUGGESTIONS } from "@/lib/constants/jobFieldSuggestions";
import {
  hasProviderAppliedForJob,
  submitJobApplication,
} from "@/lib/api/jobApplications";

const PROPOSAL_FIELD_SUGGESTIONS = [
  "Hi",
  "I am interested",
  "I have experience",
  "I can deliver this project",
  "I am available to start immediately",
  "I can complete this on time",
  "I will provide quality work",
  "Looking forward to your response",
  "Thank you",
] as const;

const BID_FIELD_SUGGESTIONS = [
  "$50",
  "$75",
  "$100",
  "$150",
  "$200",
  "$250",
  "$300",
] as const;

const PROPOSAL_WORD_LIMIT = 1500;
const BID_WORD_LIMIT = 20;
const APPLY_PHOTO_LIMIT = 5;

function countWordsLikeFlutter(text: string): number {
  if (!text || typeof text !== "string") return 0;
  // Existing web Flutter-parity screens count each typed character.
  return text.length;
}

export interface JobProposalApplyModalProps {
  job: Task | null;
  open: boolean;
  onClose: () => void;
  /** Post-login return URL when opening apply without a session */
  loginRedirectPath: string;
}

export function JobProposalApplyModal({ job, open, onClose, loginRedirectPath }: JobProposalApplyModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [proposalText, setProposalText] = useState("");
  const [proposalBid, setProposalBid] = useState("");
  const [proposalPhotos, setProposalPhotos] = useState<File[]>([]);
  const [proposalPhotosPreviews, setProposalPhotosPreviews] = useState<string[]>([]);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const proposalPhotoInputRef = useRef<HTMLInputElement>(null);

  const ghostWordPool = useMemo(
    () => [...PROPOSAL_FIELD_SUGGESTIONS, ...JOB_EXTRA_WORD_SUGGESTIONS],
    []
  );
  const proposalGhost = useMemo(
    () => findGhostSuggestion(proposalText, ghostWordPool, "lastSegment"),
    [proposalText, ghostWordPool]
  );
  const bidGhost = useMemo(
    () => findGhostSuggestion(proposalBid, BID_FIELD_SUGGESTIONS, "full"),
    [proposalBid]
  );
  const proposalWordCount = useMemo(
    () => countWordsLikeFlutter(proposalText),
    [proposalText]
  );
  const bidWordCount = useMemo(
    () => countWordsLikeFlutter(proposalBid),
    [proposalBid]
  );

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (open && job) {
      setProposalText("");
      setProposalBid("");
      setProposalPhotos([]);
      setProposalPhotosPreviews([]);
      setSubmitError(null);
      setAlreadyApplied(false);
    }
  }, [open, job?.jobId]); // eslint-disable-line react-hooks/exhaustive-deps -- reset when open or job id changes

  useEffect(() => {
    if (!open || !isMounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, isMounted]);

  // Prevent duplicate applications — matches Flutter behaviour.
  useEffect(() => {
    let cancelled = false;
    if (!open || !job?.jobId || !user?.uid) return;
    hasProviderAppliedForJob(job.jobId, user.uid)
      .then((already) => {
        if (!cancelled) setAlreadyApplied(already);
      })
      .catch(() => {
        /* ignore — submit() will surface duplicates if any */
      });
    return () => {
      cancelled = true;
    };
  }, [open, job?.jobId, user?.uid]);

  const handleProposalPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = Math.max(0, APPLY_PHOTO_LIMIT - proposalPhotos.length);
    if (remainingSlots <= 0) return;
    const newFiles = Array.from(files).slice(0, remainingSlots);
    const newPreviews: string[] = [];

    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === newFiles.length) {
          setProposalPhotosPreviews((prev) => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    setProposalPhotos((prev) => [...prev, ...newFiles]);
  };

  const removeProposalPhoto = (index: number) => {
    setProposalPhotos((prev) => prev.filter((_, i) => i !== index));
    setProposalPhotosPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitProposal = async () => {
    setSubmitError(null);

    if (!proposalText.trim()) {
      setSubmitError("Please write your proposal");
      return;
    }
    if (!proposalBid.trim()) {
      setSubmitError("Please enter your bid amount");
      return;
    }

    const bidNumber = Number(proposalBid.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(bidNumber) || bidNumber <= 0) {
      setSubmitError("Please enter a valid bid amount");
      return;
    }

    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(loginRedirectPath)}`);
      return;
    }

    if (!job?.jobId) {
      setSubmitError("Missing job — please refresh and try again");
      return;
    }
    if (!job.clientId) {
      setSubmitError("Job is missing a client id — cannot apply");
      return;
    }
    if (job.clientId === user.uid) {
      setSubmitError("You cannot apply to your own job.");
      return;
    }

    setIsSubmittingProposal(true);

    try {
      await submitJobApplication({
        jobId: job.jobId,
        providerId: user.uid,
        clientId: job.clientId,
        proposalText: proposalText.trim(),
        bidAmount: bidNumber,
        imageFiles: proposalPhotos,
      });

      setAlreadyApplied(true);
      onClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to submit proposal. Please try again.";
      setSubmitError(message);
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  if (!open || !job || !isMounted) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/50 z-[1600]" onClick={onClose} />
      <div className="fixed inset-0 z-[1601] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white dark:bg-darkBlue-003 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="job-proposal-modal-title"
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 id="job-proposal-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white pr-2 truncate">
              Apply — {job.title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="px-6 pb-6 pt-4 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Write a Proposal <span className="text-red-500">*</span>
              </label>
              <div className="relative w-full rounded-lg border border-transparent bg-gray-100 dark:bg-darkBlue-203 dark:border-white/15 focus-within:ring-2 focus-within:ring-red-500">
                <GhostOverlay
                  value={proposalText}
                  tail={proposalGhost?.tail ?? ""}
                  multiline
                  paddingClassName="px-4 py-3"
                  radiusClassName="rounded-lg"
                  className="text-sm"
                />
                <textarea
                  value={proposalText}
                  onChange={(e) =>
                    setProposalText(
                      e.target.value.slice(0, PROPOSAL_WORD_LIMIT)
                    )
                  }
                  onKeyDown={(e) =>
                    acceptGhostOnTab(e, proposalGhost, (full) => setProposalText(full))
                  }
                  onPointerDown={(e) =>
                    acceptGhostOnTouchTap(e, proposalGhost, (full) => setProposalText(full))
                  }
                  placeholder="Write your proposal here..."
                  rows={6}
                  className="relative z-[1] w-full min-h-[9.5rem] px-4 py-3 bg-transparent text-gray-900 dark:text-white rounded-lg border-0 focus:outline-none focus:ring-0 text-sm leading-normal resize-none placeholder:text-gray-500/80 dark:placeholder:text-gray-400/80"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
                {proposalWordCount} / {PROPOSAL_WORD_LIMIT} words
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Upload your work</label>
              <p className="mb-2 text-xs text-gray-500 dark:text-white/50">
                {proposalPhotos.length} / {APPLY_PHOTO_LIMIT} photos
              </p>
              <div className="flex flex-wrap gap-3">
                {proposalPhotosPreviews.map((preview, index) => (
                  <div key={index} className="relative w-16 h-16">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt={`Work ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => removeProposalPhoto(index)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                      aria-label="Remove photo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => proposalPhotoInputRef.current?.click()}
                  disabled={proposalPhotos.length >= APPLY_PHOTO_LIMIT}
                  className="w-16 h-16 border-2 border-dashed border-gray-300 dark:border-white/25 dark:bg-darkBlue-203 rounded-lg flex flex-col items-center justify-center hover:border-red-500 dark:hover:border-red-400 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Camera className="h-5 w-5 text-gray-400 dark:text-sky-200/80 mb-1" />
                  <span className="text-xs text-gray-400 dark:text-sky-100/70">Add Photo</span>
                </button>
                <input
                  ref={proposalPhotoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleProposalPhotoSelect}
                  className="hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Bid <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={proposalBid}
                onChange={(e) =>
                  setProposalBid(e.target.value.slice(0, BID_WORD_LIMIT))
                }
                onKeyDown={(e) =>
                  acceptGhostOnTab(e, bidGhost, (full) => setProposalBid(full))
                }
                onPointerDown={(e) =>
                  acceptGhostOnTouchTap(e, bidGhost, (full) => setProposalBid(full))
                }
                placeholder="e.g. $ 150"
                className="w-full px-4 py-3 bg-gray-100 dark:bg-darkBlue-203 dark:border dark:border-white/15 rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 text-sm"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
                {bidWordCount} / {BID_WORD_LIMIT} words
              </p>
            </div>

            {submitError ? (
              <p className="text-sm text-red-500 text-center" role="alert">
                {submitError}
              </p>
            ) : alreadyApplied ? (
              <p className="text-sm text-gray-600 dark:text-white/70 text-center">
                You already applied to this job.
              </p>
            ) : null}

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleSubmitProposal}
                disabled={isSubmittingProposal || alreadyApplied}
                className="px-8 py-2.5 bg-red-500 text-white rounded-full font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingProposal
                  ? "Submitting..."
                  : alreadyApplied
                    ? "Already applied"
                    : "Apply"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
