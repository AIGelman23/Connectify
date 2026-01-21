"use client";

import { useState, useMemo } from "react";
import MessageReactions from "./MessageReactions";
import ReadReceipts from "./ReadReceipts";

export default function MessageBubble({
  message,
  isOwnMessage,
  showAvatar = true,
  showName = true,
  isFirstInGroup = true,
  isLastInGroup = true,
  onReact,
  onReply,
  onEdit,
  onDelete,
}) {
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Format timestamp
  const formattedTime = useMemo(() => {
    return new Date(message.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [message.createdAt]);

  // Check if message can be edited (15 min window)
  const canEdit = useMemo(() => {
    if (!isOwnMessage || message.type !== "text") return false;
    const fifteenMin = 15 * 60 * 1000;
    return Date.now() - new Date(message.createdAt).getTime() < fifteenMin;
  }, [isOwnMessage, message.type, message.createdAt]);

  // Check if message can be deleted for everyone (1 hour window)
  const canDeleteForEveryone = useMemo(() => {
    if (!isOwnMessage) return false;
    const oneHour = 60 * 60 * 1000;
    return Date.now() - new Date(message.createdAt).getTime() < oneHour;
  }, [isOwnMessage, message.createdAt]);

  // Handle reaction
  const handleReact = (emoji) => {
    if (onReact) {
      onReact(message.id, emoji);
    }
    setShowReactionPicker(false);
  };

  // Handle double-tap for quick like
  const handleDoubleClick = () => {
    if (onReact) {
      onReact(message.id, "👍");
    }
  };

  // Render message content based on type
  const renderContent = () => {
    if (message.isDeleted && message.deletedForAll) {
      return (
        <p className="italic text-gray-400 dark:text-slate-500">
          This message was deleted
        </p>
      );
    }

    switch (message.type) {
      case "image":
        return (
          <div className="space-y-1">
            <div className="grid gap-1" style={{
              gridTemplateColumns: message.mediaUrls?.length > 1 ? "repeat(2, 1fr)" : "1fr",
            }}>
              {message.mediaUrls?.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt="Shared image"
                  className="rounded-lg max-w-xs cursor-pointer hover:opacity-90 transition"
                  onClick={() => window.open(url, "_blank")}
                />
              ))}
            </div>
            {message.content && <p>{message.content}</p>}
          </div>
        );

      case "video":
        return (
          <div className="space-y-1">
            <video
              src={message.mediaUrls?.[0]}
              controls
              className="rounded-lg max-w-xs"
              poster={message.thumbnailUrl}
            />
            {message.content && <p>{message.content}</p>}
          </div>
        );

      case "voice":
        return (
          <div className="flex items-center gap-2 min-w-[200px]">
            <audio src={message.mediaUrls?.[0]} controls className="w-full h-10" />
            {message.duration && (
              <span className="text-xs text-gray-500 dark:text-slate-400">
                {Math.floor(message.duration / 60)}:{(message.duration % 60).toString().padStart(2, "0")}
              </span>
            )}
          </div>
        );

      case "file":
        return (
          <a
            href={message.mediaUrls?.[0]}
            download={message.fileName}
            className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition"
          >
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.fileName || "File"}</p>
              {message.fileSize && (
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {formatFileSize(message.fileSize)}
                </p>
              )}
            </div>
          </a>
        );

      case "gif":
        return (
          <img
            src={message.mediaUrls?.[0]}
            alt="GIF"
            className="rounded-lg max-w-xs"
          />
        );

      case "system":
        return (
          <p className="text-center text-xs text-gray-500 dark:text-slate-400 italic">
            {message.sender?.name || "Someone"} {message.content}
          </p>
        );

      default:
        return (
          <div>
            {/* Reply preview */}
            {message.replyTo && (
              <div className={`
                mb-1 p-2 text-xs rounded border-l-2
                ${isOwnMessage
                  ? "bg-indigo-700/50 border-indigo-400"
                  : "bg-gray-200 dark:bg-slate-600 border-gray-400 dark:border-slate-400"
                }
              `}>
                <p className="font-medium">{message.replyTo.sender?.name}</p>
                <p className="truncate opacity-80">{message.replyTo.content}</p>
              </div>
            )}
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        );
    }
  };

  // System messages have special styling
  if (message.type === "system") {
    return (
      <div className="flex justify-center py-2">
        <div className="px-3 py-1 bg-gray-200 dark:bg-slate-700 rounded-full text-xs text-gray-500 dark:text-slate-400">
          {message.sender?.name || "Someone"} {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} ${!isLastInGroup ? "mb-0.5" : "mb-2"}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactionPicker(false);
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Avatar (for received messages) */}
      {!isOwnMessage && (
        <div className="w-8 flex-shrink-0 mr-2">
          {showAvatar && (
            <img
              src={
                message.sender?.image ||
                `https://placehold.co/32x32/6366F1/ffffff?text=${(
                  message.sender?.name?.[0] || "U"
                ).toUpperCase()}`
              }
              alt={message.sender?.name}
              className="w-8 h-8 rounded-full object-cover"
            />
          )}
        </div>
      )}

      <div className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"} max-w-[75%]`}>
        {/* Sender name (for group chats) */}
        {!isOwnMessage && showName && (
          <span className="text-xs font-medium text-gray-500 dark:text-slate-400 ml-1 mb-0.5">
            {message.sender?.name}
          </span>
        )}

        <div className="relative group">
          {/* Message bubble */}
          <div
            className={`
              px-4 py-2 rounded-2xl shadow-sm
              ${isOwnMessage
                ? `bg-indigo-600 text-white ${isFirstInGroup ? "rounded-tr-md" : ""} ${isLastInGroup ? "rounded-br-md" : ""}`
                : `bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 ${isFirstInGroup ? "rounded-tl-md" : ""} ${isLastInGroup ? "rounded-bl-md" : ""}`
              }
            `}
          >
            {renderContent()}

            {/* Time and status */}
            <div className={`flex items-center gap-1 mt-1 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
              <span className={`text-xs ${isOwnMessage ? "text-indigo-200" : "text-gray-400 dark:text-slate-500"}`}>
                {formattedTime}
              </span>
              {message.editedAt && (
                <span className={`text-xs ${isOwnMessage ? "text-indigo-200" : "text-gray-400 dark:text-slate-500"}`}>
                  (edited)
                </span>
              )}
              {isOwnMessage && (
                <ReadReceipts status={message.status} seenBy={message.seenBy} />
              )}
            </div>
          </div>

          {/* Action buttons */}
          {showActions && (
            <div
              className={`
                absolute top-0 flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-full shadow-lg
                ${isOwnMessage ? "right-full mr-2" : "left-full ml-2"}
              `}
            >
              {/* React button */}
              <button
                onClick={() => setShowReactionPicker(!showReactionPicker)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                title="React"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* Reply button */}
              <button
                onClick={() => onReply?.(message)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                title="Reply"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>

              {/* Edit button (own messages only) */}
              {canEdit && (
                <button
                  onClick={() => onEdit?.(message)}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                  title="Edit"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}

              {/* Delete button */}
              <button
                onClick={() => onDelete?.(message, canDeleteForEveryone)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                title="Delete"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}

          {/* Reaction picker */}
          {showReactionPicker && (
            <div
              className={`
                absolute bottom-full mb-2 p-1 bg-white dark:bg-slate-800 rounded-full shadow-lg flex gap-1
                ${isOwnMessage ? "right-0" : "left-0"}
              `}
            >
              {["👍", "❤️", "😂", "😮", "😢", "😠"].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reactions display */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <MessageReactions
            reactions={message.reactions}
            onReact={handleReact}
            isOwnMessage={isOwnMessage}
          />
        )}
      </div>
    </div>
  );
}

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
