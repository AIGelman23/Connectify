"use client";

import { useRef, useEffect, useMemo } from "react";
import MessageBubble from "./MessageBubble";

export default function MessageList({
  messages = [],
  currentUserId,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onMarkAsRead,
  messageStatuses = {},
  onRetry,
}) {
  const observerRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentDate = null;

    messages.forEach((message) => {
      const messageDate = new Date(message.createdAt).toDateString();

      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({
          date: messageDate,
          formattedDate: formatDateHeader(new Date(message.createdAt)),
          messages: [],
        });
      }

      groups[groups.length - 1].messages.push(message);
    });

    return groups;
  }, [messages]);

  // Set up Intersection Observer for read receipts
  useEffect(() => {
    if (!onMarkAsRead) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.dataset.messageId;
            const senderId = entry.target.dataset.senderId;

            // Only mark as read if it's not our own message
            if (messageId && senderId !== currentUserId) {
              onMarkAsRead(messageId);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [currentUserId, onMarkAsRead]);

  // Observe message elements
  const observeMessage = (element) => {
    if (observerRef.current && element) {
      observerRef.current.observe(element);
    }
  };

  return (
    <div
      ref={messagesContainerRef}
      className="flex flex-col px-2 py-4"
    >
      {groupedMessages.map((group) => (
        <div key={group.date}>
          {/* Date divider - Messenger style */}
          <div className="flex items-center justify-center my-4">
            <span className="px-3 py-1.5 text-[11px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
              {group.formattedDate}
            </span>
          </div>

          {/* Messages for this date */}
          <div className="space-y-0.5">
            {group.messages.map((message, index) => {
              const prevMessage = index > 0 ? group.messages[index - 1] : null;
              const nextMessage =
                index < group.messages.length - 1
                  ? group.messages[index + 1]
                  : null;

              // Determine if this is part of a group
              const isFirstInGroup =
                !prevMessage || prevMessage.senderId !== message.senderId;
              const isLastInGroup =
                !nextMessage || nextMessage.senderId !== message.senderId;

              return (
                <div
                  key={message.id}
                  ref={observeMessage}
                  data-message-id={message.id}
                  data-sender-id={message.senderId}
                >
                  <MessageBubble
                    message={message}
                    isOwnMessage={message.senderId === currentUserId}
                    showAvatar={isLastInGroup}
                    showName={isFirstInGroup}
                    isFirstInGroup={isFirstInGroup}
                    isLastInGroup={isLastInGroup}
                    onReact={onReact}
                    onReply={onReply}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    status={messageStatuses[message.id]}
                    onRetry={onRetry}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-slate-500">
          {/* Messenger-style wave icon */}
          <div className="w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-[#0084ff] to-[#00c6ff] flex items-center justify-center">
            <svg
              className="w-10 h-10 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.936 1.444 5.544 3.7 7.254V22l3.4-1.866c.9.252 1.87.39 2.9.39 5.523 0 10-4.145 10-9.243S17.523 2 12 2zm1.024 12.463l-2.545-2.715-4.97 2.715 5.465-5.8 2.609 2.714 4.906-2.714-5.465 5.8z"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-slate-300">No messages yet</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Say hi to start the conversation!</p>
        </div>
      )}
    </div>
  );
}

// Helper function to format date headers
function formatDateHeader(date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  // Check if within this week
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (date > weekAgo) {
    return date.toLocaleDateString([], { weekday: "long" });
  }

  // Otherwise show full date
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}
