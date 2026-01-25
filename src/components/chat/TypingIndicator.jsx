"use client";

export default function TypingIndicator({ users = [] }) {
  if (users.length === 0) return null;

  // Format the typing text
  const getTypingText = () => {
    const getName = (user) => user?.name?.split(" ")[0] || user?.userName || "Someone";

    if (users.length === 1) {
      return `${getName(users[0])} is typing`;
    }
    if (users.length === 2) {
      return `${getName(users[0])} and ${getName(users[1])} are typing`;
    }
    return `${getName(users[0])} and ${users.length - 1} others are typing`;
  };

  return (
    <div className="flex items-center gap-2 px-2">
      {/* Avatar placeholder */}
      {users[0] && (
        <img
          src={users[0]?.image || `https://placehold.co/24x24/e4e6eb/666?text=${(users[0]?.name?.[0] || "?").toUpperCase()}`}
          alt=""
          className="w-6 h-6 rounded-full object-cover"
        />
      )}

      {/* Messenger-style typing bubble */}
      <div className="bg-[#e4e6eb] dark:bg-slate-700 rounded-full px-4 py-2.5 flex items-center gap-1">
        <span
          className="w-2 h-2 bg-gray-500 dark:bg-slate-400 rounded-full animate-pulse"
          style={{ animationDuration: "1s", animationDelay: "0ms" }}
        />
        <span
          className="w-2 h-2 bg-gray-500 dark:bg-slate-400 rounded-full animate-pulse"
          style={{ animationDuration: "1s", animationDelay: "200ms" }}
        />
        <span
          className="w-2 h-2 bg-gray-500 dark:bg-slate-400 rounded-full animate-pulse"
          style={{ animationDuration: "1s", animationDelay: "400ms" }}
        />
      </div>

      {/* Text - subtle */}
      <span className="text-xs text-gray-500 dark:text-slate-400">{getTypingText()}</span>
    </div>
  );
}
