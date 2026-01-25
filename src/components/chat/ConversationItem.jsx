"use client";

import { useMemo } from "react";

export default function ConversationItem({
  conversation,
  isSelected,
  isMultiSelected,
  onSelect,
  onToggleMultiSelect,
  currentUserId,
  isOnline = false,
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
          `https://placehold.co/56x56/8B5CF6/ffffff?text=GC`,
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
          `https://placehold.co/56x56/0084ff/ffffff?text=${(
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
      imageUrl: `https://placehold.co/56x56/10B981/ffffff?text=ME`,
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

  // Check if there are unread messages
  const hasUnread = conversation.unreadCount > 0;

  return (
    <li
      className={`
        flex items-center px-2 py-2 mx-2 cursor-pointer transition-all rounded-lg
        ${isSelected
          ? "bg-[#ebf5ff] dark:bg-blue-900/30"
          : "hover:bg-gray-100 dark:hover:bg-slate-700/50"
        }
        ${isMultiSelected ? "bg-blue-50 dark:bg-blue-900/20" : ""}
      `}
      onClick={onSelect}
      onContextMenu={(e) => {
        e.preventDefault();
        onToggleMultiSelect(e);
      }}
    >
      {/* Avatar with online status */}
      <div className="relative flex-shrink-0">
        <img
          src={displayInfo.imageUrl}
          alt={displayInfo.name}
          className="w-14 h-14 rounded-full object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `https://placehold.co/56x56/0084ff/ffffff?text=${displayInfo.name[0].toUpperCase()}`;
          }}
        />
        {/* Online indicator - Messenger style green dot */}
        {!displayInfo.isGroup && isOnline && (
          <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 ml-3">
        <div className="flex items-center justify-between">
          <h3 className={`text-[15px] truncate ${hasUnread ? "font-bold text-gray-900 dark:text-slate-100" : "font-medium text-gray-900 dark:text-slate-100"}`}>
            {displayInfo.name}
          </h3>
          <span className={`text-xs ml-2 flex-shrink-0 ${hasUnread ? "text-[#0084ff] font-semibold" : "text-gray-500 dark:text-slate-400"}`}>
            {formattedTime}
          </span>
        </div>

        <div className="flex items-center justify-between mt-0.5">
          <p className={`text-[13px] truncate ${hasUnread ? "text-gray-900 dark:text-slate-200 font-medium" : "text-gray-500 dark:text-slate-400"}`}>
            {conversation.lastMessage || displayInfo.subtitle || "No messages yet"}
          </p>

          {/* Unread indicator - Messenger style blue dot */}
          {hasUnread && (
            <span className="ml-2 flex-shrink-0 w-3 h-3 bg-[#0084ff] rounded-full" />
          )}
        </div>
      </div>
    </li>
  );
}
