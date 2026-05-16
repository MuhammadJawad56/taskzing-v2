import { Message, ChatRoom } from "@/lib/types/message";

export const chatRooms: ChatRoom[] = [
  {
    chatRoomId: "room-1",
    participantIds: ["user-5", "user-1"],
    jobId: "task-1",
    createdAt: "2024-01-20T12:00:00Z",
    updatedAt: "2024-01-21T15:30:00Z",
  },
  {
    chatRoomId: "room-2",
    participantIds: ["user-5", "user-2"],
    jobId: "task-1",
    createdAt: "2024-01-20T11:00:00Z",
    updatedAt: "2024-01-21T14:00:00Z",
  },
  {
    chatRoomId: "room-3",
    participantIds: ["user-5", "user-3"],
    jobId: "task-3",
    createdAt: "2024-01-22T15:00:00Z",
    updatedAt: "2024-01-22T16:30:00Z",
  },
];

export const messages: Message[] = [
  {
    messageId: "msg-1",
    chatRoomId: "room-1",
    senderId: "user-5",
    type: "text",
    text: "Hi, I saw your proposal. Can you tell me more about your experience with e-commerce?",
    status: "read",
    timestamp: "2024-01-20T12:30:00Z",
    deletedForEveryone: false,
    createdAt: "2024-01-20T12:30:00Z",
    updatedAt: "2024-01-20T12:30:00Z",
  },
  {
    messageId: "msg-2",
    chatRoomId: "room-1",
    senderId: "user-1",
    type: "text",
    text: "Sure! I've built several e-commerce platforms using React and Node.js. I can integrate payment gateways, shopping carts, and inventory management.",
    status: "read",
    timestamp: "2024-01-20T12:35:00Z",
    deletedForEveryone: false,
    createdAt: "2024-01-20T12:35:00Z",
    updatedAt: "2024-01-20T12:35:00Z",
  },
  {
    messageId: "msg-3",
    chatRoomId: "room-1",
    senderId: "user-5",
    type: "text",
    text: "That sounds great. How long would it take to complete the project?",
    status: "read",
    timestamp: "2024-01-20T12:40:00Z",
    deletedForEveryone: false,
    createdAt: "2024-01-20T12:40:00Z",
    updatedAt: "2024-01-20T12:40:00Z",
  },
  {
    messageId: "msg-4",
    chatRoomId: "room-1",
    senderId: "user-1",
    type: "text",
    text: "I estimate about 3 weeks for the complete redesign and e-commerce integration. I can provide weekly updates.",
    status: "read",
    timestamp: "2024-01-20T12:45:00Z",
    deletedForEveryone: false,
    createdAt: "2024-01-20T12:45:00Z",
    updatedAt: "2024-01-20T12:45:00Z",
  },
  {
    messageId: "msg-5",
    chatRoomId: "room-2",
    senderId: "user-2",
    type: "text",
    text: "Hello! I'm interested in your website redesign project. I specialize in modern UI/UX design.",
    status: "read",
    timestamp: "2024-01-20T11:15:00Z",
    deletedForEveryone: false,
    createdAt: "2024-01-20T11:15:00Z",
    updatedAt: "2024-01-20T11:15:00Z",
  },
  {
    messageId: "msg-6",
    chatRoomId: "room-3",
    senderId: "user-5",
    type: "text",
    text: "I need the faucet fixed ASAP. Are you available today?",
    status: "read",
    timestamp: "2024-01-22T15:30:00Z",
    deletedForEveryone: false,
    createdAt: "2024-01-22T15:30:00Z",
    updatedAt: "2024-01-22T15:30:00Z",
  },
  {
    messageId: "msg-7",
    chatRoomId: "room-3",
    senderId: "user-3",
    type: "text",
    text: "Yes, I can be there within an hour. I'll bring all the necessary tools.",
    status: "read",
    timestamp: "2024-01-22T15:35:00Z",
    deletedForEveryone: false,
    createdAt: "2024-01-22T15:35:00Z",
    updatedAt: "2024-01-22T15:35:00Z",
  },
];

export function getChatRoomById(id: string): ChatRoom | undefined {
  return chatRooms.find((room) => room.chatRoomId === id);
}

export function getChatRoomsByUserId(userId: string): ChatRoom[] {
  return chatRooms.filter((room) => room.participantIds.includes(userId));
}

export function getMessagesByChatRoomId(chatRoomId: string): Message[] {
  return messages
    .filter((msg) => msg.chatRoomId === chatRoomId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function getChatRoomByParticipants(userId1: string, userId2: string): ChatRoom | undefined {
  return chatRooms.find(
    (room) =>
      room.participantIds.includes(userId1) && room.participantIds.includes(userId2)
  );
}

