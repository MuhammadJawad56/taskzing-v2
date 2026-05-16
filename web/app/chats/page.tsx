"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { MessageSquare, RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/api/AuthContext";
import { ChatRoomWithParticipants } from "@/lib/types/message";
import {
  getChatRoomsByUserId,
  subscribeToChatRooms,
} from "@/lib/api/messages";
import { cn } from "@/lib/utils/cn";
import { subscribeToUsersPresence } from "@/lib/api/presence";

export default function ChatsPage() {
  const { user, loading: authLoading } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoomWithParticipants[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [presenceByUserId, setPresenceByUserId] = useState<Record<string, boolean>>(
    {}
  );
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const presenceUserIdsKey = useMemo(() => {
    const ids = [
      ...new Set(
        chatRooms
          .map((r) => r.otherParticipant?.id)
          .filter((id): id is string => Boolean(id))
      ),
    ].sort();
    return ids.join("|");
  }, [chatRooms]);

  useEffect(() => {
    const ids = presenceUserIdsKey
      ? presenceUserIdsKey.split("|").filter(Boolean)
      : [];
    if (ids.length === 0) {
      setPresenceByUserId({});
      return;
    }
    return subscribeToUsersPresence(ids, setPresenceByUserId);
  }, [presenceUserIdsKey]);

  const loadChatRooms = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      const rooms = await getChatRoomsByUserId(user.uid);
      setChatRooms(rooms);
    } catch (err: any) {
      console.error("Error loading chat rooms:", err);
      setError(`Failed to load conversations: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial load of chat rooms
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsLoading(false);
      return;
    }

    loadChatRooms();
  }, [user, authLoading, loadChatRooms]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    // Clean up existing subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    unsubscribeRef.current = subscribeToChatRooms(user.uid, (rooms) => {
      setChatRooms(rooms);
      setIsLoading(false);
      setError(null);
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user?.uid]);

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "";

      const now = new Date();
      const diffDays = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 0) {
        return date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      } else if (diffDays === 1) {
        return "Yesterday";
      } else if (diffDays < 7) {
        return date.toLocaleDateString("en-US", { weekday: "short" });
      } else {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }
    } catch {
      return "";
    }
  };

  // Show loading state during auth check
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Please Log In
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              You need to be logged in to view your messages
            </p>
            <Link
              href="/login"
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Log In
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-theme-primaryText">Messages</h1>
          <button
            onClick={loadChatRooms}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {isLoading ? (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-2"></div>
                <p className="text-gray-500 dark:text-gray-400">Loading conversations...</p>
              </CardContent>
            </Card>
          ) : chatRooms.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <MessageSquare className="h-12 w-12 text-theme-accent4 mx-auto mb-4" />
                <p className="text-theme-accent4 font-medium">No messages yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Start a conversation from a task or profile
                </p>
              </CardContent>
            </Card>
          ) : (
            chatRooms.map((room) => {
              const p = room.otherParticipant;
              const online = p
                ? presenceByUserId[p.id] ?? p.isOnline ?? false
                : false;
              return (
              <Link key={room.chatRoomId} href={`/chats/${room.chatRoomId}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar
                          src={room.otherParticipant?.photoUrl}
                          name={room.otherParticipant?.fullName || "User"}
                        />
                        {p && (
                          <div
                            className={cn(
                              "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-darkBlue-013",
                              online ? "bg-green-500" : "bg-gray-400"
                            )}
                            title={online ? "Online" : "Offline"}
                            aria-hidden
                          />
                        )}
                        {room.unreadCount && room.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1.5 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-[10px] text-white font-semibold leading-none">
                              {room.unreadCount > 9 ? "9+" : room.unreadCount}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-theme-primaryText">
                            {room.otherParticipant?.fullName || "Unknown User"}
                          </h3>
                          {room.lastMessageAt && (
                            <span className="text-xs text-gray-400">
                              {formatTime(room.lastMessageAt)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-theme-accent4 truncate">
                          {room.lastMessage?.text || "No messages yet"}
                        </p>
                        {room.jobId && (
                          <p className="text-xs text-gray-400 mt-1">
                            Task: {room.jobId}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
