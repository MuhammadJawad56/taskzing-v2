"use client";

import { useEffect, useState } from "react";
import { subscribeToChatRooms } from "@/lib/api/messages";
import { isBackendConfigured } from "@/lib/backendConfig";
import type { ChatRoomWithParticipants } from "@/lib/types/message";

/**
 * Live unread totals for dashboard header badges (messages).
 */
export function useHeaderUnreadCounts(userId: string | undefined) {
  const [messageUnread, setMessageUnread] = useState(0);
  const [notificationUnread, setNotificationUnread] = useState(0);

  useEffect(() => {
    if (!userId || !isBackendConfigured()) {
      setMessageUnread(0);
      return;
    }
    const unsub = subscribeToChatRooms(userId, (rooms: ChatRoomWithParticipants[]) => {
      const total = rooms.reduce((acc, r) => acc + (r.unreadCount ?? 0), 0);
      setMessageUnread(total);
    });
    return () => unsub();
  }, [userId]);

  useEffect(() => {
    setNotificationUnread(0);
  }, [userId]);

  return { messageUnread, notificationUnread };
}
