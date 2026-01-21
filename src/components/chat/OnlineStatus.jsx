"use client";

import { useMemo } from "react";

export default function OnlineStatus({
  isOnline = false,
  lastSeen = null,
  size = "small", // small, medium, large
  showText = false,
  className = "",
}) {
  // Format last seen time
  const lastSeenText = useMemo(() => {
    if (isOnline) return "Active now";
    if (!lastSeen) return "Offline";

    const date = new Date(lastSeen);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Active just now";
    if (minutes < 60) return `Active ${minutes}m ago`;
    if (hours < 24) return `Active ${hours}h ago`;
    if (days < 7) return `Active ${days}d ago`;

    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }, [isOnline, lastSeen]);

  // Size classes
  const sizeClasses = {
    small: "w-3 h-3",
    medium: "w-4 h-4",
    large: "w-5 h-5",
  };

  const dotSize = sizeClasses[size] || sizeClasses.small;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* Status dot */}
      <span
        className={`
          ${dotSize} rounded-full border-2 border-white dark:border-slate-800
          ${isOnline ? "bg-green-500" : "bg-gray-400 dark:bg-slate-500"}
        `}
        title={lastSeenText}
      />

      {/* Text label */}
      {showText && (
        <span
          className={`
            text-xs
            ${isOnline ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-slate-400"}
          `}
        >
          {lastSeenText}
        </span>
      )}
    </div>
  );
}
