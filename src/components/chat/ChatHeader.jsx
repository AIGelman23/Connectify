"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import OnlineStatus from "./OnlineStatus";

export default function ChatHeader({
  conversation,
  currentUserId,
  isOnline = false,
  lastSeen = null,
  onBack,
  onSettings,
}) {
  const router = useRouter();

  // Get display info
  const displayInfo = useMemo(() => {
    const otherParticipants =
      conversation?.participants?.filter((p) => p.id !== currentUserId) || [];

    if (conversation?.isGroup) {
      return {
        name: conversation.name || `Group (${otherParticipants.length + 1})`,
        imageUrl:
          conversation.imageUrl ||
          `https://placehold.co/40x40/8B5CF6/ffffff?text=GC`,
        subtitle: `${otherParticipants.length + 1} members`,
        isGroup: true,
      };
    }

    if (otherParticipants.length === 1) {
      const other = otherParticipants[0];
      return {
        name: other.nickname || other.name || "Unknown User",
        imageUrl:
          other.image ||
          `https://placehold.co/40x40/6366F1/ffffff?text=${(
            other.name?.[0] || "U"
          ).toUpperCase()}`,
        subtitle: null,
        isGroup: false,
        userId: other.id,
      };
    }

    return {
      name: "Chat",
      imageUrl: `https://placehold.co/40x40/6366F1/ffffff?text=C`,
      subtitle: null,
      isGroup: false,
    };
  }, [conversation, currentUserId]);

  // Navigate to profile
  const handleAvatarClick = () => {
    if (!displayInfo.isGroup && displayInfo.userId) {
      router.push(`/profile/${displayInfo.userId}`);
    }
  };

  return (
    <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        {/* Back button (mobile) */}
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition"
            aria-label="Back"
          >
            <svg
              className="w-5 h-5 text-gray-600 dark:text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}

        {/* Avatar */}
        <div className="relative">
          <img
            src={displayInfo.imageUrl}
            alt={displayInfo.name}
            className={`w-10 h-10 rounded-full object-cover ${
              !displayInfo.isGroup ? "cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all" : ""
            }`}
            onClick={handleAvatarClick}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `https://placehold.co/40x40/6366F1/ffffff?text=${displayInfo.name[0].toUpperCase()}`;
            }}
          />
        </div>

        {/* Name and status */}
        <div>
          <h3
            className={`font-bold text-gray-800 dark:text-slate-100 ${
              !displayInfo.isGroup
                ? "cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                : ""
            }`}
            onClick={handleAvatarClick}
          >
            {displayInfo.name}
          </h3>
          <div className="flex items-center gap-1">
            {displayInfo.isGroup ? (
              <span className="text-xs text-gray-500 dark:text-slate-400">
                {displayInfo.subtitle}
              </span>
            ) : (
              <OnlineStatus
                isOnline={isOnline}
                lastSeen={lastSeen}
                showText={true}
                size="small"
              />
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Info/Settings button */}
        <button
          onClick={onSettings}
          className="p-2 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
          title="Conversation info"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
