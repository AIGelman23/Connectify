"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import io from "socket.io-client";

export default function useChat({
  userId,
  jwt,
  onError,
  onNewMessageNotification,
}) {
  const [socket, setSocket] = useState(null);
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

  const socketRef = useRef(null);
  const selectedConversationRef = useRef(null);
  const isWindowFocusedRef = useRef(true);
  const hasFetchedConversationsRef = useRef(false);
  const prevUserIdRef = useRef(null);
  const onErrorRef = useRef(onError);
  const onNewMessageNotificationRef = useRef(onNewMessageNotification);

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

  // Reset fetch ref when userId changes (e.g., user logs out and logs back in)
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
      // Silently fail - presence is non-critical
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
        {
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      const nextMessages = data.messages || [];

      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: nextMessages,
      }));

      // Only update if this conversation is still selected (prevents race condition)
      if (selectedConversationRef.current?.id === conversationId) {
        setMessages(nextMessages);
        // Join socket room only for the currently selected conversation
        if (socketRef.current?.connected) {
          socketRef.current.emit("joinRoom", conversationId);
        }
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

      const prevId = selectedConversationRef.current?.id;
      setSelectedConversation(conversation);

      if (prevId && socketRef.current?.connected) {
        socketRef.current.emit("leaveRoom", prevId);
      }

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

      // Validate message content - prevent empty messages
      const content = messageData?.content?.trim();
      const hasMedia = messageData?.mediaUrls?.length > 0;
      if (!content && !hasMedia) return;

      const messageId = crypto.randomUUID();
      const status = socketRef.current?.connected ? "sending" : "failed";

      const message = {
        id: messageId,
        conversationId,
        senderId: userId,
        ...messageData,
        content: content || "", // Use trimmed content
        createdAt: new Date().toISOString(),
        status,
      };

      // 1. Update Status State
      setMessageStatuses((prev) => ({ ...prev, [messageId]: status }));

      // 2. Update Cache and Active View
      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), message],
      }));

      if (selectedConversationRef.current?.id === conversationId) {
        setMessages((prev) => [...prev, message]);
      }

      // 3. Update Conversation List
      setConversations((prev) =>
        prev
          .map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  lastMessage: message.content,
                  timestamp: message.createdAt,
                }
              : c
          )
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      );

      if (socketRef.current?.connected) {
        // Use socket acknowledgment for reliable status updates
        socketRef.current.emit("sendMessage", message, (ack) => {
          // Server acknowledged receipt
          if (ack?.success) {
            setMessageStatuses((prev) => ({ ...prev, [messageId]: "sent" }));
          } else {
            setMessageStatuses((prev) => ({ ...prev, [messageId]: "failed" }));
            setOfflineQueue((prev) => [...prev, message]);
          }
        });

        // Fallback timeout in case server doesn't acknowledge (legacy servers)
        const timeoutId = setTimeout(() => {
          setMessageStatuses((prev) => {
            // Only update if still in "sending" state (not already acked)
            if (prev[messageId] === "sending") {
              // Check if still connected
              if (socketRef.current?.connected) {
                return { ...prev, [messageId]: "sent" };
              } else {
                setOfflineQueue((p) => [...p, message]);
                return { ...prev, [messageId]: "failed" };
              }
            }
            return prev;
          });
        }, 5000);

        // Clean up timeout if we get acknowledgment earlier
        return () => clearTimeout(timeoutId);
      } else {
        setOfflineQueue((prev) => [...prev, message]);
      }
    },
    [userId]
  );

  const sendTyping = useCallback((isTyping, conversationIdArg) => {
    const conversationId =
      conversationIdArg || selectedConversationRef.current?.id;
    if (conversationId && socketRef.current?.connected) {
      socketRef.current.emit(isTyping ? "typing:start" : "typing:stop", {
        conversationId,
      });
    }
  }, []);

  const markAsRead = useCallback((messageId, conversationIdArg) => {
    const conversationId =
      conversationIdArg || selectedConversationRef.current?.id;
    if (conversationId && socketRef.current?.connected) {
      socketRef.current.emit("message:read", { messageId, conversationId });
    }
  }, []);

  const reactToMessage = useCallback((messageId, emoji, conversationIdArg) => {
    const conversationId =
      conversationIdArg || selectedConversationRef.current?.id;
    if (conversationId && socketRef.current?.connected) {
      socketRef.current.emit("message:react", {
        messageId,
        conversationId,
        emoji,
      });
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

  const retryMessage = useCallback((messageId) => {
    setOfflineQueue((prevQueue) => {
      const msg = prevQueue.find((m) => m.id === messageId);
      if (!msg) return prevQueue;

      if (!socketRef.current?.connected) {
        // Still offline, keep in queue
        onErrorRef.current?.("Cannot retry: still offline");
        return prevQueue;
      }

      setMessageStatuses((prev) => ({ ...prev, [messageId]: "sending" }));

      // Use acknowledgment for reliable status updates
      socketRef.current.emit("sendMessage", msg, (ack) => {
        if (ack?.success) {
          setMessageStatuses((prev) => ({ ...prev, [messageId]: "sent" }));
        } else {
          setMessageStatuses((prev) => ({ ...prev, [messageId]: "failed" }));
          // Re-add to queue on failure
          setOfflineQueue((q) => [...q, msg]);
        }
      });

      // Fallback timeout for servers without acknowledgment
      setTimeout(() => {
        setMessageStatuses((prev) => {
          if (prev[messageId] === "sending") {
            if (socketRef.current?.connected) {
              return { ...prev, [messageId]: "sent" };
            } else {
              setOfflineQueue((q) => [...q, msg]);
              return { ...prev, [messageId]: "failed" };
            }
          }
          return prev;
        });
      }, 5000);

      return prevQueue.filter((m) => m.id !== messageId);
    });
  }, []);

  // --- CORE EFFECTS ---

  // Socket Lifecycle
  useEffect(() => {
    if (!userId) return;

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:3001";
    const newSocket = io(socketUrl, {
      auth: jwt ? { token: jwt } : undefined,
      query: { userId },
      transports: ["websocket"],
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Event handlers - defined separately for proper cleanup
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => {
      setIsConnected(false);
      // Clear typing indicators on disconnect
      setTypingUsers({});
    };

    const handleNewMessage = (message) => {
      // Functional updates prevent 'conversations' and 'messages' from being dependencies
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
                unreadCount:
                  message.senderId !== userId
                    ? (c.unreadCount || 0) + 1
                    : c.unreadCount,
              }
            : c
        );
        return [...updated].sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
      });

      // Notify about new message from others (not from self)
      if (message.senderId !== userId && onNewMessageNotificationRef.current) {
        const senderName = message.sender?.name || "Someone";
        const preview = message.content?.substring(0, 50) || "New message";
        onNewMessageNotificationRef.current(senderName, preview, message.conversationId);
      }
    };

    const handleTyping = ({ conversationId, typingUsers: allTyping }) => {
      setTypingUsers((prev) => ({ ...prev, [conversationId]: allTyping }));
    };

    const handlePresenceChanged = ({ userId: uId, isOnline, lastSeenAt }) => {
      setPresenceMap((prev) => ({
        ...prev,
        [uId]: { isOnline, lastSeenAt },
      }));
    };

    // Register event listeners
    newSocket.on("connect", handleConnect);
    newSocket.on("disconnect", handleDisconnect);
    newSocket.on("newMessage", handleNewMessage);
    newSocket.on("user:typing", handleTyping);
    newSocket.on("presence:changed", handlePresenceChanged);

    return () => {
      // Remove all listeners before disconnecting
      newSocket.off("connect", handleConnect);
      newSocket.off("disconnect", handleDisconnect);
      newSocket.off("newMessage", handleNewMessage);
      newSocket.off("user:typing", handleTyping);
      newSocket.off("presence:changed", handlePresenceChanged);
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [userId, jwt]); // Minimal dependencies to prevent socket flapping

  // Initialization - fetch conversations once when userId is available
  useEffect(() => {
    if (userId && !hasFetchedConversationsRef.current) {
      hasFetchedConversationsRef.current = true;
      fetchConversations();
    }
  }, [userId, fetchConversations]);

  return {
    socket,
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
