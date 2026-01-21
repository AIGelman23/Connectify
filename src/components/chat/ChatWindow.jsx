"use client";

import { useRef, useEffect } from "react";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";

export default function ChatWindow({
  conversation,
  messages = [],
  currentUserId,
  presenceMap = {},
  typingUsers = [],
  onSendMessage,
  onReact,
  onReply,
  onEditMessage,
  onDeleteMessage,
  onMarkAsRead,
  onTyping,
  onBack,
  loading = false,
  sendingMessage = false,
  replyingTo = null,
  onCancelReply,
  messageStatuses = {},
  onRetry,
  hideHeader = false,
}) {
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // Get other participants for header
  const otherParticipants =
    conversation?.participants?.filter((p) => p.id !== currentUserId) || [];

  // Get online status for 1-on-1 chats
  const isOnline =
    !conversation?.isGroup && otherParticipants.length === 1
      ? presenceMap[otherParticipants[0]?.id]?.isOnline
      : false;

  const lastSeen =
    !conversation?.isGroup && otherParticipants.length === 1
      ? presenceMap[otherParticipants[0]?.id]?.lastSeenAt
      : null;

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-900">
        <svg
          className="w-16 h-16 mb-4 text-gray-300 dark:text-slate-600"
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
        <p className="text-lg font-medium">Select a conversation</p>
        <p className="text-sm mt-1">Choose a conversation from the list to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      {!hideHeader && (
        <ChatHeader
          conversation={conversation}
          currentUserId={currentUserId}
          isOnline={isOnline}
          lastSeen={lastSeen}
          onBack={onBack}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-900">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <MessageList
            messages={messages}
            currentUserId={currentUserId}
            onReact={onReact}
            onReply={onReply}
            onEdit={onEditMessage}
            onDelete={onDeleteMessage}
            onMarkAsRead={(messageId) => onMarkAsRead?.(messageId, conversation.id)}
            messageStatuses={messageStatuses}
            onRetry={onRetry}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-slate-900">
          <TypingIndicator users={typingUsers} />
        </div>
      )}

      {/* Input */}
      <MessageInput
        onSendMessage={onSendMessage}
        onTyping={(isTyping) => onTyping?.(isTyping, conversation.id)}
        replyingTo={replyingTo}
        onCancelReply={onCancelReply}
        disabled={sendingMessage}
        conversationId={conversation.id}
      />
    </div>
  );
}
