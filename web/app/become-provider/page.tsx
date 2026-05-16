"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Check, Plus, X } from "lucide-react";
import { useAuth } from "@/lib/api/AuthContext";
import { becomeProviderWithProfile } from "@/lib/api/auth";
import { Button } from "@/components/ui/Button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SKILL_SUGGESTIONS } from "@/lib/constants/skillsCatalog";

export default function BecomeProviderPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);
  const [serviceDescription, setServiceDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const skillsDropdownRef = useRef<HTMLDivElement>(null);
  const MAX_DESCRIPTION_CHARS = 1500;

  // Pre-fill from initial profile (About You → bio / about). Only when the field is still empty so we do not overwrite edits.
  useEffect(() => {
    const fromProfile = (
      userData?.bio ||
      userData?.about ||
      userData?.description ||
      ""
    ).trim();
    if (!fromProfile) return;
    setServiceDescription((prev) => {
      if (prev.trim()) return prev;
      return fromProfile.slice(0, MAX_DESCRIPTION_CHARS);
    });
  }, [userData?.bio, userData?.about, userData?.description]);

  // Check if user is already a provider (Flutter parity: role permanent +
  // hasBeenProvider/providerOnboardingCompleted flags). Legacy "both" /
  // "client+provider" docs still trigger this gate until they migrate.
  useEffect(() => {
    if (userData) {
      const alreadyProvider =
        userData.role === "provider" ||
        userData.role === "both" ||
        userData.role === "client+provider" ||
        userData.hasBeenProvider === true ||
        userData.providerOnboardingCompleted === true ||
        userData.providerProfileCompleted === true;
      if (alreadyProvider) {
        router.push("/dashboard");
        return;
      }
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [userData, router]);

  const filteredSkillSuggestions = useMemo(() => {
    const query = skillInput.trim().toLowerCase();
    if (!query) {
      return SKILL_SUGGESTIONS.filter((skill) => !selectedSkills.includes(skill)).slice(0, 150);
    }

    return SKILL_SUGGESTIONS.filter((skill) => !selectedSkills.includes(skill))
      .filter((skill) => skill.toLowerCase().includes(query))
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(query) ? 0 : 1;
        const bStarts = b.toLowerCase().startsWith(query) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.localeCompare(b);
      })
      .slice(0, 200);
  }, [skillInput, selectedSkills]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        skillsDropdownRef.current &&
        !skillsDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSkillSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !selectedSkills.includes(skill)) {
      setSelectedSkills((prev) => [...prev, skill]);
      setSkillInput("");
      setShowSkillSuggestions(false);
    }
  };

  const addSuggestedSkill = (skill: string) => {
    if (!selectedSkills.includes(skill)) {
      setSelectedSkills((prev) => [...prev, skill]);
      setSkillInput("");
      setShowSkillSuggestions(false);
    }
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills((prev) => prev.filter((s) => s !== skill));
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

      // Redirect to provider dashboard
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("Error updating provider profile:", err);
      setError(err.message || "Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center bg-[var(--app-bg)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-2 sm:px-4 py-2">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            Become a Provider
          </h1>
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-darkBlue-003 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="space-y-5 pb-6">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Role Confirmation */}
          <div className="bg-gray-50 dark:bg-darkBlue-013 border border-indigo-200 dark:border-indigo-700 rounded-xl p-3.5">
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-1.5">You are becoming a:</p>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-red-600" />
              <span className="text-red-600 text-sm font-semibold">Provider</span>
              <div className="ml-auto w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
          </div>

          {/* Select Your Skills */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2.5">Select Your Skills</h2>
            <div className="relative" ref={skillsDropdownRef}>
              <div className="flex items-center gap-2 border border-gray-400 rounded-xl px-3.5 py-2.5 bg-white dark:bg-darkBlue-003">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onFocus={() => setShowSkillSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                  placeholder="Enter a skill (e.g. Plumbing)"
                  className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-500"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Plus className="h-4.5 w-4.5 text-gray-900 dark:text-white" />
                </button>
              </div>

              {showSkillSuggestions && (
                <div className="absolute z-20 mt-2 w-full bg-white dark:bg-darkBlue-003 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
                  <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 dark:border-gray-700">
                    Showing {filteredSkillSuggestions.length} matches from {SKILL_SUGGESTIONS.length}+ skills
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {filteredSkillSuggestions.length > 0 ? (
                      filteredSkillSuggestions.map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => addSuggestedSkill(skill)}
                          className="w-full px-3 py-2 text-left text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-50 dark:border-gray-700 last:border-b-0"
                        >
                          {skill}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-3 text-sm text-gray-500">
                        No matching skills found. You can still add a custom skill.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {selectedSkills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedSkills.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                  >
                    {skill} ×
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Profile Description */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2.5">Profile Description</h2>
            <textarea
              value={serviceDescription}
              onChange={(e) => {
                const next = e.target.value;
                if (next.length <= MAX_DESCRIPTION_CHARS) {
                  setServiceDescription(next);
                }
              }}
              placeholder="Describe your services and expertise..."
              rows={4}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white bg-white dark:bg-darkBlue-003 resize-none text-sm"
            />
            <div className="mt-2 text-right text-sm text-gray-500">
              {serviceDescription.length} / {MAX_DESCRIPTION_CHARS}
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
              isLoading={isSubmitting}
              className="w-full h-12 rounded-xl text-lg font-semibold"
            >
              Become a Provider
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
