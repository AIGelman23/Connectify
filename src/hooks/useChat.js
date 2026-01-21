"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import io from "socket.io-client";

export default function useChat({ userId, jwt, onError }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [presenceMap, setPresenceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const socketRef = useRef(null);
  const selectedConversationRef = useRef(null);

  // Keep ref in sync with state
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Initialize socket connection
  useEffect(() => {
    if (!userId || !jwt) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:3001";

    const newSocket = io(socketUrl, {
      auth: { token: jwt },
      query: { userId },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection events
    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      setError("Failed to connect to chat server");
      onError?.("Failed to connect to chat server");
    });

    // Message events
    newSocket.on("newMessage", (message) => {
      console.log("New message received:", message);

      // Update messages if we're in this conversation
      if (selectedConversationRef.current?.id === message.conversationId) {
        setMessages((prev) => {
          // Check for duplicates
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }

      // Update conversation list
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === message.conversationId) {
            return {
              ...conv,
              lastMessage: message.content,
              timestamp: message.createdAt,
              unreadCount:
                message.senderId !== userId
                  ? (conv.unreadCount || 0) + 1
                  : conv.unreadCount,
            };
          }
          return conv;
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      );
    });

    // Typing events
    newSocket.on("user:typing", ({ conversationId, userId: typingUserId, userName, typingUsers: allTyping }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [conversationId]: allTyping,
      }));
    });

    newSocket.on("user:stopTyping", ({ conversationId, typingUsers: allTyping }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [conversationId]: allTyping,
      }));
    });

    // Read receipt events
    newSocket.on("message:seen", ({ messageId, conversationId, readBy }) => {
      if (selectedConversationRef.current?.id === conversationId) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === messageId) {
              const newSeenBy = msg.seenBy || [];
              if (!newSeenBy.some((s) => s.userId === readBy.userId)) {
                return {
                  ...msg,
                  status: "seen",
                  seenBy: [...newSeenBy, readBy],
                };
              }
            }
            return msg;
          })
        );
      }
    });

    // Reaction events
    newSocket.on("message:reaction", ({ messageId, conversationId, emoji, action, user }) => {
      if (selectedConversationRef.current?.id === conversationId) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === messageId) {
              const newReactions = { ...msg.reactions };

              if (action === "added") {
                if (!newReactions[emoji]) {
                  newReactions[emoji] = [];
                }
                if (!newReactions[emoji].some((r) => r.userId === user.id)) {
                  newReactions[emoji].push({
                    userId: user.id,
                    userName: user.name,
                    userImage: user.image,
                  });
                }
              } else if (action === "removed") {
                if (newReactions[emoji]) {
                  newReactions[emoji] = newReactions[emoji].filter(
                    (r) => r.userId !== user.id
                  );
                  if (newReactions[emoji].length === 0) {
                    delete newReactions[emoji];
                  }
                }
              }

              return { ...msg, reactions: newReactions };
            }
            return msg;
          })
        );
      }
    });

    // Presence events
    newSocket.on("presence:changed", ({ userId: changedUserId, isOnline, lastSeenAt }) => {
      setPresenceMap((prev) => ({
        ...prev,
        [changedUserId]: { isOnline, lastSeenAt },
      }));
    });

    // User left event
    newSocket.on("userLeft", ({ conversationId, userName }) => {
      if (selectedConversationRef.current?.id === conversationId) {
        const systemMessage = {
          id: `system-${Date.now()}`,
          type: "system",
          content: "left the group",
          senderId: "system",
          sender: { name: userName },
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, systemMessage]);
      }
    });

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [userId, jwt, onError]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/conversations");
      if (!res.ok) throw new Error("Failed to fetch conversations");

      const data = await res.json();
      setConversations(data.conversations || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setError("Failed to load conversations");
      onError?.("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");

      const data = await res.json();
      setMessages(data.messages || []);

      // Join the room
      if (socketRef.current?.connected) {
        socketRef.current.emit("joinRoom", conversationId);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
      onError?.("Failed to load messages");
    }
  }, [onError]);

  // Select a conversation
  const selectConversation = useCallback(async (conversation) => {
    if (!conversation) {
      setSelectedConversation(null);
      setMessages([]);
      return;
    }

    setSelectedConversation(conversation);

    // Leave previous room
    if (selectedConversationRef.current && socketRef.current?.connected) {
      socketRef.current.emit("leaveRoom", selectedConversationRef.current.id);
    }

    // Fetch messages and join room
    await fetchMessages(conversation.id);

    // Clear unread count
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversation.id ? { ...conv, unreadCount: 0 } : conv
      )
    );
  }, [fetchMessages]);

  // Send a message
  const sendMessage = useCallback(async (messageData) => {
    if (!selectedConversationRef.current || !socketRef.current) return;

    const message = {
      id: crypto.randomUUID(),
      conversationId: selectedConversationRef.current.id,
      senderId: userId,
      ...messageData,
      createdAt: new Date().toISOString(),
    };

    // Optimistic update
    setMessages((prev) => [...prev, { ...message, status: "sent" }]);

    // Update conversation
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === message.conversationId
          ? {
              ...conv,
              lastMessage: message.content,
              timestamp: message.createdAt,
            }
          : conv
      ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    );

    // Send via socket
    socketRef.current.emit("sendMessage", message);
  }, [userId]);

  // Send typing indicator
  const sendTyping = useCallback((isTyping) => {
    if (!selectedConversationRef.current || !socketRef.current) return;

    const event = isTyping ? "typing:start" : "typing:stop";
    socketRef.current.emit(event, {
      conversationId: selectedConversationRef.current.id,
    });
  }, []);

  // Mark message as read
  const markAsRead = useCallback((messageId) => {
    if (!selectedConversationRef.current || !socketRef.current) return;

    socketRef.current.emit("message:read", {
      messageId,
      conversationId: selectedConversationRef.current.id,
    });
  }, []);

  // React to a message
  const reactToMessage = useCallback((messageId, emoji) => {
    if (!selectedConversationRef.current || !socketRef.current) return;

    socketRef.current.emit("message:react", {
      messageId,
      conversationId: selectedConversationRef.current.id,
      emoji,
    });
  }, []);

  // Create a new conversation
  const createConversation = useCallback(async (participantIds, name, imageUrl) => {
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
      console.error("Error creating conversation:", err);
      onError?.("Failed to create conversation");
      throw err;
    }
  }, [selectConversation, onError]);

  // Delete conversations
  const deleteConversations = useCallback(async (conversationIds) => {
    try {
      const res = await fetch("/api/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversationIds }),
      });

      if (!res.ok) throw new Error("Failed to delete conversations");

      setConversations((prev) =>
        prev.filter((conv) => !conversationIds.includes(conv.id))
      );

      if (selectedConversationRef.current && conversationIds.includes(selectedConversationRef.current.id)) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Error deleting conversations:", err);
      onError?.("Failed to delete conversations");
    }
  }, [onError]);

  // Initial fetch
  useEffect(() => {
    if (userId) {
      fetchConversations();
    }
  }, [userId, fetchConversations]);

  return {
    // State
    socket,
    isConnected,
    conversations,
    selectedConversation,
    messages,
    typingUsers: typingUsers[selectedConversation?.id] || [],
    presenceMap,
    loading,
    error,

    // Actions
    fetchConversations,
    selectConversation,
    sendMessage,
    sendTyping,
    markAsRead,
    reactToMessage,
    createConversation,
    deleteConversations,
  };
}
