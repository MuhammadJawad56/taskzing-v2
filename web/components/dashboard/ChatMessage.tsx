import React from "react";
import { MessageWithSender } from "@/lib/types/message";
import { Avatar } from "@/components/ui/Avatar";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils/cn";

export interface ChatMessageProps {
  message: MessageWithSender;
  isOwn: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isOwn }) => {
  return (
    <div
      className={cn(
        "flex items-start space-x-3 mb-4",
        isOwn && "flex-row-reverse space-x-reverse"
      )}
    >
      {!isOwn && message.sender && (
        <Avatar
          src={message.sender.photoUrl}
          name={message.sender.fullName}
          size="sm"
        />
      )}
      <div
        className={cn(
          "flex-1 max-w-[70%]",
          isOwn && "flex flex-col items-end"
        )}
      >
        {!isOwn && message.sender && (
          <span className="text-xs font-medium text-theme-accent4 mb-1 block">
            {message.sender.fullName}
          </span>
        )}
        <div
          className={cn(
            "rounded-lg px-4 py-2",
            isOwn
              ? "bg-primary-500 text-white"
              : "bg-theme-accent2 text-theme-primaryText"
          )}
        >
          <p className="text-sm whitespace-pre-wrap">
            {message.text || ""}
          </p>
        </div>
        <span className="text-xs text-theme-accent4 mt-1 block">
          {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
};

