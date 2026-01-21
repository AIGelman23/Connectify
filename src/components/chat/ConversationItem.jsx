"use client";

import { useMemo } from "react";
import OnlineStatus from "./OnlineStatus";

export default function ConversationItem({
  conversation,
  isSelected,
  isMultiSelected,
  onSelect,
  onToggleMultiSelect,
  currentUserId,
  isOnline = false,
  lastSeen = null,
}) {
  // Get display info for the conversation
  const displayInfo = useMemo(() => {
    const otherParticipants =
      conversation.participants?.filter((p) => p.id !== currentUserId) || [];

    if (conversation.isGroup) {
      return {
        name: conversation.name || `Group (${otherParticipants.length + 1})`,
        imageUrl:
          conversation.imageUrl ||
          `https://placehold.co/48x48/8B5CF6/ffffff?text=GC`,
        subtitle: otherParticipants.map((p) => p.name).join(", "),
        isGroup: true,
      };
    }

    if (otherParticipants.length === 1) {
      const other = otherParticipants[0];
      return {
        name: other.nickname || other.name || "Unknown User",
        imageUrl:
          other.image ||
          `https://placehold.co/48x48/6366F1/ffffff?text=${(
            other.name?.[0] || "U"
          ).toUpperCase()}`,
        subtitle: null,
        isGroup: false,
        userId: other.id,
      };
    }

    // Self-chat or no other participants
    return {
      name: "My Notes",
      imageUrl: `https://placehold.co/48x48/10B981/ffffff?text=ME`,
      subtitle: null,
      isGroup: false,
    };
  }, [conversation, currentUserId]);

  // Format timestamp
  const formattedTime = useMemo(() => {
    if (!conversation.timestamp) return "";

    const date = new Date(conversation.timestamp);
    const now = new Date();
    const diff = now - date;
    const dayMs = 24 * 60 * 60 * 1000;

    if (diff < dayMs) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diff < 7 * dayMs) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  }, [conversation.timestamp]);

  return (
    <li
      className={`
        flex items-center p-3 cursor-pointer transition-colors
        hover:bg-gray-50 dark:hover:bg-slate-700
        ${isSelected ? "bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-indigo-600" : "border-l-4 border-transparent"}
        ${isMultiSelected ? "bg-blue-50 dark:bg-blue-900/20" : ""}
      `}
      onClick={onSelect}
      onContextMenu={(e) => {
        e.preventDefault();
        onToggleMultiSelect(e);
      }}
    >
      {/* Checkbox for multi-select */}
      <div className="mr-3">
        <input
          type="checkbox"
          checked={isMultiSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleMultiSelect(e);
          }}
          className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
        />
      </div>

      {/* Avatar with online status */}
      <div className="relative flex-shrink-0">
        <img
          src={displayInfo.imageUrl}
          alt={displayInfo.name}
          className="w-12 h-12 rounded-full object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `https://placehold.co/48x48/6366F1/ffffff?text=${displayInfo.name[0].toUpperCase()}`;
          }}
        />
        {!displayInfo.isGroup && (
          <OnlineStatus
            isOnline={isOnline}
            lastSeen={lastSeen}
            size="small"
            className="absolute bottom-0 right-0"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 ml-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 truncate">
            {displayInfo.name}
          </h3>
          <span className="text-xs text-gray-400 dark:text-slate-500 ml-2 flex-shrink-0">
            {formattedTime}
          </span>
        </div>

        <div className="flex items-center justify-between mt-0.5">
          <p className="text-sm text-gray-500 dark:text-slate-400 truncate">
            {conversation.lastMessage || displayInfo.subtitle || "No messages yet"}
          </p>

          {/* Unread badge */}
          {conversation.unreadCount > 0 && (
            <span className="ml-2 flex-shrink-0 inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-bold text-white bg-indigo-600 rounded-full">
              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
