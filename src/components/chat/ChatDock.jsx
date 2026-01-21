"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import useChat from "@/hooks/useChat";
import ChatWindow from "./ChatWindow";
import ToastContainer, { useToast } from "@/components/ToastContainer";

const MAX_OPEN_WINDOWS = 3;

function getConversationTitle(conversation, currentUserId) {
  if (!conversation) return "Messages";
  if (conversation.isGroup && conversation.name) return conversation.name;

  const other =
    conversation.participants?.filter((p) => p.id !== currentUserId) || [];
  if (other.length === 1) return other[0]?.name || "Chat";
  if (other.length > 1) return `Group (${other.length + 1})`;
  return "Chat";
}

function getConversationAvatar(conversation, currentUserId) {
  if (!conversation) return null;
  if (conversation.isGroup && conversation.imageUrl) return conversation.imageUrl;

  const other =
    conversation.participants?.filter((p) => p.id !== currentUserId) || [];
  const first = other[0];
  return first?.image || null;
}

function formatUnread(n) {
  if (!n) return "";
  if (n > 9) return "9+";
  return String(n);
}

// Format last seen time for mobile header
function formatLastSeen(lastSeenAt) {
  if (!lastSeenAt) return "Offline";
  const date = new Date(lastSeenAt);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (minutes < 1) return "Active just now";
  if (minutes < 60) return `Active ${minutes}m ago`;
  if (hours < 24) return `Active ${hours}h ago`;
  if (days < 7) return `Active ${days}d ago`;
  return "Offline";
}

// Full-screen mobile chat modal
function MobileChatModal({
  conversation,
  currentUserId,
  messages,
  presenceMap,
  typingUsers,
  onSendMessage,
  onTyping,
  onReact,
  onMarkAsRead,
  onClose,
  loading,
  messageStatuses,
  onRetry,
}) {
  const title = getConversationTitle(conversation, currentUserId);
  const avatar = getConversationAvatar(conversation, currentUserId);
  const other = conversation?.participants?.filter((p) => p.id !== currentUserId) || [];
  const firstOther = other[0];
  const presence = firstOther ? presenceMap[firstOther.id] : null;
  const isOnline = !!presence?.isOnline;
  const statusText = isOnline ? "Online" : formatLastSeen(presence?.lastSeenAt);

  return (
    <div className="fixed inset-0 z-[70] bg-white dark:bg-slate-900 flex flex-col md:hidden">
      {/* Header */}
      <div className="h-14 px-3 flex items-center gap-3 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 safe-area-top">
        <button
          type="button"
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition"
          aria-label="Back"
        >
          <svg className="w-6 h-6 text-gray-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="relative">
          <img
            src={
              avatar ||
              `https://placehold.co/40x40/6366F1/ffffff?text=${encodeURIComponent(
                (title?.[0] || "C").toUpperCase()
              )}`
            }
            alt={title}
            className="w-10 h-10 rounded-full object-cover"
          />
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-900 ${
              isOnline ? "bg-green-500" : "bg-gray-400"
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 dark:text-slate-100 truncate">{title}</div>
          <div className={`text-xs ${isOnline ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-slate-400"}`}>
            {statusText}
          </div>
        </div>
      </div>

      {/* Chat content */}
      <div className="flex-1 overflow-hidden">
        <ChatWindow
          conversation={conversation}
          messages={messages}
          currentUserId={currentUserId}
          presenceMap={presenceMap}
          typingUsers={typingUsers}
          onSendMessage={onSendMessage}
          onTyping={onTyping}
          onReact={onReact}
          onReply={() => {}}
          onMarkAsRead={onMarkAsRead}
          loading={loading}
          messageStatuses={messageStatuses}
          onRetry={onRetry}
          hideHeader={true}
        />
      </div>
    </div>
  );
}

// Mobile chat bubble (horizontal layout)
function MobileChatBubble({
  conversation,
  currentUserId,
  presenceMap,
  onOpen,
  unreadCount,
}) {
  const title = getConversationTitle(conversation, currentUserId);
  const avatar = getConversationAvatar(conversation, currentUserId);
  const other = conversation?.participants?.filter((p) => p.id !== currentUserId) || [];
  const firstOther = other[0];
  const isOnline = firstOther ? !!presenceMap[firstOther.id]?.isOnline : false;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative flex-shrink-0"
      title={title}
    >
      <img
        src={
          avatar ||
          `https://placehold.co/44x44/6366F1/ffffff?text=${encodeURIComponent(
            (title?.[0] || "C").toUpperCase()
          )}`
        }
        alt={title}
        className="w-11 h-11 rounded-full object-cover ring-2 ring-white dark:ring-slate-800 shadow-md"
      />
      <span
        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-800 ${
          isOnline ? "bg-green-500" : "bg-gray-400"
        }`}
      />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
          {formatUnread(unreadCount)}
        </span>
      )}
    </button>
  );
}

function ConversationsMiniList({
  conversations,
  currentUserId,
  presenceMap,
  onOpenConversation,
}) {
  return (
    <div className="md:max-h-[60vh] overflow-y-auto">
      {conversations.length === 0 ? (
        <div className="p-4 text-sm md:text-sm text-gray-500 dark:text-slate-400">
          No conversations yet.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-slate-700">
          {conversations.map((c) => {
            const title = getConversationTitle(c, currentUserId);
            const avatar = getConversationAvatar(c, currentUserId);
            const other =
              c.participants?.filter((p) => p.id !== currentUserId) || [];
            const firstOther = other[0];
            const isOnline = firstOther
              ? !!presenceMap[firstOther.id]?.isOnline
              : false;

            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onOpenConversation(c)}
                  className="w-full px-4 py-3 md:px-3 md:py-2 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-800 active:bg-gray-100 dark:active:bg-slate-700 transition text-left"
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={
                        avatar ||
                        `https://placehold.co/40x40/6366F1/ffffff?text=${encodeURIComponent(
                          (title?.[0] || "C").toUpperCase()
                        )}`
                      }
                      alt={title}
                      className="w-11 h-11 md:w-9 md:h-9 rounded-full object-cover"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 md:w-2.5 md:h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${isOnline ? "bg-green-500" : "bg-gray-300"
                        }`}
                      title={isOnline ? "Online" : "Offline"}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-base md:text-sm font-semibold text-gray-800 dark:text-slate-100">
                        {title}
                      </div>
                      {c.unreadCount > 0 && (
                        <div className="shrink-0 text-xs md:text-[11px] font-bold bg-indigo-600 text-white rounded-full px-2 py-0.5">
                          {formatUnread(c.unreadCount)}
                        </div>
                      )}
                    </div>
                    <div className="truncate text-sm md:text-xs text-gray-500 dark:text-slate-400">
                      {c.lastMessage || " "}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FriendsMiniList({
  friends,
  presenceMap,
  onStartChat,
  isLoading,
  error,
}) {
  if (isLoading) {
    return (
      <div className="p-6 md:p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 md:h-6 md:w-6 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 text-base md:text-sm text-red-600 dark:text-red-400">{error}</div>
    );
  }
  if (!friends || friends.length === 0) {
    return (
      <div className="p-4 text-base md:text-sm text-gray-500 dark:text-slate-400">
        No friends yet.
      </div>
    );
  }

  return (
    <div className="md:max-h-[60vh] overflow-y-auto">
      <ul className="divide-y divide-gray-100 dark:divide-slate-700">
        {friends.map((f) => {
          const isOnline = !!presenceMap?.[f.id]?.isOnline;
          return (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => onStartChat(f)}
                className="w-full px-4 py-3 md:px-3 md:py-2 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-800 active:bg-gray-100 dark:active:bg-slate-700 transition text-left"
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={
                      f.imageUrl ||
                      `https://placehold.co/40x40/6366F1/ffffff?text=${encodeURIComponent(
                        (f.name?.[0] || "U").toUpperCase()
                      )}`
                    }
                    alt={f.name}
                    className="w-11 h-11 md:w-9 md:h-9 rounded-full object-cover"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 md:w-2.5 md:h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${isOnline ? "bg-green-500" : "bg-gray-300"
                      }`}
                    title={isOnline ? "Online" : "Offline"}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base md:text-sm font-semibold text-gray-800 dark:text-slate-100">
                    {f.name}
                  </div>
                  <div className="truncate text-sm md:text-xs text-gray-500 dark:text-slate-400">
                    {f.headline || f.email || " "}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MinimizedChatBubble({
  conversation,
  currentUserId,
  presenceMap,
  onExpand,
  onClose,
  unreadCount,
}) {
  const title = getConversationTitle(conversation, currentUserId);
  const avatar = getConversationAvatar(conversation, currentUserId);
  const other = conversation?.participants?.filter((p) => p.id !== currentUserId) || [];
  const firstOther = other[0];
  const isOnline = firstOther ? !!presenceMap[firstOther.id]?.isOnline : false;

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onExpand}
        className="relative h-12 w-12 rounded-full shadow-lg hover:scale-105 transition-transform"
        title={title}
      >
        <img
          src={
            avatar ||
            `https://placehold.co/48x48/6366F1/ffffff?text=${encodeURIComponent(
              (title?.[0] || "C").toUpperCase()
            )}`
          }
          alt={title}
          className="w-12 h-12 rounded-full object-cover ring-2 ring-white dark:ring-slate-800"
        />
        {/* Online indicator */}
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-800 ${
            isOnline ? "bg-green-500" : "bg-gray-400"
          }`}
        />
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
            {formatUnread(unreadCount)}
          </span>
        )}
      </button>
      {/* Close button on hover */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-gray-700 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-gray-800"
        aria-label="Close chat"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {/* Tooltip with name */}
      <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {title}
      </div>
    </div>
  );
}

function ChatPopup({
  conversation,
  currentUserId,
  messages,
  presenceMap,
  typingUsers,
  onSendMessage,
  onTyping,
  onReact,
  onReply,
  onMarkAsRead,
  onClose,
  onMinimize,
  loading,
  messageStatuses,
  onRetry,
}) {
  const title = getConversationTitle(conversation, currentUserId);
  const avatar = getConversationAvatar(conversation, currentUserId);

  return (
    <div className="w-[340px] sm:w-[360px] h-[420px] sm:h-[460px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col">
      <div className="h-12 px-3 flex items-center justify-between border-b border-gray-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={
              avatar ||
              `https://placehold.co/40x40/6366F1/ffffff?text=${encodeURIComponent(
                (title?.[0] || "C").toUpperCase()
              )}`
            }
            alt={title}
            className="w-7 h-7 rounded-full object-cover"
          />
          <span className="truncate text-sm font-semibold text-gray-800 dark:text-slate-100">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMinimize}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            aria-label="Minimize chat"
            title="Minimize"
          >
            <svg
              className="w-4 h-4 text-gray-600 dark:text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 12H4"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            aria-label="Close chat"
          >
            <svg
              className="w-4 h-4 text-gray-600 dark:text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ChatWindow
          conversation={conversation}
          messages={messages}
          currentUserId={currentUserId}
          presenceMap={presenceMap}
          typingUsers={typingUsers}
          onSendMessage={onSendMessage}
          onTyping={onTyping}
          onReact={onReact}
          onReply={onReply}
          onMarkAsRead={onMarkAsRead}
          loading={loading}
          messageStatuses={messageStatuses}
          onRetry={onRetry}
        />
      </div>
    </div>
  );
}

export default function ChatDock() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { showToast, removeToast, toasts } = useToast();

  const currentUserId = session?.user?.id;

  const handleNewMessageNotification = useCallback((senderName, preview, conversationName) => {
    showToast(`${senderName}: ${preview}`, "info", 5000);
  }, [showToast]);

  const {
    isConnected,
    conversations,
    selectedConversation,
    messages,
    messagesByConversation,
    typingUsers,
    typingUsersByConversation,
    presenceMap,
    loading,
    fetchConversations,
    fetchPresence,
    selectConversation,
    sendMessage,
    sendTyping,
    markAsRead,
    messageStatuses,
    retryMessage,
    reactToMessage,
    createConversation,
  } = useChat({
    userId: currentUserId,
    jwt: session?.jwt,
    onError: (msg) => console.error("Chat error:", msg),
    onNewMessageNotification: handleNewMessageNotification,
  });

  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [trayTab, setTrayTab] = useState("friends"); // "friends" | "chats"
  const [openConversationIds, setOpenConversationIds] = useState([]);
  const [minimized, setMinimized] = useState(() => new Set());
  const [mobileActiveConversationId, setMobileActiveConversationId] = useState(null);

  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState(null);
  const [friendsSearch, setFriendsSearch] = useState("");

  // Check if we're on mobile (used for conditional rendering)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Hide on auth pages (login/register/reset, etc.) - must be after all hooks
  const isAuthRoute = pathname?.startsWith("/auth");

  // Derived: open conversations in dock, in order.
  const openConversations = useMemo(() => {
    const byId = new Map(conversations.map((c) => [c.id, c]));
    return openConversationIds.map((id) => byId.get(id)).filter(Boolean);
  }, [conversations, openConversationIds]);

  const totalUnread = useMemo(() => {
    return (conversations || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [conversations]);

  useEffect(() => {
    if (status === "authenticated" && currentUserId) {
      fetchConversations();
    }
  }, [status, currentUserId, fetchConversations]);

  const fetchFriends = useCallback(async () => {
    try {
      setFriendsLoading(true);
      setFriendsError(null);
      const res = await fetch("/api/friends", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch friends");
      const data = await res.json();
      const friendsList = Array.isArray(data.friends) ? data.friends : [];
      setFriends(friendsList);

      // Fetch presence for all friends
      const friendIds = friendsList.map((f) => f.id).filter(Boolean);
      if (friendIds.length > 0) {
        fetchPresence(friendIds);
      }
    } catch (e) {
      setFriendsError("Failed to load friends");
      setFriends([]);
    } finally {
      setFriendsLoading(false);
    }
  }, [fetchPresence]);

  useEffect(() => {
    if (!isTrayOpen) return;
    // Load friends on demand when tray opens
    fetchFriends();
  }, [isTrayOpen, fetchFriends]);

  const openConversation = useCallback(
    async (conv) => {
      if (!conv?.id) return;

      setIsTrayOpen(false);

      // On mobile, open full-screen modal
      if (isMobile) {
        setMobileActiveConversationId(conv.id);
      } else {
        // On desktop, open popup window
        setOpenConversationIds((prev) => {
          // Bring to front (rightmost)
          const next = prev.filter((id) => id !== conv.id);
          next.push(conv.id);
          // Cap open windows
          return next.slice(-MAX_OPEN_WINDOWS);
        });

        setMinimized((prev) => {
          const next = new Set(prev);
          next.delete(conv.id);
          return next;
        });
      }

      await selectConversation(conv);
    },
    [selectConversation, isMobile]
  );

  const closeMobileChat = useCallback(() => {
    setMobileActiveConversationId(null);
  }, []);

  const closeConversation = useCallback((conversationId) => {
    setOpenConversationIds((prev) => prev.filter((id) => id !== conversationId));
    setMinimized((prev) => {
      const next = new Set(prev);
      next.delete(conversationId);
      return next;
    });
    // Also close mobile if this conversation is active
    setMobileActiveConversationId((prev) => prev === conversationId ? null : prev);
  }, []);

  const toggleMinimize = useCallback((conversationId) => {
    setMinimized((prev) => {
      const next = new Set(prev);
      if (next.has(conversationId)) next.delete(conversationId);
      else next.add(conversationId);
      return next;
    });
  }, []);

  const startChatWithFriend = useCallback(
    async (friend) => {
      if (!friend?.id) return;
      try {
        const conv = await createConversation([friend.id]);
        await openConversation(conv);
      } catch {
        // ignore; errors are already logged by hook
      }
    },
    [createConversation, openConversation]
  );

  const filteredFriends = useMemo(() => {
    if (!friendsSearch.trim()) return friends;
    const t = friendsSearch.toLowerCase();
    return (friends || []).filter((f) => {
      return (
        (f.name || "").toLowerCase().includes(t) ||
        (f.email || "").toLowerCase().includes(t) ||
        (f.headline || "").toLowerCase().includes(t)
      );
    });
  }, [friends, friendsSearch]);

  // Separate expanded and minimized conversations
  const expandedConversations = openConversations.filter((c) => !minimized.has(c.id));
  const minimizedConversations = openConversations.filter((c) => minimized.has(c.id));

  // Get the active mobile conversation
  const mobileActiveConversation = useMemo(() => {
    if (!mobileActiveConversationId) return null;
    return conversations.find((c) => c.id === mobileActiveConversationId) || null;
  }, [conversations, mobileActiveConversationId]);

  // Early returns must be after all hooks
  // Hide on auth pages and when not logged in
  if (isAuthRoute || status !== "authenticated" || !currentUserId) return null;

  return (
    <>
      {/* Mobile full-screen chat modal */}
      {mobileActiveConversation && (
        <MobileChatModal
          conversation={mobileActiveConversation}
          currentUserId={currentUserId}
          messages={messagesByConversation?.[mobileActiveConversation.id] || []}
          presenceMap={presenceMap}
          typingUsers={typingUsersByConversation?.[mobileActiveConversation.id] || []}
          onSendMessage={sendMessage}
          onTyping={sendTyping}
          onReact={reactToMessage}
          onMarkAsRead={markAsRead}
          onClose={closeMobileChat}
          loading={loading}
          messageStatuses={messageStatuses}
          onRetry={retryMessage}
        />
      )}

      <div className="fixed bottom-20 right-4 md:bottom-4 z-[60] flex items-end gap-3">
        {/* Expanded chat windows - desktop only */}
        <div className="hidden md:flex items-end gap-3">
          {expandedConversations.map((conv) => {
            const windowMessages = messagesByConversation?.[conv.id] || [];
            const windowTyping = typingUsersByConversation?.[conv.id] || [];

          return (
            <ChatPopup
              key={conv.id}
              conversation={conv}
              currentUserId={currentUserId}
              messages={windowMessages}
              presenceMap={presenceMap}
              typingUsers={windowTyping}
              onSendMessage={sendMessage}
              onTyping={sendTyping}
              onReact={reactToMessage}
              onReply={() => { }}
              onMarkAsRead={markAsRead}
              onClose={() => closeConversation(conv.id)}
              onMinimize={() => toggleMinimize(conv.id)}
              loading={loading && selectedConversation?.id === conv.id}
              messageStatuses={messageStatuses}
              onRetry={retryMessage}
            />
          );
        })}
      </div>

      {/* Mobile: minimized bubbles horizontal, to the left of button */}
      {minimizedConversations.length > 0 && (
        <div className="flex md:hidden flex-row items-end gap-2">
          {minimizedConversations.map((conv) => (
            <MinimizedChatBubble
              key={conv.id}
              conversation={conv}
              currentUserId={currentUserId}
              presenceMap={presenceMap}
              onExpand={() => openConversation(conv)}
              onClose={() => closeConversation(conv.id)}
              unreadCount={conv.unreadCount || 0}
            />
          ))}
        </div>
      )}

      {/* Desktop: minimized bubbles + tray + main button in vertical column */}
      <div className="flex flex-col items-center gap-2">
        {/* Desktop: minimized bubbles stacked vertically above the button */}
        {minimizedConversations.length > 0 && (
          <div className="hidden md:flex flex-col gap-2">
            {minimizedConversations.map((conv) => (
              <MinimizedChatBubble
                key={conv.id}
                conversation={conv}
                currentUserId={currentUserId}
                presenceMap={presenceMap}
                onExpand={() => toggleMinimize(conv.id)}
                onClose={() => closeConversation(conv.id)}
                unreadCount={conv.unreadCount || 0}
              />
            ))}
          </div>
        )}

        {/* Tray button and dropdown */}
        <div className="relative">
          {/* Mobile: Full-screen tray */}
          {isTrayOpen && isMobile && (
            <div className="fixed inset-0 z-[70] bg-white dark:bg-slate-900 flex flex-col">
              <div className="h-14 px-3 flex items-center justify-between border-b border-gray-200 dark:border-slate-700 safe-area-top">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTrayTab("friends")}
                    className={`text-sm font-semibold px-3 py-1.5 rounded-md transition ${trayTab === "friends"
                      ? "bg-indigo-600 text-white"
                      : "text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                      }`}
                  >
                    Friends
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrayTab("chats")}
                    className={`text-sm font-semibold px-3 py-1.5 rounded-md transition ${trayTab === "chats"
                      ? "bg-indigo-600 text-white"
                      : "text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                      }`}
                  >
                    Chats
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTrayOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                  aria-label="Close"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {trayTab === "friends" ? (
                  <div>
                    <div className="p-3 border-b border-gray-100 dark:border-slate-800">
                      <input
                        type="text"
                        value={friendsSearch}
                        onChange={(e) => setFriendsSearch(e.target.value)}
                        placeholder="Search friends..."
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-base text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <FriendsMiniList
                      friends={filteredFriends}
                      presenceMap={presenceMap}
                      onStartChat={startChatWithFriend}
                      isLoading={friendsLoading}
                      error={friendsError}
                    />
                  </div>
                ) : (
                  <ConversationsMiniList
                    conversations={conversations || []}
                    currentUserId={currentUserId}
                    presenceMap={presenceMap}
                    onOpenConversation={openConversation}
                  />
                )}
              </div>
            </div>
          )}

          {/* Desktop: Dropdown tray */}
          {isTrayOpen && !isMobile && (
            <div className="absolute bottom-14 right-0 w-[320px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden">
              <div className="h-12 px-3 flex items-center justify-between border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTrayTab("friends")}
                    className={`text-sm font-semibold px-2 py-1 rounded-md transition ${trayTab === "friends"
                      ? "bg-indigo-600 text-white"
                      : "text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                      }`}
                  >
                    Friends
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrayTab("chats")}
                    className={`text-sm font-semibold px-2 py-1 rounded-md transition ${trayTab === "chats"
                      ? "bg-indigo-600 text-white"
                      : "text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                      }`}
                  >
                    Chats
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTrayOpen(false)}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                  aria-label="Close chats tray"
                >
                  <svg
                    className="w-4 h-4 text-gray-600 dark:text-slate-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {trayTab === "friends" ? (
                <div>
                  <div className="p-3 border-b border-gray-100 dark:border-slate-800">
                    <input
                      type="text"
                      value={friendsSearch}
                      onChange={(e) => setFriendsSearch(e.target.value)}
                      placeholder="Search friends..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <FriendsMiniList
                    friends={filteredFriends}
                    presenceMap={presenceMap}
                    onStartChat={startChatWithFriend}
                    isLoading={friendsLoading}
                    error={friendsError}
                  />
                </div>
              ) : (
                <ConversationsMiniList
                  conversations={conversations || []}
                  currentUserId={currentUserId}
                  presenceMap={presenceMap}
                  onOpenConversation={openConversation}
                />
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsTrayOpen((v) => !v)}
            className="relative h-12 w-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl flex items-center justify-center transition"
            aria-label="Open chats"
            title={isConnected ? "Chats" : "Connecting…"}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>

            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center">
                {formatUnread(totalUnread)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
    </>
  );
}

