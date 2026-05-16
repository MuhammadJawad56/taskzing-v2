/**
 * Message/Chat types
 * Based on the messages and chat_rooms table schema
 */

export type MessageType = "text" | "image" | "file" | "audio" | "video" | "location" | "contact";
export type MessageStatus = "pending" | "sending" | "sent" | "delivered" | "read" | "failed";

export interface ChatRoom {
  chatRoomId: string;
  participantIds: string[];
  lastMessage?: Message;
  lastMessageAt?: string;
  jobId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  messageId: string;
  localId?: string;
  chatRoomId: string;
  senderId: string;
  type: MessageType;
  text?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number;
  replyToMessageId?: string;
  replyToSenderId?: string;
  replyPreview?: string;
  status: MessageStatus;
  reactions?: Record<string, string[]>; // emoji -> user IDs
  timestamp: string;
  editedAt?: string;
  deletedAt?: string;
  deletedForEveryone: boolean;
  jobId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MessageWithSender extends Message {
  sender?: {
    id: string;
    fullName: string;
    photoUrl?: string;
  };
}

export interface ChatRoomWithParticipants extends ChatRoom {
  participants?: Array<{
    id: string;
    fullName: string;
    photoUrl?: string;
  }>;
  otherParticipant?: {
    id: string;
    fullName: string;
    photoUrl?: string;
    /** Best-effort from user doc at load; prefer live presence subscription in UI */
    isOnline?: boolean;
  };
  unreadCount?: number;
}

