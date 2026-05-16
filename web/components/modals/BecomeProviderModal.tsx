"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Briefcase, Check, Plus } from "lucide-react";
import { useAuth } from "@/lib/api/AuthContext";
import { becomeProviderWithProfile } from "@/lib/api/auth";
import { Button } from "@/components/ui/Button";

interface BecomeProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const SKILLS = [
  "Cleaning",
  "Plumbing",
  "Electrical",
  "Carpentry",
  "Painting",
  "Landscaping",
  "Moving",
  "Delivery",
  "IT Support",
  "Web Development",
  "Graphic Design",
  "Photography",
  "Tutoring",
  "Consulting",
  "Legal Services",
  "Financial Services",
  "Others",
];

export const BecomeProviderModal: React.FC<BecomeProviderModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const { user, userData } = useAuth();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [serviceDescription, setServiceDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const MAX_PROVIDER_DESCRIPTION_CHARS = 1500;

  useEffect(() => {
    if (!isOpen) return;
    const fromProfile = (
      userData?.bio ||
      userData?.about ||
      userData?.description ||
      ""
    ).trim();
    if (!fromProfile) return;
    setServiceDescription((prev) => {
      if (prev.trim()) return prev;
      return fromProfile.slice(0, MAX_PROVIDER_DESCRIPTION_CHARS);
    });
  }, [isOpen, userData?.bio, userData?.about, userData?.description]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : [...prev, skill]
    );
  };

  const handleSubmit = async () => {
    if (!user) {
      setError("Please sign in to continue");
      return;
    }

    if (selectedSkills.length === 0) {
      setError("Please select at least one skill");
      return;
    }

    if (!serviceDescription.trim()) {
      setError("Please provide a service description");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await becomeProviderWithProfile(user.uid, {
        description: serviceDescription.trim(),
        skills: selectedSkills,
      });

      onComplete();
    } catch (err: any) {
      console.error("Error updating provider profile:", err);
      setError(err.message || "Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-darkBlue-013">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-darkBlue-013">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Become a Provider</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:bg-gray-100 dark:hover:bg-darkBlue-203"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6">
          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Role Confirmation */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-darkBlue-203">
            <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">You are becoming a:</p>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-red-600" />
              <span className="text-red-600 font-medium">Provider</span>
              <div className="ml-auto w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                <Check className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>

          {/* Select Your Skills */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Select Your Skills</h3>
            <div className="grid grid-cols-3 gap-2">
              {SKILLS.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    selectedSkills.includes(skill)
                      ? "bg-red-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-darkBlue-203 dark:text-gray-200 dark:hover:bg-darkBlue-343"
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          {/* Service Description */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Service Description</h3>
            <textarea
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              placeholder="Describe your services and expertise..."
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-gray-600 dark:bg-darkBlue-013 dark:text-white dark:placeholder:text-gray-400"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-3 border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-darkBlue-013">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            isLoading={isSubmitting}
            className="flex-1"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
