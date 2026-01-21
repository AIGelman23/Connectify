"use client";

import { useState } from "react";

export default function ReadReceipts({
  status = "sent", // sent, delivered, seen
  seenBy = [],
}) {
  const [showSeenBy, setShowSeenBy] = useState(false);

  // Single checkmark for sent
  if (status === "sent") {
    return (
      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  }

  // Double checkmark for delivered
  if (status === "delivered") {
    return (
      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7M5 13l4 4M12 13l4 4L26 7" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 13l4 4L16 7" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 13l4 4L22 7" />
      </svg>
    );
  }

  // Double blue checkmark for seen
  if (status === "seen") {
    return (
      <div className="relative inline-flex items-center">
        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 13l4 4L16 7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 13l4 4L22 7" />
        </svg>

        {/* Show avatar of who saw it */}
        {seenBy && seenBy.length > 0 && (
          <div
            className="ml-1 flex -space-x-1 cursor-pointer"
            onClick={() => setShowSeenBy(!showSeenBy)}
          >
            {seenBy.slice(0, 3).map((user) => (
              <img
                key={user.userId}
                src={
                  user.userImage ||
                  `https://placehold.co/16x16/6366F1/ffffff?text=${(
                    user.userName?.[0] || "U"
                  ).toUpperCase()}`
                }
                alt={user.userName}
                className="w-4 h-4 rounded-full border border-white dark:border-slate-800"
                title={`Seen by ${user.userName}`}
              />
            ))}
            {seenBy.length > 3 && (
              <div className="w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center text-[8px] text-white border border-white dark:border-slate-800">
                +{seenBy.length - 3}
              </div>
            )}
          </div>
        )}

        {/* Seen by popup */}
        {showSeenBy && seenBy && seenBy.length > 0 && (
          <div className="absolute bottom-full right-0 mb-2 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-xl min-w-[150px] border border-gray-200 dark:border-slate-700 z-20">
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">
              Seen by
            </p>
            <div className="space-y-1.5">
              {seenBy.map((user) => (
                <div key={user.userId} className="flex items-center gap-2">
                  <img
                    src={
                      user.userImage ||
                      `https://placehold.co/20x20/6366F1/ffffff?text=${(
                        user.userName?.[0] || "U"
                      ).toUpperCase()}`
                    }
                    alt={user.userName}
                    className="w-5 h-5 rounded-full"
                  />
                  <span className="text-sm text-gray-700 dark:text-slate-300 truncate">
                    {user.userName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
