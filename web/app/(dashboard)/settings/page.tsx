"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Avatar } from "@/components/ui/Avatar";
import { getMockSession } from "@/lib/auth/mock";

export default function SettingsPage() {
  const session = getMockSession();
  const initialForm = useMemo(
    () => ({
      fullName: session?.fullName || "",
      email: session?.email || "",
      phone: "",
      location: "",
      bio: "",
      role: "client",
    }),
    [session?.fullName, session?.email],
  );
  const [formData, setFormData] = useState(initialForm);

  const isDirty = useMemo(
    () =>
      formData.fullName !== initialForm.fullName ||
      formData.email !== initialForm.email ||
      formData.phone !== initialForm.phone ||
      formData.location !== initialForm.location ||
      formData.bio !== initialForm.bio ||
      formData.role !== initialForm.role,
    [formData, initialForm],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would update the user profile
    alert("Settings saved successfully!");
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900">Settings</h1>
        <p className="text-secondary-600 mt-2">Manage your account settings</p>
      </div>

      <div className="space-y-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-6 mb-6">
              <Avatar name={formData.fullName} size="xl" />
              <div>
                <Button variant="outline" size="sm">
                  Change Photo
                </Button>
                <p className="text-sm text-secondary-600 mt-2">
                  JPG, PNG or GIF. Max size 2MB
                </p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full Name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <Input
                label="Phone Number"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <Input
                label="Location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
              <Textarea
                label="Bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                placeholder="Tell us about yourself..."
              />
              <Button type="submit" variant="primary" disabled={!isDirty}>
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-secondary-900 mb-2">Change Password</h3>
                <div className="space-y-4">
                  <Input label="Current Password" type="password" />
                  <Input label="New Password" type="password" />
                  <Input label="Confirm New Password" type="password" />
                  <Button variant="outline">Update Password</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <label className="flex items-center space-x-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-secondary-700">Email notifications</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-secondary-700">SMS notifications</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-secondary-700">Push notifications</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-secondary-900 mb-2">Delete Account</h3>
                <p className="text-sm text-secondary-600 mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <Button variant="danger">Delete Account</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

