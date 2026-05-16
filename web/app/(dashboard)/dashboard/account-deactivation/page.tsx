"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

const deactivationReasons = [
  "I have a duplicate or second account.",
  "I'm concerned about my privacy or data security.",
  "I no longer find the app useful.",
  "I'm taking a break or spending too much time here.",
  "I'm switching to a different platform.",
  "I'm not satisfied with the app experience.",
  "I'm receiving too many emails or notifications.",
  "Other (please specify)",
];

export default function AccountDeactivationPage() {
  const router = useRouter();
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [otherReason, setOtherReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOtherSelected = selectedReason === "Other (please specify)";
  const minChars = 50;
  const maxChars = 1500;
  const isValid = selectedReason && (!isOtherSelected || (otherReason.length >= minChars && otherReason.length <= maxChars));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Implement account deactivation API call
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      
      alert("Your account deactivation request has been submitted. We're sorry to see you go!");
      router.push("/login");
    } catch (error) {
      console.error("Error deactivating account:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.push("/dashboard/settings")}
          className="mb-4 flex items-center text-theme-primaryText dark:text-white hover:text-primary-500 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span>Back</span>
        </button>
        <h1 className="text-3xl font-bold text-theme-primaryText dark:text-white">Account Deactivation</h1>
        <p className="text-theme-accent4 mt-2">Select a Reason for Deactivating Your Account</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Radio Options */}
            <div className="space-y-4">
              {deactivationReasons.map((reason, index) => (
                <label
                  key={index}
                  className="flex items-start gap-3 cursor-pointer group"
                >
                  <input
                    type="radio"
                    name="deactivationReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="mt-1 h-5 w-5 text-primary-500 border-2 border-primary-500 focus:ring-primary-500 focus:ring-2 cursor-pointer accent-primary-500"
                    style={{ accentColor: '#ef4444' }}
                  />
                  <span className="flex-1 text-theme-primaryText dark:text-white group-hover:text-primary-500 transition-colors">
                    {reason}
                  </span>
                </label>
              ))}
            </div>

            {/* Other Reason Textarea */}
            {isOtherSelected && (
              <div className="mt-4">
                <div className="relative">
                  <Textarea
                    value={otherReason}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= maxChars) {
                        setOtherReason(value);
                      }
                    }}
                    placeholder="Please specify... (50-1500 characters)"
                    rows={6}
                    className={`pr-24 ${
                      otherReason.length > 0 && otherReason.length < minChars
                        ? "border-accent-error focus:border-accent-error focus:ring-accent-error"
                        : "border-gray-300"
                    }`}
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-theme-accent4">
                    {otherReason.length}/{maxChars} characters {otherReason.length > 0 && otherReason.length < minChars && `(min: ${minChars})`}
                  </div>
                </div>
                {otherReason.length > 0 && otherReason.length < minChars && (
                  <p className="mt-2 text-sm text-accent-error">
                    Please enter at least {minChars} characters.
                  </p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                variant={isValid ? "primary" : "outline"}
                size="lg"
                disabled={!isValid || isSubmitting}
                isLoading={isSubmitting}
                className="min-w-[120px]"
              >
                Submit
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

