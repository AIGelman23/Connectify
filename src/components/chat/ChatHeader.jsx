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
  onSearchToggle,
  onMediaGalleryToggle,
  isSearchOpen = false,
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
    <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
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
      <div className="flex items-center gap-1">
        {/* Search button */}
        <button
          onClick={onSearchToggle}
          className={`p-2 rounded-full transition ${
            isSearchOpen
              ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400"
              : "text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
          }`}
          title="Search messages"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>

        {/* Media gallery button */}
        <button
          onClick={onMediaGalleryToggle}
          className="p-2 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
          title="Shared media"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>

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
