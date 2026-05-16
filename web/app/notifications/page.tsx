"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/api/AuthContext";
import { isBackendConfigured } from "@/lib/backendConfig";

type NotificationKind = "success" | "warning" | "error" | "info";

type UserNotification = {
  id: string;
  title: string;
  message: string;
  type: NotificationKind;
  eventType: string;
  read: boolean;
  createdAtMs: number;
  routeHint: string | null;
  jobId: string | null;
  chatRoomId: string | null;
  showcaseId: string | null;
  profileUserId: string | null;
  targetUserId: string | null;
};

function storageKey(uid: string): string {
  return `taskzing_user_notifications_${uid}`;
}

function loadNotifications(uid: string): UserNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? (arr as UserNotification[]) : [];
  } catch {
    return [];
  }
}

function saveNotifications(uid: string, rows: UserNotification[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify(rows));
  } catch {
    // ignore
  }
}

function normalizeRoutePath(raw: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const parsed = new URL(value);
      const path = `${parsed.pathname}${parsed.search || ""}${parsed.hash || ""}`;
      return path || null;
    } catch {
      return null;
    }
  }
  return value.startsWith("/") ? value : `/${value}`;
}

function resolveNotificationHref(notification: UserNotification): string | null {
  const directPath = normalizeRoutePath(notification.routeHint);
  if (directPath) return directPath;

  if (notification.chatRoomId) return `/chats/${notification.chatRoomId}`;
  if (notification.jobId) return `/job-details/${notification.jobId}`;
  if (notification.showcaseId) return `/work-details/${notification.showcaseId}`;
  if (notification.profileUserId) return `/profile/${notification.profileUserId}`;
  if (notification.targetUserId) return `/profile/${notification.targetUserId}`;

  const t = notification.eventType.toLowerCase();
  if (t.includes("message") || t.includes("chat")) return "/messages";
  if (t.includes("job") || t.includes("proposal") || t.includes("application")) return "/all-jobs";
  if (t.includes("showcase")) return "/showcase-work";
  if (t.includes("profile")) return "/my-profile";
  return null;
}

function formatTime(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleString();
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid || !isBackendConfigured()) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const rows = loadNotifications(user.uid).sort((a, b) => b.createdAtMs - a.createdAtMs);
      setNotifications(rows);
    } catch {
      setError("Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-accent-success" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-accent-yellow" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-primary-500" />;
    }
  };

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.read),
    [notifications]
  );

  const markNotificationRead = async (id: string) => {
    if (!user?.uid) return;
    const target = notifications.find((n) => n.id === id);
    if (!target || target.read) return;
    const next = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(next);
    saveNotifications(user.uid, next);
  };

  const handleNotificationClick = async (notification: UserNotification) => {
    const href = resolveNotificationHref(notification);
    if (!notification.read) {
      void markNotificationRead(notification.id);
    }
    if (href) {
      router.push(href);
    }
  };

  const markAllRead = async () => {
    if (!user?.uid || unreadNotifications.length === 0) return;
    setMarkingAllRead(true);
    try {
      const next = notifications.map((n) => ({ ...n, read: true }));
      setNotifications(next);
      saveNotifications(user.uid, next);
    } finally {
      setMarkingAllRead(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <Button
            type="button"
            onClick={markAllRead}
            disabled={markingAllRead || unreadNotifications.length === 0}
            className="bg-red-500 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {markingAllRead ? "Updating..." : "Mark all as read"}
          </Button>
        </div>

        <div className="space-y-2">
          {loading ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-600 dark:text-white">Loading notifications...</p>
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-red-500">{error}</p>
              </CardContent>
            </Card>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Bell className="mx-auto mb-4 h-12 w-12 text-gray-500 dark:text-gray-400" />
                <p className="text-gray-600 dark:text-white">No notifications yet</p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Push-style alerts will appear here when the backend notification API is wired up.
                </p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => {
              const href = resolveNotificationHref(notification);
              const clickable = Boolean(href) || !notification.read;
              return (
                <Card
                  key={notification.id}
                  className={[
                    !notification.read ? "border-l-4 border-l-primary-500" : "",
                    clickable ? "cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/5" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={clickable ? () => void handleNotificationClick(notification) : undefined}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {getIcon(notification.type)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{notification.title}</h3>
                          {!notification.read && (
                            <Badge
                              variant="default"
                              className="shrink-0 bg-gray-200 text-gray-900 dark:bg-white/15 dark:text-white"
                            >
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-200">{notification.message}</p>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-300">
                          {formatTime(notification.createdAtMs)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
