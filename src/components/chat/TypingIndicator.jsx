"use client";

export default function TypingIndicator({ users = [] }) {
  if (users.length === 0) return null;

  // Format the typing text
  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].userName || "Someone"} is typing`;
    }
    if (users.length === 2) {
      return `${users[0].userName || "Someone"} and ${users[1].userName || "someone"} are typing`;
    }
    return `${users[0].userName || "Someone"} and ${users.length - 1} others are typing`;
  };

  return (
    <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
      {/* Animated dots */}
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-gray-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 bg-gray-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 bg-gray-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>

      {/* Text */}
      <span className="text-sm">{getTypingText()}...</span>
    </div>
  );
}
