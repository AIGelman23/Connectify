"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { pusherClient } from "@/lib/pusher-client";

export default function useChat({
  userId,
  jwt,
  onError,
  onNewMessageNotification,
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesByConversation, setMessagesByConversation] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [presenceMap, setPresenceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [messageStatuses, setMessageStatuses] = useState({});

  const selectedConversationRef = useRef(null);
  const isWindowFocusedRef = useRef(true);
  const hasFetchedConversationsRef = useRef(false);
  const prevUserIdRef = useRef(null);
  const onErrorRef = useRef(onError);
  const onNewMessageNotificationRef = useRef(onNewMessageNotification);
  const subscribedChannelsRef = useRef(new Set());

  // Synchronize refs with state/props
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onNewMessageNotificationRef.current = onNewMessageNotification;
  }, [onNewMessageNotification]);

  // Reset fetch ref when userId changes
  useEffect(() => {
    if (prevUserIdRef.current !== null && prevUserIdRef.current !== userId) {
      hasFetchedConversationsRef.current = false;
    }
    prevUserIdRef.current = userId;
  }, [userId]);

  // --- ACTIONS ---

  const fetchPresence = useCallback(async (userIds) => {
    if (!userIds || userIds.length === 0) return;
    try {
      const res = await fetch(
        `/api/presence?userIds=${userIds.join(",")}`,
        { credentials: "include" }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.presence) {
        setPresenceMap((prev) => ({ ...prev, ...data.presence }));
      }
    } catch (err) {
      console.error("Failed to fetch presence:", err);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/conversations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch conversations");
      const data = await res.json();
      const convs = data.conversations || [];
      setConversations(convs);
      setError(null);

      // Fetch initial presence for all participants
      const participantIds = new Set();
      convs.forEach((conv) => {
        conv.participants?.forEach((p) => {
          if (p.id && p.id !== userId) {
            participantIds.add(p.id);
          }
        });
      });
      if (participantIds.size > 0) {
        fetchPresence(Array.from(participantIds));
      }
    } catch (err) {
      setError("Failed to load conversations");
      onErrorRef.current?.("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, [fetchPresence, userId]);

  const fetchMessages = useCallback(async (conversationId) => {
    try {
      const res = await fetch(
        `/api/conversations/${conversationId}/messages`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      const nextMessages = data.messages || [];

      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: nextMessages,
      }));

      // Only update if this conversation is still selected
      if (selectedConversationRef.current?.id === conversationId) {
        setMessages(nextMessages);
      }
    } catch (err) {
      onErrorRef.current?.("Failed to load messages");
    }
  }, []);

  const selectConversation = useCallback(
    async (conversation) => {
      if (!conversation) {
        setSelectedConversation(null);
        setMessages([]);
        return;
      }

      setSelectedConversation(conversation);

      // Set messages immediately from cache if available
      setMessagesByConversation((prevCache) => {
        setMessages(prevCache[conversation.id] || []);
        return prevCache;
      });

      await fetchMessages(conversation.id);

      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversation.id ? { ...c, unreadCount: 0 } : c
        )
      );
    },
    [fetchMessages]
  );

  const sendMessage = useCallback(
    async (messageData) => {
      const conversationId =
        messageData?.conversationId || selectedConversationRef.current?.id;
      if (!conversationId) return;

      // Validate message content
      const content = messageData?.content?.trim();
      const hasMedia = messageData?.mediaUrls?.length > 0;
      if (!content && !hasMedia) return;

      const messageId = crypto.randomUUID();

      const message = {
        id: messageId,
        conversationId,
        senderId: userId,
        ...messageData,
        content: content || "",
        createdAt: new Date().toISOString(),
        status: "sending",
      };

      // Optimistic update
      setMessageStatuses((prev) => ({ ...prev, [messageId]: "sending" }));
      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), message],
      }));

      if (selectedConversationRef.current?.id === conversationId) {
        setMessages((prev) => [...prev, message]);
      }

      setConversations((prev) =>
        prev
          .map((c) =>
            c.id === conversationId
              ? { ...c, lastMessage: message.content, timestamp: message.createdAt }
              : c
          )
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      );

      // Send via REST API (Pusher will broadcast to other clients)
      try {
        const res = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            content: content || "",
            type: messageData?.type || "text",
            mediaUrls: messageData?.mediaUrls,
            replyToId: messageData?.replyToId,
            clientMessageId: messageId,
          }),
        });

        if (!res.ok) throw new Error("Failed to send message");

        const data = await res.json();
        setMessageStatuses((prev) => ({ ...prev, [messageId]: "sent" }));

        // Update with server-assigned ID if different
        if (data.message?.id && data.message.id !== messageId) {
          setMessagesByConversation((prev) => ({
            ...prev,
            [conversationId]: prev[conversationId].map((m) =>
              m.id === messageId ? { ...m, ...data.message } : m
            ),
          }));
        }
      } catch (err) {
        setMessageStatuses((prev) => ({ ...prev, [messageId]: "failed" }));
        setOfflineQueue((prev) => [...prev, message]);
        onErrorRef.current?.("Failed to send message");
      }
    },
    [userId]
  );

  const sendTyping = useCallback(async (isTyping, conversationIdArg) => {
    const conversationId = conversationIdArg || selectedConversationRef.current?.id;
    if (!conversationId) return;

    try {
      await fetch(`/api/conversations/${conversationId}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isTyping }),
      });
    } catch (err) {
      // Silent fail for typing indicators
    }
  }, []);

  const markAsRead = useCallback(async (messageId, conversationIdArg) => {
    const conversationId = conversationIdArg || selectedConversationRef.current?.id;
    if (!conversationId || !messageId) return;

    try {
      await fetch(`/api/conversations/${conversationId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messageId }),
      });
    } catch (err) {
      // Silent fail
    }
  }, []);

  const reactToMessage = useCallback(async (messageId, emoji, conversationIdArg) => {
    const conversationId = conversationIdArg || selectedConversationRef.current?.id;
    if (!conversationId) return;

    try {
      await fetch(`/api/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ emoji }),
      });
    } catch (err) {
      onErrorRef.current?.("Failed to add reaction");
    }
  }, []);

  const createConversation = useCallback(
    async (participantIds, name, imageUrl) => {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantIds, name, imageUrl }),
        });
        if (!res.ok) throw new Error("Failed to create conversation");
        const data = await res.json();

        if (!data.isExisting) {
          setConversations((prev) => [data.conversation, ...prev]);
        }
        await selectConversation(data.conversation);
        return data.conversation;
      } catch (err) {
        onErrorRef.current?.("Failed to create conversation");
        throw err;
      }
    },
    [selectConversation]
  );

  const deleteConversations = useCallback(async (conversationIds) => {
    try {
      const res = await fetch("/api/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversationIds }),
      });
      if (!res.ok) throw new Error("Failed to delete conversations");

      setConversations((prev) =>
        prev.filter((c) => !conversationIds.includes(c.id))
      );
      if (
        selectedConversationRef.current &&
        conversationIds.includes(selectedConversationRef.current.id)
      ) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (err) {
      onErrorRef.current?.("Failed to delete conversations");
    }
  }, []);

  const retryMessage = useCallback(async (messageId) => {
    const msg = offlineQueue.find((m) => m.id === messageId);
    if (!msg) return;

    setOfflineQueue((prev) => prev.filter((m) => m.id !== messageId));
    setMessageStatuses((prev) => ({ ...prev, [messageId]: "sending" }));

    try {
      const res = await fetch(`/api/conversations/${msg.conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: msg.content,
          type: msg.type || "text",
          mediaUrls: msg.mediaUrls,
          replyToId: msg.replyToId,
          clientMessageId: messageId,
        }),
      });

      if (!res.ok) throw new Error("Failed to send");
      setMessageStatuses((prev) => ({ ...prev, [messageId]: "sent" }));
    } catch (err) {
      setMessageStatuses((prev) => ({ ...prev, [messageId]: "failed" }));
      setOfflineQueue((prev) => [...prev, msg]);
    }
  }, [offlineQueue]);

  // --- PUSHER SUBSCRIPTION ---

  // Subscribe to user's private channel for all their conversations
  useEffect(() => {
    if (!userId || !pusherClient) return;

    // Subscribe to user's private channel
    const userChannel = pusherClient.subscribe(`private-user-${userId}`);
    subscribedChannelsRef.current.add(`private-user-${userId}`);

    userChannel.bind("pusher:subscription_succeeded", () => {
      setIsConnected(true);
      // Update presence to online
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isOnline: true }),
      }).catch(() => {});
    });

    userChannel.bind("pusher:subscription_error", () => {
      setIsConnected(false);
    });

    // New message event
    userChannel.bind("new-message", (data) => {
      const { message } = data;
      if (!message) return;

      // Skip if it's our own message (we already have it via optimistic update)
      if (message.senderId === userId) return;

      setMessagesByConversation((prev) => {
        const existing = prev[message.conversationId] || [];
        if (existing.some((m) => m.id === message.id)) return prev;
        return { ...prev, [message.conversationId]: [...existing, message] };
      });

      if (selectedConversationRef.current?.id === message.conversationId) {
        setMessages((prev) =>
          prev.some((m) => m.id === message.id) ? prev : [...prev, message]
        );
      }

      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === message.conversationId
            ? {
                ...c,
                lastMessage: message.content,
                timestamp: message.createdAt,
                unreadCount: (c.unreadCount || 0) + 1,
              }
            : c
        );
        return [...updated].sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
      });

      // Notification
      if (onNewMessageNotificationRef.current) {
        const senderName = message.sender?.name || "Someone";
        const preview = message.content?.substring(0, 50) || "New message";
        onNewMessageNotificationRef.current(senderName, preview, message.conversationId);
      }
    });

    // Typing indicator with auto-clear timeout
    const typingTimeouts = {};
    userChannel.bind("user-typing", (data) => {
      const { conversationId, user, isTyping } = data;

      // Clear existing timeout for this user
      const timeoutKey = `${conversationId}-${user.id}`;
      if (typingTimeouts[timeoutKey]) {
        clearTimeout(typingTimeouts[timeoutKey]);
        delete typingTimeouts[timeoutKey];
      }

      setTypingUsers((prev) => {
        const current = prev[conversationId] || [];
        if (isTyping) {
          // Auto-clear after 5 seconds if no update
          typingTimeouts[timeoutKey] = setTimeout(() => {
            setTypingUsers((p) => ({
              ...p,
              [conversationId]: (p[conversationId] || []).filter((u) => u.id !== user.id),
            }));
          }, 5000);

          if (!current.some((u) => u.id === user.id)) {
            return { ...prev, [conversationId]: [...current, user] };
          }
        } else {
          return { ...prev, [conversationId]: current.filter((u) => u.id !== user.id) };
        }
        return prev;
      });
    });

    // Presence update
    userChannel.bind("presence-update", (data) => {
      const { userId: uId, isOnline, lastSeenAt } = data;
      setPresenceMap((prev) => ({
        ...prev,
        [uId]: { isOnline, lastSeenAt },
      }));
    });

    // New conversation
    userChannel.bind("new-conversation", (data) => {
      const { conversation } = data;
      if (conversation) {
        setConversations((prev) => {
          if (prev.some((c) => c.id === conversation.id)) return prev;
          return [conversation, ...prev];
        });
      }
    });

    // Connection state
    pusherClient.connection.bind("connected", () => setIsConnected(true));
    pusherClient.connection.bind("disconnected", () => {
      setIsConnected(false);
      setTypingUsers({});
    });

    // Set offline when page unloads
    const handleBeforeUnload = () => {
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline: false }),
        keepalive: true,
      }).catch(() => {});
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    return () => {
      // Set offline on cleanup
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isOnline: false }),
        keepalive: true,
      }).catch(() => {});

      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
      userChannel.unbind_all();
      pusherClient.unsubscribe(`private-user-${userId}`);
      subscribedChannelsRef.current.delete(`private-user-${userId}`);
      pusherClient.connection.unbind("connected");
      pusherClient.connection.unbind("disconnected");
    };
  }, [userId]);

  // Initialization
  useEffect(() => {
    if (userId && !hasFetchedConversationsRef.current) {
      hasFetchedConversationsRef.current = true;
      fetchConversations();
    }
  }, [userId, fetchConversations]);

  // Handle Pusher not configured
  useEffect(() => {
    if (!pusherClient) {
      setIsConnected(false);
    }
  }, []);

  return {
    isConnected,
    conversations,
    selectedConversation,
    messages,
    messagesByConversation,
    typingUsers: typingUsers[selectedConversation?.id] || [],
    typingUsersByConversation: typingUsers,
    presenceMap,
    loading,
    error,
    messageStatuses,
    offlineQueue,
    fetchConversations,
    fetchPresence,
    selectConversation,
    sendMessage,
    sendTyping,
    markAsRead,
    reactToMessage,
    createConversation,
    deleteConversations,
    retryMessage,
  };
}
