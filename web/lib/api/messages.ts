/**
 * Local-only chat persistence (device/browser). Replace with a messages API when available.
 */
import type {
  ChatRoom,
  ChatRoomWithParticipants,
  Message,
  MessageWithSender,
} from "@/lib/types/message";
import { getUserById, getUserProfileImageUrl } from "./users";
import { userAppearsOnline } from "./presence";
import { AUTH_TOKEN_STORAGE_KEY } from "./http";

const COLLECTION_CHAT_ROOMS_SNAKE = "chat_rooms";
const SUB_MESSAGES = "messages";

type ChatRoot = typeof COLLECTION_CHAT_ROOMS_SNAKE;

const roomCollectionById = new Map<string, ChatRoot>();

const ROOMS_KEY = "taskzing_local_chat_rooms";

function msgsKey(roomId: string): string {
  return `taskzing_local_chat_msgs_${roomId}`;
}

function readRooms(): Record<string, Record<string, unknown>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ROOMS_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as unknown;
    return o && typeof o === "object" ? (o as Record<string, Record<string, unknown>>) : {};
  } catch {
    return {};
  }
}

function writeRooms(rooms: Record<string, Record<string, unknown>>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
  } catch {
    // ignore
  }
}

function readMsgs(roomId: string): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(msgsKey(roomId));
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? (arr as Message[]) : [];
  } catch {
    return [];
  }
}

function writeMsgs(roomId: string, msgs: Message[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(msgsKey(roomId), JSON.stringify(msgs));
  } catch {
    // ignore
  }
}

function getUidFromToken(): string | null {
  if (typeof window === "undefined") return null;
  const t = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (!t) return null;
  try {
    const part = t.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(b64)) as Record<string, unknown>;
    return String(json.sub ?? json.userId ?? json.id ?? "") || null;
  } catch {
    return null;
  }
}

export async function resolveChatRoomCollection(
  chatRoomId: string
): Promise<ChatRoot> {
  if (roomCollectionById.has(chatRoomId)) {
    return roomCollectionById.get(chatRoomId)!;
  }
  roomCollectionById.set(chatRoomId, COLLECTION_CHAT_ROOMS_SNAKE);
  return COLLECTION_CHAT_ROOMS_SNAKE;
}

function rememberRoomCollection(roomId: string, root: ChatRoot): void {
  roomCollectionById.set(roomId, root);
}

function tsToISO(value: unknown): string {
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

function docToChatRoom(id: string, data: Record<string, unknown>): ChatRoom {
  const participants = Array.isArray(data.participants)
    ? (data.participants as string[])
    : [];
  return {
    chatRoomId: id,
    participantIds: participants,
    jobId: (data.jobId as string) || undefined,
    lastMessageAt: data.lastMessageAt ? tsToISO(data.lastMessageAt) : undefined,
    createdAt: tsToISO(data.createdAt),
    updatedAt: tsToISO(data.updatedAt),
  };
}

function messageTextFromDoc(data: Record<string, unknown>): string | undefined {
  const flat = typeof data.text === "string" ? data.text : undefined;
  const content = data.content as Record<string, unknown> | undefined;
  const nested =
    content && typeof content.text === "string" ? content.text : undefined;
  return flat || nested || undefined;
}

function docToMessage(id: string, data: Record<string, unknown>): Message {
  return {
    messageId: (typeof data.id === "string" && data.id ? data.id : id) || id,
    chatRoomId: String(data.chatRoomId ?? ""),
    senderId: String(data.senderId ?? ""),
    type: (data.type as Message["type"]) || "text",
    text: messageTextFromDoc(data),
    mediaUrl: (data.mediaUrl as string) || undefined,
    status: (data.status as Message["status"]) || "sent",
    timestamp: tsToISO(data.timestamp ?? data.createdAt),
    deletedForEveryone: !!data.deletedForEveryone,
    deletedAt: data.deletedAt ? tsToISO(data.deletedAt) : undefined,
    metadata: (data.metadata as Record<string, unknown>) || undefined,
    createdAt: tsToISO(data.createdAt),
    updatedAt: tsToISO(data.updatedAt),
  };
}

function sortMessages(msgs: Message[]): Message[] {
  return [...msgs].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

async function enrichMessage(message: Message): Promise<MessageWithSender> {
  const sender = await getUserById(message.senderId);
  return {
    ...message,
    sender: sender
      ? {
          id: sender.uid,
          fullName:
            sender.fullName || sender.username || sender.email.split("@")[0],
          photoUrl: getUserProfileImageUrl(sender),
        }
      : { id: message.senderId, fullName: "Unknown User" },
  };
}

async function enrichRoom(
  room: ChatRoom,
  currentUserId: string
): Promise<ChatRoomWithParticipants> {
  const participantIds = room.participantIds || [];
  const otherUserId =
    participantIds.find((pid) => pid !== currentUserId) || participantIds[0];

  const [otherUser, allUsers] = await Promise.all([
    otherUserId ? getUserById(otherUserId) : Promise.resolve(null),
    Promise.all(participantIds.map((pid) => getUserById(pid))),
  ]);

  const allMsgs = sortMessages(readMsgs(room.chatRoomId));
  const lastMessage =
    allMsgs.length > 0 ? allMsgs[allMsgs.length - 1] : undefined;

  const rooms = readRooms();
  const roomData = rooms[room.chatRoomId] || {};
  const readBy = (roomData.readBy as Record<string, string>) || {};
  const lastReadAt = readBy[currentUserId];

  const unreadCount = allMsgs.filter((m) => {
    if (m.senderId === currentUserId) return false;
    if (m.deletedForEveryone) return false;
    if (!lastReadAt) return true;
    return new Date(m.timestamp).getTime() > new Date(lastReadAt).getTime();
  }).length;

  return {
    ...room,
    lastMessage,
    lastMessageAt:
      lastMessage?.timestamp || room.lastMessageAt || room.updatedAt,
    participants: allUsers
      .filter((u): u is NonNullable<typeof u> => !!u)
      .map((u) => ({
        id: u.uid,
        fullName: u.fullName || u.username || u.email.split("@")[0],
        photoUrl: getUserProfileImageUrl(u),
      })),
    otherParticipant: otherUser
      ? {
          id: otherUser.uid,
          fullName:
            otherUser.fullName ||
            otherUser.username ||
            otherUser.email.split("@")[0],
          photoUrl: getUserProfileImageUrl(otherUser),
          isOnline: userAppearsOnline(otherUser),
        }
      : otherUserId
        ? {
            id: otherUserId,
            fullName: "Unknown User",
            isOnline: false,
          }
        : undefined,
    unreadCount,
  };
}

export async function getChatRoomsByUserId(
  userId: string
): Promise<ChatRoomWithParticipants[]> {
  const rooms = readRooms();
  const list: ChatRoom[] = [];
  for (const [id, data] of Object.entries(rooms)) {
    const participants = Array.isArray(data.participants)
      ? (data.participants as string[])
      : [];
    if (participants.includes(userId)) {
      rememberRoomCollection(id, COLLECTION_CHAT_ROOMS_SNAKE);
      list.push(docToChatRoom(id, data));
    }
  }
  list.sort(
    (a, b) =>
      new Date(b.lastMessageAt || b.updatedAt).getTime() -
      new Date(a.lastMessageAt || a.updatedAt).getTime()
  );
  return Promise.all(list.map((r) => enrichRoom(r, userId)));
}

export async function getMessagesByChatRoomId(
  chatRoomId: string,
  _userId?: string
): Promise<MessageWithSender[]> {
  const msgs = sortMessages(readMsgs(chatRoomId));
  return Promise.all(msgs.map(enrichMessage));
}

export async function sendMessage(
  chatRoomId: string,
  senderId: string,
  text: string
): Promise<MessageWithSender> {
  const messageId = `msg-${Date.now()}`;
  const now = new Date().toISOString();
  const msg: Message = {
    messageId,
    chatRoomId,
    senderId,
    type: "text",
    text,
    status: "sent",
    timestamp: now,
    deletedForEveryone: false,
    createdAt: now,
    updatedAt: now,
  };
  const msgs = readMsgs(chatRoomId);
  msgs.push(msg);
  writeMsgs(chatRoomId, msgs);

  const rooms = readRooms();
  const existing = rooms[chatRoomId] || {};
  rooms[chatRoomId] = {
    ...existing,
    chatRoomId,
    lastMessageAt: now,
    updatedAt: now,
    lastMessage: {
      id: messageId,
      text,
      type: "text",
      senderId,
      timestamp: now,
      status: "sent",
    },
  };
  writeRooms(rooms);

  return enrichMessage(msg);
}

export async function deleteMessageForMe(
  chatRoomId: string,
  messageId: string,
  userId: string
): Promise<void> {
  const msgs = readMsgs(chatRoomId);
  const idx = msgs.findIndex((m) => m.messageId === messageId);
  if (idx < 0) return;
  const data = msgs[idx] as unknown as Record<string, unknown>;
  const deletedFor = Array.isArray(data.deletedFor)
    ? [...(data.deletedFor as string[])]
    : [];
  if (!deletedFor.includes(userId)) deletedFor.push(userId);
  msgs[idx] = {
    ...msgs[idx],
    metadata: {
      ...((msgs[idx].metadata as Record<string, unknown>) || {}),
      deletedFor,
    },
  } as Message;
  writeMsgs(chatRoomId, msgs);
}

export async function deleteMessageForEveryone(
  chatRoomId: string,
  messageId: string,
  userId: string
): Promise<void> {
  const msgs = readMsgs(chatRoomId);
  const idx = msgs.findIndex((m) => m.messageId === messageId);
  if (idx < 0) return;
  if (msgs[idx].senderId !== userId) return;
  const now = new Date().toISOString();
  msgs[idx] = {
    ...msgs[idx],
    text: "This message was deleted",
    deletedForEveryone: true,
    deletedAt: now,
    updatedAt: now,
  };
  writeMsgs(chatRoomId, msgs);
}

export async function markMessagesAsRead(
  chatRoomId: string,
  userId: string
): Promise<void> {
  const rooms = readRooms();
  const room = rooms[chatRoomId];
  if (!room) return;
  const readBy = (room.readBy as Record<string, string>) || {};
  readBy[userId] = new Date().toISOString();
  rooms[chatRoomId] = { ...room, readBy };
  writeRooms(rooms);
}

export function subscribeToMessages(
  chatRoomId: string,
  callback: (messages: MessageWithSender[]) => void,
  _userId?: string
): () => void {
  if (typeof window === "undefined") return () => {};
  let cancelled = false;
  const tick = async () => {
    if (cancelled) return;
    const msgs = await getMessagesByChatRoomId(chatRoomId);
    if (!cancelled) callback(msgs);
  };
  void tick();
  const id = window.setInterval(() => void tick(), 2000);
  return () => {
    cancelled = true;
    window.clearInterval(id);
  };
}

export function subscribeToChatRooms(
  userId: string,
  callback: (rooms: ChatRoomWithParticipants[]) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  let cancelled = false;
  const tick = async () => {
    if (cancelled) return;
    const rooms = await getChatRoomsByUserId(userId);
    if (!cancelled) callback(rooms);
  };
  void tick();
  const id = window.setInterval(() => void tick(), 3000);
  return () => {
    cancelled = true;
    window.clearInterval(id);
  };
}

export async function getOrCreateChatRoom(
  participantIds: string[],
  jobId?: string
): Promise<string> {
  const authUid = getUidFromToken();
  if (!authUid) {
    throw new Error("You are not authenticated yet. Please try again.");
  }

  const cleanIds = Array.from(
    new Set(
      participantIds.filter(
        (id): id is string => typeof id === "string" && id.length > 0
      )
    )
  );
  if (!cleanIds.includes(authUid)) cleanIds.unshift(authUid);
  if (cleanIds.length < 2) {
    throw new Error("Cannot start a chat without another user.");
  }

  const userId1 = cleanIds[0];
  const userId2 = cleanIds[1];
  const sorted = [userId1, userId2].slice().sort();
  const chatRoomId = jobId
    ? `${sorted[0]}_${sorted[1]}_job_${jobId}`
    : `${sorted[0]}_${sorted[1]}`;

  const rooms = readRooms();
  if (rooms[chatRoomId]) {
    rememberRoomCollection(chatRoomId, COLLECTION_CHAT_ROOMS_SNAKE);
    return chatRoomId;
  }

  const now = new Date().toISOString();
  rooms[chatRoomId] = {
    id: chatRoomId,
    type: jobId ? "job" : "direct",
    participants: [userId1, userId2],
    metadata: jobId ? { jobId } : {},
    jobId: jobId ?? null,
    lastMessage: null,
    unreadCount: { [userId1]: 0, [userId2]: 0 },
    readBy: {},
    createdAt: now,
    updatedAt: now,
  };
  writeRooms(rooms);
  rememberRoomCollection(chatRoomId, COLLECTION_CHAT_ROOMS_SNAKE);
  return chatRoomId;
}
