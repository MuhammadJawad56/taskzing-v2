"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/api/AuthContext";
import { ChatRoomWithParticipants, MessageWithSender } from "@/lib/types/message";
import { Task } from "@/lib/types/task";
import { cn } from "@/lib/utils/cn";
import {
  getChatRoomsByUserId,
  subscribeToChatRooms,
  getMessagesByChatRoomId,
  sendMessage,
  subscribeToMessages,
  deleteMessageForMe,
  deleteMessageForEveryone,
  markMessagesAsRead,
} from "@/lib/api/messages";
import { getJobById } from "@/lib/api/jobs";
import { RefreshCw, AlertCircle, MessageSquare, Send, MoreVertical, Trash2, Camera } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { subscribeToUsersPresence } from "@/lib/api/presence";

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [chatRooms, setChatRooms] = useState<ChatRoomWithParticipants[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomWithParticipants | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [job, setJob] = useState<Task | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [presenceByUserId, setPresenceByUserId] = useState<Record<string, boolean>>({});
  const [failedAvatarKeys, setFailedAvatarKeys] = useState<Record<string, true>>({});

  const getAvatarSrc = useCallback(
    (key: string, src?: string) => {
      const clean = src?.trim();
      if (!clean) return undefined;
      return failedAvatarKeys[`${key}:${clean}`] ? undefined : clean;
    },
    [failedAvatarKeys]
  );

  const markAvatarFailed = useCallback((key: string, src?: string) => {
    const clean = src?.trim();
    if (!clean) return;
    const cacheKey = `${key}:${clean}`;
    setFailedAvatarKeys((prev) => (prev[cacheKey] ? prev : { ...prev, [cacheKey]: true }));
  }, []);

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRoomsUnsubRef = useRef<(() => void) | null>(null);
  const messagesUnsubRef = useRef<(() => void) | null>(null);
  const isSubscribedRef = useRef(false);

  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load chat rooms
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

  // Load job details
  const loadJob = useCallback(async (jobId: string) => {
    try {
      const jobData = await getJobById(jobId);
      setJob(jobData);
    } catch (err) {
      console.error("Error loading job:", err);
      setJob(null);
    }
  }, []);

  // Load messages for selected room
  const loadMessages = useCallback(async (chatRoomId: string) => {
    if (!user) return;

    try {
      setError(null);
      const msgs = await getMessagesByChatRoomId(chatRoomId);
      setMessages(msgs);
      
      // Find the room and load job if exists
      const room = chatRooms.find((r) => r.chatRoomId === chatRoomId);
      if (room) {
        setSelectedRoom(room);
        if (room.jobId) {
          loadJob(room.jobId);
        } else {
          setJob(null);
        }
      }
    } catch (err: any) {
      console.error("Error loading messages:", err);
      setError(`Failed to load messages: ${err.message}`);
    }
  }, [user, chatRooms, loadJob]);

  // Handle room selection
  const handleSelectRoom = async (room: ChatRoomWithParticipants) => {
    if (isMobile) {
      // Mobile: navigate to separate page
      router.push(`/chats/${room.chatRoomId}`);
    } else {
      // Desktop: show in split view
      setSelectedRoomId(room.chatRoomId);
      loadMessages(room.chatRoomId);
      
      // Mark messages as read immediately when opening conversation
      if (user && room.unreadCount && room.unreadCount > 0) {
        try {
          await markMessagesAsRead(room.chatRoomId, user.uid);
        } catch (err) {
          console.error("Error marking messages as read:", err);
        }
      }
    }
  };

  // Initial load
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setIsLoading(false);
      setError("Please log in to view messages");
      return;
    }

    loadChatRooms();
  }, [user, authLoading, loadChatRooms]);

  // Subscribe to chat rooms
  useEffect(() => {
    if (!user || isSubscribedRef.current) return;

    isSubscribedRef.current = true;
    
    if (chatRoomsUnsubRef.current) {
      chatRoomsUnsubRef.current();
    }

    chatRoomsUnsubRef.current = subscribeToChatRooms(user.uid, (rooms) => {
      console.log("Chat rooms updated:", rooms.map(r => ({ id: r.chatRoomId, unread: r.unreadCount })));
      setChatRooms(rooms);
      setIsLoading(false);
      setError(null);
      
      // Update selected room if it exists
      if (selectedRoomId) {
        const updatedRoom = rooms.find((r) => r.chatRoomId === selectedRoomId);
        if (updatedRoom) {
          setSelectedRoom(updatedRoom);
        }
      }
    });

    return () => {
      if (chatRoomsUnsubRef.current) {
        chatRoomsUnsubRef.current();
        chatRoomsUnsubRef.current = null;
      }
      isSubscribedRef.current = false;
    };
  }, [user?.uid, selectedRoomId]);

  // Subscribe to messages for selected room
  useEffect(() => {
    if (!selectedRoomId || !user || isMobile) return;

    if (messagesUnsubRef.current) {
      messagesUnsubRef.current();
      messagesUnsubRef.current = null;
    }

    messagesUnsubRef.current = subscribeToMessages(selectedRoomId, async (msgs) => {
      setMessages(msgs);
      
      // Mark messages as read when viewing them
      const room = chatRooms.find((r) => r.chatRoomId === selectedRoomId);
      if (room && room.unreadCount && room.unreadCount > 0) {
        try {
          await markMessagesAsRead(selectedRoomId, user.uid);
        } catch (err) {
          console.error("Error marking messages as read:", err);
        }
      }
    });

    return () => {
      if (messagesUnsubRef.current) {
        messagesUnsubRef.current();
        messagesUnsubRef.current = null;
      }
    };
  }, [selectedRoomId, user?.uid, isMobile, chatRooms]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoomId || !user || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(selectedRoomId, user.uid, newMessage.trim());
      setNewMessage("");
    } catch (err: any) {
      console.error("Error sending message:", err);
      alert(`Failed to send message: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  // Delete message handlers
  const handleDeleteForMe = async (messageId: string) => {
    if (!selectedRoomId || !user) return;
    
    try {
      await deleteMessageForMe(selectedRoomId, messageId, user.uid);
      setShowDeleteMenu(false);
      setSelectedMessage(null);
    } catch (err: any) {
      console.error("Error deleting message:", err);
      alert(`Failed to delete message: ${err.message}`);
    }
  };

  const handleDeleteForEveryone = async (messageId: string) => {
    if (!selectedRoomId || !user) return;
    
    if (!confirm("Are you sure you want to delete this message for everyone?")) {
      return;
    }
    
    try {
      await deleteMessageForEveryone(selectedRoomId, messageId, user.uid);
      setShowDeleteMenu(false);
      setSelectedMessage(null);
    } catch (err: any) {
      console.error("Error deleting message:", err);
      alert(`Failed to delete message: ${err.message}`);
    }
  };

  // Format functions
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "";
      
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
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

  const formatMessageTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  };

  const formatMessageDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "";

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
      } else {
        return date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        });
      }
    } catch {
      return "";
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatMessageDate(message.timestamp);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, MessageWithSender[]>);

  // Show loading state during auth check
  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
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
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] max-lg:-mx-4 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white sm:max-lg:-mx-6 lg:h-[calc(100vh-200px)] lg:flex-row max-lg:rounded-none max-lg:border-transparent max-lg:bg-transparent dark:rounded-none dark:border-transparent dark:bg-transparent">
      {/* Left Panel - Message List */}
      <div className={cn(
        "flex flex-col border-gray-200 dark:border-gray-600 lg:border-r",
        isMobile ? "w-full" : "w-full lg:w-1/3"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-600 dark:bg-transparent">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h1>
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
          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading conversations...</p>
            </div>
          ) : chatRooms.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No conversations yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Start a conversation from a task or profile
              </p>
            </div>
          ) : (
            chatRooms.map((room) => {
              const p = room.otherParticipant;
              const participantName = p?.fullName || "User";
              const roomAvatarSrc = getAvatarSrc(`room:${room.chatRoomId}:participant`, p?.photoUrl);
              const online = p
                ? presenceByUserId[p.id] ?? p.isOnline ?? false
                : false;
              return (
              <button
                key={room.chatRoomId}
                onClick={() => handleSelectRoom(room)}
                className={cn(
                  "flex w-full items-center gap-3 border-b border-gray-100 px-4 py-4 text-left transition-colors last:border-b-0 dark:border-gray-700 sm:px-6 lg:p-4",
                  selectedRoomId === room.chatRoomId
                    ? "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    : "hover:bg-gray-50 dark:hover:bg-white/5"
                )}
              >
                {/* Profile Picture */}
                <div className="relative flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    {roomAvatarSrc ? (
                      <img
                        src={roomAvatarSrc}
                        alt={participantName}
                        className="h-full w-full object-cover"
                        onError={() => markAvatarFailed(`room:${room.chatRoomId}:participant`, p?.photoUrl)}
                      />
                    ) : (
                      <span className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                        {(p?.fullName || "U").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
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
                    <div className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5">
                      <span className="text-[10px] font-semibold leading-none text-white">
                        {room.unreadCount > 9 ? "9+" : room.unreadCount}
                      </span>
                    </div>
                  )}
                </div>

                {/* Name and Message */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-gray-900 dark:text-white">
                      {p?.fullName || "Unknown User"}
                    </p>
                    {room.lastMessageAt && (
                      <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
                        {formatTime(room.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  {room.lastMessage?.text && (
                    <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                      {room.lastMessage.text}
                    </p>
                  )}
                </div>
              </button>
            );
            })
          )}
        </div>
      </div>

      {/* Right Panel - Chat Window (Desktop Only) */}
      {!isMobile && (
        <div className="hidden flex-1 flex-col bg-gray-50 lg:flex dark:bg-transparent">
          {selectedRoomId && selectedRoom ? (
            <>
              {/* Chat Header */}
              <div className="flex flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-600 dark:bg-transparent">
                {selectedRoom.otherParticipant?.id ? (
                  <Link
                    href={`/profile/${selectedRoom.otherParticipant.id}`}
                    prefetch={false}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 pl-0.5 pr-2 -my-0.5 transition-colors hover:bg-gray-100/90 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-transparent"
                    aria-label={`View profile of ${selectedRoom.otherParticipant.fullName || "this user"}`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        {getAvatarSrc(
                          `selected:${selectedRoom.chatRoomId}:participant`,
                          selectedRoom.otherParticipant.photoUrl
                        ) ? (
                          <img
                            src={getAvatarSrc(
                              `selected:${selectedRoom.chatRoomId}:participant`,
                              selectedRoom.otherParticipant.photoUrl
                            )}
                            alt={selectedRoom.otherParticipant.fullName || "User"}
                            className="h-full w-full object-cover"
                            onError={() =>
                              markAvatarFailed(
                                `selected:${selectedRoom.chatRoomId}:participant`,
                                selectedRoom.otherParticipant?.photoUrl
                              )
                            }
                          />
                        ) : (
                          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                            {(selectedRoom.otherParticipant.fullName || "U").charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div
                        className={cn(
                          "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-darkBlue-013",
                          (presenceByUserId[selectedRoom.otherParticipant.id] ??
                            selectedRoom.otherParticipant.isOnline ??
                            false)
                            ? "bg-green-500"
                            : "bg-gray-400"
                        )}
                        title={
                          (presenceByUserId[selectedRoom.otherParticipant.id] ??
                            selectedRoom.otherParticipant.isOnline ??
                            false)
                            ? "Online"
                            : "Offline"
                        }
                        aria-hidden
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-base font-semibold text-gray-900 dark:text-white">
                        {selectedRoom.otherParticipant.fullName || "User"}
                      </h2>
                      {job?.title ? (
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{job.title}</p>
                      ) : null}
                    </div>
                  </Link>
                ) : (
                  <>
                    <div className="relative flex-shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        {getAvatarSrc(
                          `selected:${selectedRoom.chatRoomId}:participant`,
                          selectedRoom.otherParticipant?.photoUrl
                        ) ? (
                          <img
                            src={getAvatarSrc(
                              `selected:${selectedRoom.chatRoomId}:participant`,
                              selectedRoom.otherParticipant?.photoUrl
                            )}
                            alt={selectedRoom.otherParticipant?.fullName || "User"}
                            className="h-full w-full object-cover"
                            onError={() =>
                              markAvatarFailed(
                                `selected:${selectedRoom.chatRoomId}:participant`,
                                selectedRoom.otherParticipant?.photoUrl
                              )
                            }
                          />
                        ) : (
                          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                            {(selectedRoom.otherParticipant?.fullName || "U").charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      {selectedRoom.otherParticipant && (
                        <div
                          className={cn(
                            "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-darkBlue-013",
                            (presenceByUserId[selectedRoom.otherParticipant.id] ??
                              selectedRoom.otherParticipant.isOnline ??
                              false)
                              ? "bg-green-500"
                              : "bg-gray-400"
                          )}
                          title={
                            (presenceByUserId[selectedRoom.otherParticipant.id] ??
                              selectedRoom.otherParticipant.isOnline ??
                              false)
                              ? "Online"
                              : "Offline"
                          }
                          aria-hidden
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-base font-semibold text-gray-900 dark:text-white">
                        {selectedRoom.otherParticipant?.fullName || "Unknown User"}
                      </h2>
                      {job?.title ? (
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{job.title}</p>
                      ) : null}
                    </div>
                  </>
                )}

                {selectedRoom.jobId ? (
                  <Link
                    href={`/job-details/${selectedRoom.jobId}`}
                    className="flex-shrink-0 rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    View Job
                  </Link>
                ) : null}
              </div>

              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-2">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center">
                    <MessageSquare className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-400" />
                    <p className="text-gray-500 dark:text-gray-200">No messages yet</p>
                    <p className="mt-1 text-sm text-gray-400 dark:text-gray-300">
                      Start the conversation!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0.5 w-full">
                    {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                      <div key={date} className="w-full">
                        {/* Date separator */}
                        <div className="flex items-center justify-center my-4">
                          <span className="rounded-full bg-gray-200 px-3 py-1 text-xs text-gray-500 dark:bg-white dark:text-gray-600">
                            {date}
                          </span>
                        </div>

                        {/* Messages for this date */}
                        {dateMessages
                          .filter((msg) => {
                            const deletedFor = msg.metadata?.deletedFor as string[] | undefined;
                            if (deletedFor && Array.isArray(deletedFor)) {
                              return !deletedFor.includes(user?.uid || "");
                            }
                            return true;
                          })
                          .map((message, index) => {
                            const isOwn = message.senderId === user?.uid;
                            const prevMessage = index > 0 ? dateMessages[index - 1] : null;
                            const nextMessage = index < dateMessages.length - 1 ? dateMessages[index + 1] : null;
                            const showAvatar = !isOwn && (!prevMessage || prevMessage.senderId !== message.senderId);
                            const showTime = !nextMessage || nextMessage.senderId !== message.senderId;
                            const isDeleted = message.deletedForEveryone || message.text === "This message was deleted";
                            const canDelete = isOwn && !isDeleted;
                            const messageTime = new Date(message.timestamp);
                            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
                            const canDeleteForEveryone = canDelete && messageTime >= oneHourAgo;
                            
                            return (
                              <div
                                key={message.messageId}
                                className={cn(
                                  "flex mb-0.5 group relative items-end w-full",
                                  isOwn ? "justify-end" : "justify-start"
                                )}
                              >
                                {/* Avatar */}
                                {!isOwn && (
                                  <div className={cn(
                                    "w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0",
                                    showAvatar ? "mr-2" : "w-0 mr-0 opacity-0 pointer-events-none"
                                  )}>
                                    {showAvatar && (
                                      <>
                                        {getAvatarSrc(
                                          `sender:${message.sender?.id || message.senderId}`,
                                          message.sender?.photoUrl
                                        ) ? (
                                          <img
                                            src={getAvatarSrc(
                                              `sender:${message.sender?.id || message.senderId}`,
                                              message.sender?.photoUrl
                                            )}
                                            alt={message.sender?.fullName || "User"}
                                            className="w-full h-full rounded-full object-cover"
                                            onError={() =>
                                              markAvatarFailed(
                                                `sender:${message.sender?.id || message.senderId}`,
                                                message.sender?.photoUrl
                                              )
                                            }
                                          />
                                        ) : (
                                          <span className="text-xs text-gray-500 font-semibold">
                                            {(message.sender?.fullName || "U").charAt(0).toUpperCase()}
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                                
                                {/* Message Bubble */}
                                <div
                                  className={cn(
                                    "max-w-[75%] rounded-lg px-3 py-2 relative break-words",
                                    isOwn
                                      ? "bg-red-500 text-white rounded-br-sm"
                                      : "bg-white dark:bg-darkBlue-003 text-gray-900 dark:text-white rounded-bl-sm",
                                    isDeleted && "opacity-70 italic"
                                  )}
                                  style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                                  onContextMenu={(e) => {
                                    if (canDelete) {
                                      e.preventDefault();
                                      setSelectedMessage(message.messageId);
                                      setShowDeleteMenu(true);
                                    }
                                  }}
                                >
                                  {canDelete && (
                                    <button
                                      onClick={() => {
                                        setSelectedMessage(message.messageId);
                                        setShowDeleteMenu(true);
                                      }}
                                      className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full ml-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded z-10"
                                      aria-label="Delete message"
                                    >
                                      <MoreVertical className="h-4 w-4 text-gray-500" />
                                    </button>
                                  )}
                                  
                                  {!isOwn && showAvatar && message.sender && (
                                    <p className="text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">
                                      {message.sender.fullName}
                                    </p>
                                  )}
                                  <p className={cn(
                                    "text-sm whitespace-pre-wrap break-words leading-relaxed",
                                    isDeleted && "italic text-gray-500 dark:text-gray-400"
                                  )}>
                                    {isDeleted ? "This message was deleted" : (message.text || "")}
                                  </p>
                                  {message.mediaUrl && !isDeleted && (
                                    <div className="mt-2 -mx-3 -mb-2">
                                      <img
                                        src={message.mediaUrl}
                                        alt="Media"
                                        className="w-full rounded-lg"
                                      />
                                    </div>
                                  )}
                                  {showTime && (
                                    <p
                                      className={cn(
                                        "text-xs mt-1 flex items-center gap-1",
                                        isOwn ? "justify-end text-red-100" : "justify-start text-gray-400 dark:text-gray-500"
                                      )}
                                    >
                                      {formatMessageTime(message.timestamp)}
                                      {isOwn && message.status && !isDeleted && (
                                        <span className="ml-1">
                                          {message.status === "sent" && "✓"}
                                          {message.status === "delivered" && "✓✓"}
                                          {message.status === "read" && "✓✓"}
                                        </span>
                                      )}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-600 dark:bg-transparent">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <button
                    type="button"
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Camera className="h-5 w-5" />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message here"
                    className="flex-1 rounded-full border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm placeholder-gray-400 focus:!border-transparent focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-gray-300 dark:bg-white dark:text-gray-900 dark:placeholder:text-gray-500"
                    disabled={isSending}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    className={cn(
                      "px-4 py-2.5 rounded-full transition-all duration-200 flex-shrink-0",
                      newMessage.trim() && !isSending
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-white/90 dark:text-gray-400"
                    )}
                  >
                    {isSending ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    ) : (
                      <span className="text-sm font-medium">Send</span>
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <MessageSquare className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-400" />
                <p className="font-medium text-gray-500 dark:text-gray-200">Select a conversation</p>
                <p className="mt-1 text-sm text-gray-400 dark:text-gray-300">
                  Choose a conversation from the list to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Menu Modal */}
      {showDeleteMenu && selectedMessage && (() => {
        const selectedMsg = messages.find(m => m.messageId === selectedMessage);
        if (!selectedMsg) return null;
        const isOwn = selectedMsg.senderId === user?.uid;
        const messageTime = new Date(selectedMsg.timestamp);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const canDeleteForEveryone = isOwn && messageTime >= oneHourAgo && !selectedMsg.deletedForEveryone;
        
        return (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => {
                setShowDeleteMenu(false);
                setSelectedMessage(null);
              }}
            />
            <div className="fixed inset-x-4 bottom-24 bg-white dark:bg-darkBlue-003 rounded-lg shadow-lg z-50 p-2">
              {canDeleteForEveryone && (
                <button
                  onClick={() => handleDeleteForEveryone(selectedMessage)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex items-center gap-3 text-red-600 dark:text-red-400"
                >
                  <Trash2 className="h-5 w-5" />
                  <div>
                    <p className="font-semibold">Delete for everyone</p>
                    <p className="text-xs text-gray-500">Remove this message for all participants</p>
                  </div>
                </button>
              )}
              <button
                onClick={() => handleDeleteForMe(selectedMessage)}
                className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex items-center gap-3 text-gray-700 dark:text-gray-300"
              >
                <Trash2 className="h-5 w-5" />
                <div>
                  <p className="font-semibold">Delete for me</p>
                  <p className="text-xs text-gray-500">Remove this message from your view</p>
                </div>
              </button>
              <button
                onClick={() => {
                  setShowDeleteMenu(false);
                  setSelectedMessage(null);
                }}
                className="w-full px-4 py-3 text-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300 font-semibold"
              >
                Cancel
              </button>
            </div>
          </>
        );
      })()}
    </div>
  );
}
