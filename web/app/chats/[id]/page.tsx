"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/api/AuthContext";
import { ChatRoomWithParticipants, MessageWithSender } from "@/lib/types/message";
import {
  getChatRoomsByUserId,
  getMessagesByChatRoomId,
  sendMessage,
  subscribeToMessages,
  deleteMessageForMe,
  deleteMessageForEveryone,
  markMessagesAsRead,
} from "@/lib/api/messages";
import { Send, ArrowLeft, AlertCircle, MessageSquare, MoreVertical, Trash2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { subscribeToUsersPresence } from "@/lib/api/presence";

export default function ChatDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const chatRoomId = params.id as string;

  const { user, loading: authLoading } = useAuth();
  const [chatRoom, setChatRoom] = useState<ChatRoomWithParticipants | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesUnsubRef = useRef<(() => void) | null>(null);
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

  const otherParticipantId = chatRoom?.otherParticipant?.id;
  useEffect(() => {
    if (!otherParticipantId) {
      setPresenceByUserId({});
      return;
    }
    return subscribeToUsersPresence([otherParticipantId], setPresenceByUserId);
  }, [otherParticipantId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load chat room data
  const loadChatRoom = useCallback(async () => {
    if (!user || !chatRoomId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get chat rooms and find the current one
      const rooms = await getChatRoomsByUserId(user.uid);
      const room = rooms.find((r) => r.chatRoomId === chatRoomId);

      if (room) {
        setChatRoom(room);
        
        // Mark messages as read when opening conversation
        if (room.unreadCount && room.unreadCount > 0) {
          try {
            await markMessagesAsRead(chatRoomId, user.uid);
          } catch (err) {
            console.error("Error marking messages as read:", err);
          }
        }
      } else {
        setError("Chat room not found");
      }

      // Load initial messages
      const msgs = await getMessagesByChatRoomId(chatRoomId);
      setMessages(msgs);
    } catch (err: any) {
      console.error("Error loading chat:", err);
      setError(`Failed to load chat: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [user, chatRoomId]);

  // Initial load
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsLoading(false);
      return;
    }

    loadChatRoom();
  }, [user, authLoading, loadChatRoom]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!chatRoomId || !user) return;

    // Clean up existing subscription
    if (messagesUnsubRef.current) {
      messagesUnsubRef.current();
      messagesUnsubRef.current = null;
    }

    console.log("Setting up messages subscription for room:", chatRoomId);

    messagesUnsubRef.current = subscribeToMessages(chatRoomId, async (msgs) => {
      console.log("Received messages update:", msgs.length, "messages");
      setMessages(msgs);
      
      // Mark messages as read when viewing them in real-time
      if (chatRoom && chatRoom.unreadCount && chatRoom.unreadCount > 0) {
        try {
          await markMessagesAsRead(chatRoomId, user.uid);
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
  }, [chatRoomId, user?.uid, chatRoom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatRoomId || !user || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(chatRoomId, user.uid, newMessage.trim());
      setNewMessage("");
    } catch (err: any) {
      console.error("Error sending message:", err);
      alert(`Failed to send message: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteForMe = async (messageId: string) => {
    if (!chatRoomId || !user) return;
    
    try {
      await deleteMessageForMe(chatRoomId, messageId, user.uid);
      setShowDeleteMenu(false);
      setSelectedMessage(null);
    } catch (err: any) {
      console.error("Error deleting message for me:", err);
      alert(`Failed to delete message: ${err.message}`);
    }
  };

  const handleDeleteForEveryone = async (messageId: string) => {
    if (!chatRoomId || !user) return;
    
    if (!confirm("Are you sure you want to delete this message for everyone?")) {
      return;
    }
    
    try {
      await deleteMessageForEveryone(chatRoomId, messageId, user.uid);
      setShowDeleteMenu(false);
      setSelectedMessage(null);
    } catch (err: any) {
      console.error("Error deleting message for everyone:", err);
      alert(`Failed to delete message: ${err.message}`);
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
      <DashboardLayout>
        <div className="max-w-4xl mx-auto h-[calc(100vh-200px)] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
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
              You need to be logged in to view messages
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
      <div className="-mx-4 -my-8 flex h-[calc(100vh-64px-80px)] flex-col overflow-x-hidden bg-gray-50 sm:-mx-6 lg:mx-auto lg:my-0 lg:h-[calc(100vh-64px-32px)] lg:max-w-4xl lg:-mx-8 dark:bg-transparent">
        {/* Header - WhatsApp style */}
        <div className="z-10 flex flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-600 dark:bg-transparent">
          <button
            onClick={() => router.push("/messages")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Back to messages"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>

          {chatRoom?.otherParticipant?.id ? (
            <Link
              href={`/profile/${chatRoom.otherParticipant?.id || ""}`}
              prefetch={false}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 pl-0.5 pr-2 -my-0.5 transition-colors hover:bg-gray-100/90 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-transparent"
              aria-label={`View profile of ${chatRoom.otherParticipant?.fullName || "this user"}`}
            >
              <div className="relative flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  {getAvatarSrc(
                    `chat-header:${chatRoom.chatRoomId}:participant`,
                    chatRoom.otherParticipant?.photoUrl
                  ) ? (
                    <img
                      src={getAvatarSrc(
                        `chat-header:${chatRoom.chatRoomId}:participant`,
                        chatRoom.otherParticipant?.photoUrl
                      )}
                      alt={chatRoom?.otherParticipant?.fullName || "User"}
                      className="h-full w-full object-cover"
                      onError={() =>
                        markAvatarFailed(
                          `chat-header:${chatRoom.chatRoomId}:participant`,
                          chatRoom.otherParticipant?.photoUrl
                        )
                      }
                    />
                  ) : (
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {(chatRoom.otherParticipant?.fullName || "U").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div
                  className={cn(
                    "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-darkBlue-013",
                    (presenceByUserId[chatRoom.otherParticipant.id] ??
                      chatRoom.otherParticipant.isOnline ??
                      false)
                      ? "bg-green-500"
                      : "bg-gray-400"
                  )}
                  title={
                    (presenceByUserId[chatRoom.otherParticipant.id] ??
                      chatRoom.otherParticipant.isOnline ??
                      false)
                      ? "Online"
                      : "Offline"
                  }
                  aria-hidden
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-semibold text-gray-900 dark:text-white">
                  {chatRoom.otherParticipant?.fullName || "User"}
                </h2>
                {chatRoom.jobId ? (
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">Task: {chatRoom.jobId}</p>
                ) : null}
              </div>
            </Link>
          ) : (
            <>
              <div className="relative flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  {getAvatarSrc(
                    `chat-header:${chatRoom?.chatRoomId || chatRoomId}:participant`,
                    chatRoom?.otherParticipant?.photoUrl
                  ) ? (
                    <img
                      src={getAvatarSrc(
                        `chat-header:${chatRoom?.chatRoomId || chatRoomId}:participant`,
                        chatRoom?.otherParticipant?.photoUrl
                      )}
                      alt={chatRoom?.otherParticipant?.fullName || "User"}
                      className="h-full w-full object-cover"
                      onError={() =>
                        markAvatarFailed(
                          `chat-header:${chatRoom?.chatRoomId || chatRoomId}:participant`,
                          chatRoom?.otherParticipant?.photoUrl
                        )
                      }
                    />
                  ) : (
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {(chatRoom?.otherParticipant?.fullName || "U").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {chatRoom?.otherParticipant && (
                  <div
                    className={cn(
                      "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-darkBlue-013",
                      (presenceByUserId[chatRoom.otherParticipant.id] ??
                        chatRoom.otherParticipant.isOnline ??
                        false)
                        ? "bg-green-500"
                        : "bg-gray-400"
                    )}
                    title={
                      (presenceByUserId[chatRoom.otherParticipant.id] ??
                        chatRoom.otherParticipant.isOnline ??
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
                  {chatRoom?.otherParticipant?.fullName || "Unknown User"}
                </h2>
                {chatRoom?.jobId ? (
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">Task: {chatRoom.jobId}</p>
                ) : null}
              </div>
            </>
          )}
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

        {/* Messages Container - Single Column WhatsApp Style */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 px-4 py-2 dark:bg-transparent">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          ) : messages.length === 0 ? (
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

                  {/* Messages for this date - Single Column */}
                  {dateMessages
                    .filter((msg) => {
                      // Filter out messages deleted for current user (if deletedFor array exists)
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
                        {/* Avatar - Only shown for first message from sender */}
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
                            "max-w-[75%] sm:max-w-[65%] rounded-lg px-3 py-2 relative break-words",
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
                            onTouchStart={(e) => {
                              if (!canDelete) return;
                              const touch = e.touches[0];
                              const startTime = Date.now();
                              const startY = touch.clientY;
                              
                              const handleTouchEnd = () => {
                                const endTime = Date.now();
                                const endY = e.changedTouches?.[0]?.clientY || touch.clientY;
                                
                                // Long press: > 500ms and minimal movement
                                if (endTime - startTime > 500 && Math.abs(endY - startY) < 10) {
                                  setSelectedMessage(message.messageId);
                                  setShowDeleteMenu(true);
                                }
                                
                                document.removeEventListener("touchend", handleTouchEnd);
                              };
                              
                              document.addEventListener("touchend", handleTouchEnd, { once: true });
                            }}
                          >
                          {canDelete && (
                            <button
                              onClick={() => {
                                setSelectedMessage(message.messageId);
                                setShowDeleteMenu(true);
                              }}
                              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full ml-1 opacity-0 group-hover:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded z-10"
                              aria-label="Delete message"
                            >
                              <MoreVertical className="h-4 w-4 text-gray-500" />
                            </button>
                          )}
                          
                          {!isOwn && showAvatar && message.sender && (
                            <p className="text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">
                              {message.sender?.fullName || "User"}
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

        {/* Message Input - Fixed at bottom */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-600 dark:bg-transparent">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 rounded-full border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm placeholder-gray-400 focus:!border-transparent focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-gray-300 dark:bg-white dark:text-gray-900 dark:placeholder:text-gray-500"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className={cn(
                "p-2.5 rounded-full transition-all duration-200 flex-shrink-0",
                newMessage.trim() && !isSending
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-white/90 dark:text-gray-400"
              )}
            >
              {isSending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
