"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function AccountDeletionPage() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const requiredText = "DELETE";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (confirmText !== requiredText) {
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      router.push("/");
    }, 1000);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-theme-primaryText mb-8">Delete Account</h1>
        
        <Card className="border-accent-error">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="h-6 w-6 text-accent-error" />
              <CardTitle className="text-accent-error">Warning: This action cannot be undone</CardTitle>
            </div>
            <CardDescription>
              Deleting your account will permanently remove all your data, including tasks, proposals, and messages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <p className="text-sm text-theme-accent4 mb-2">
                  To confirm, please type <strong className="text-theme-primaryText">DELETE</strong> in the box below:
                </p>
                <Input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  required
                />
              </div>
              <div className="flex gap-4">
                <Button
                  type="submit"
                  variant="danger"
                  disabled={confirmText !== requiredText}
                  isLoading={isLoading}
                >
                  Delete My Account
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

