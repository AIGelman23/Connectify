"use client";

import { useState } from "react";

export default function MessageReactions({
  reactions = {},
  onReact,
  isOwnMessage = false,
}) {
  const [showDetails, setShowDetails] = useState(false);

  // Convert reactions object to array for display
  const reactionList = Object.entries(reactions).map(([emoji, users]) => ({
    emoji,
    users,
    count: users.length,
  }));

  if (reactionList.length === 0) return null;

  return (
    <div className={`mt-1 ${isOwnMessage ? "mr-1" : "ml-1"}`}>
      <div
        className="inline-flex items-center gap-1 p-1 bg-white dark:bg-slate-700 rounded-full shadow-sm cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
      >
        {reactionList.map(({ emoji, count }) => (
          <button
            key={emoji}
            onClick={(e) => {
              e.stopPropagation();
              onReact?.(emoji);
            }}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-600 transition"
          >
            <span className="text-sm">{emoji}</span>
            {count > 1 && (
              <span className="text-xs text-gray-500 dark:text-slate-400">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Reaction details popup */}
      {showDetails && (
        <div
          className={`
            absolute z-20 mt-1 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-xl
            min-w-[150px] max-w-[250px] border border-gray-200 dark:border-slate-700
            ${isOwnMessage ? "right-0" : "left-0"}
          `}
        >
          {reactionList.map(({ emoji, users }) => (
            <div key={emoji} className="mb-2 last:mb-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{emoji}</span>
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  {users.length}
                </span>
              </div>
              <div className="pl-6 space-y-1">
                {users.slice(0, 5).map((user) => (
                  <div
                    key={user.userId}
                    className="flex items-center gap-2 text-sm"
                  >
                    {user.userImage && (
                      <img
                        src={user.userImage}
                        alt={user.userName}
                        className="w-5 h-5 rounded-full"
                      />
                    )}
                    <span className="text-gray-700 dark:text-slate-300 truncate">
                      {user.userName}
                    </span>
                  </div>
                ))}
                {users.length > 5 && (
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    +{users.length - 5} more
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
