"use client";

import { useState, useMemo } from "react";
import MessageReactions from "./MessageReactions";
import ReadReceipts from "./ReadReceipts";
import LinkPreview, { extractFirstUrl } from "./LinkPreview";

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
  onRetry,
  status,
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
            <div className="grid gap-1" style={{
              gridTemplateColumns: message.mediaUrls?.length > 1 ? "repeat(2, 1fr)" : "1fr",
            }}>
              {message.mediaUrls?.map((url, i) => (
                <video
                  key={i}
                  src={url}
                  controls
                  className="rounded-lg max-w-xs w-full"
                  poster={message.thumbnailUrl}
                />
              ))}
            </div>
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
        const linkUrl = extractFirstUrl(message.content);
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
            {/* Link Preview */}
            {linkUrl && <LinkPreview url={linkUrl} isOwnMessage={isOwnMessage} />}
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
      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} ${!isLastInGroup ? "mb-0.5" : "mb-3"} px-2`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactionPicker(false);
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Avatar (for received messages) */}
      {!isOwnMessage && (
        <div className="w-7 flex-shrink-0 mr-2 self-end">
          {showAvatar && isLastInGroup && (
            <img
              src={
                message.sender?.image ||
                `https://placehold.co/28x28/0084ff/ffffff?text=${(
                  message.sender?.name?.[0] || "U"
                ).toUpperCase()}`
              }
              alt={message.sender?.name}
              className="w-7 h-7 rounded-full object-cover"
            />
          )}
        </div>
      )}

      <div className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"} max-w-[70%]`}>
        {/* Sender name (for group chats) */}
        {!isOwnMessage && showName && isFirstInGroup && (
          <span className="text-[11px] font-medium text-gray-500 dark:text-slate-400 ml-1 mb-1">
            {message.sender?.name}
          </span>
        )}

        <div className="relative group">
          {/* Message bubble - Facebook Messenger colors */}
          <div
            className={`
              px-3 py-2 rounded-[18px]
              ${isOwnMessage
                ? `bg-[#0084ff] text-white ${isLastInGroup ? "rounded-br-[4px]" : ""}`
                : `bg-[#e4e6eb] dark:bg-slate-700 text-gray-900 dark:text-slate-100 ${isLastInGroup ? "rounded-bl-[4px]" : ""}`
              }
            `}
          >
            {renderContent()}

            {/* Time - only show on last message in group */}
            {isLastInGroup && (
              <div className={`flex items-center gap-1 mt-1 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                <span className={`text-[10px] ${isOwnMessage ? "text-blue-100" : "text-gray-500 dark:text-slate-400"}`}>
                  {formattedTime}
                  {message.editedAt && " · Edited"}
                </span>
              </div>
            )}
          </div>

          {/* Status indicators - show outside bubble for own messages */}
          {isOwnMessage && isLastInGroup && (
            <div className="flex items-center justify-end mt-1 mr-1">
              {status === "sending" && (
                <div className="w-3 h-3 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
              )}
              {status === "sent" && !message.seenBy?.length && (
                <svg className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {status === "failed" && onRetry && (
                <button
                  onClick={() => onRetry(message.id)}
                  className="p-0.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  title="Retry sending"
                >
                  <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              )}
              <ReadReceipts status={message.status || status} seenBy={message.seenBy} />
            </div>
          )}

          {/* Action buttons - Messenger style hover menu */}
          {showActions && (
            <div
              className={`
                absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 p-0.5 bg-white dark:bg-slate-800 rounded-full shadow-md border border-gray-100 dark:border-slate-600
                ${isOwnMessage ? "right-full mr-1" : "left-full ml-1"}
              `}
            >
              {/* React button */}
              <button
                onClick={() => setShowReactionPicker(!showReactionPicker)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                title="React"
              >
                <svg className="w-4 h-4 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* Reply button */}
              <button
                onClick={() => onReply?.(message)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                title="Reply"
              >
                <svg className="w-4 h-4 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>

              {/* More actions dropdown trigger */}
              <button
                onClick={() => {
                  if (canEdit) onEdit?.(message);
                  else onDelete?.(message, canDeleteForEveryone);
                }}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                title={canEdit ? "Edit" : "Delete"}
              >
                <svg className="w-4 h-4 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </button>
            </div>
          )}

          {/* Reaction picker - Messenger style */}
          {showReactionPicker && (
            <div
              className={`
                absolute bottom-full mb-1 p-1.5 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-gray-100 dark:border-slate-600 flex gap-0.5
                ${isOwnMessage ? "right-0" : "left-0"}
              `}
            >
              {["👍", "❤️", "😂", "😮", "😢", "😠"].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 hover:scale-125 transition-all text-xl"
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
