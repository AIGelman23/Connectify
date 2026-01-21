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
      className="flex flex-col p-4 space-y-4"
    >
      {groupedMessages.map((group) => (
        <div key={group.date}>
          {/* Date divider */}
          <div className="flex items-center justify-center my-4">
            <span className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-slate-400 bg-gray-200 dark:bg-slate-700 rounded-full">
              {group.formattedDate}
            </span>
          </div>

          {/* Messages for this date */}
          <div className="space-y-2">
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
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-slate-500">
          <svg
            className="w-12 h-12 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p className="text-sm">No messages yet. Start the conversation!</p>
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
