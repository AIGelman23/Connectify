"use client";

import { useState, useCallback } from "react";

export default function useMessages({ conversationId, onError }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);

  // Fetch messages
  const fetchMessages = useCallback(async (cursor = null, limit = 50) => {
    if (!conversationId) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: limit.toString() });
      if (cursor) params.append("cursor", cursor);

      const res = await fetch(
        `/api/conversations/${conversationId}/messages?${params}`
      );

      if (!res.ok) throw new Error("Failed to fetch messages");

      const data = await res.json();

      if (cursor) {
        // Append to existing messages (for pagination)
        setMessages((prev) => [...data.messages, ...prev]);
      } else {
        // Replace messages (initial load)
        setMessages(data.messages);
      }

      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error("Error fetching messages:", err);
      onError?.("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [conversationId, onError]);

  // Load more messages
  const loadMore = useCallback(() => {
    if (nextCursor && !loading) {
      fetchMessages(nextCursor);
    }
  }, [nextCursor, loading, fetchMessages]);

  // Add a new message locally
  const addMessage = useCallback((message) => {
    setMessages((prev) => {
      // Check for duplicates
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
  }, []);

  // Update a message locally
  const updateMessage = useCallback((messageId, updates) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  // Remove a message locally
  const removeMessage = useCallback((messageId) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  }, []);

  // Edit a message
  const editMessage = useCallback(async (messageId, content) => {
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) throw new Error("Failed to edit message");

      const data = await res.json();
      updateMessage(messageId, data.message);
      return data.message;
    } catch (err) {
      console.error("Error editing message:", err);
      onError?.("Failed to edit message");
      throw err;
    }
  }, [updateMessage, onError]);

  // Delete a message
  const deleteMessage = useCallback(async (messageId, forEveryone = false) => {
    try {
      const params = new URLSearchParams({ forEveryone: forEveryone.toString() });
      const res = await fetch(`/api/messages/${messageId}?${params}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete message");

      if (forEveryone) {
        updateMessage(messageId, {
          isDeleted: true,
          deletedForAll: true,
          content: "This message was deleted",
        });
      } else {
        removeMessage(messageId);
      }
    } catch (err) {
      console.error("Error deleting message:", err);
      onError?.("Failed to delete message");
      throw err;
    }
  }, [updateMessage, removeMessage, onError]);

  // Add reaction
  const addReaction = useCallback(async (messageId, emoji) => {
    try {
      const res = await fetch(`/api/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });

      if (!res.ok) {
        if (res.status === 409) {
          // Already reacted, so remove
          await removeReaction(messageId, emoji);
          return;
        }
        throw new Error("Failed to add reaction");
      }

      return await res.json();
    } catch (err) {
      console.error("Error adding reaction:", err);
      onError?.("Failed to add reaction");
    }
  }, [onError]);

  // Remove reaction
  const removeReaction = useCallback(async (messageId, emoji) => {
    try {
      const params = new URLSearchParams({ emoji });
      const res = await fetch(`/api/messages/${messageId}/reactions?${params}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to remove reaction");
    } catch (err) {
      console.error("Error removing reaction:", err);
      onError?.("Failed to remove reaction");
    }
  }, [onError]);

  // Mark as read
  const markAsRead = useCallback(async (messageId) => {
    try {
      await fetch(`/api/messages/${messageId}/read`, {
        method: "POST",
      });
    } catch (err) {
      console.error("Error marking message as read:", err);
    }
  }, []);

  return {
    messages,
    loading,
    hasMore,
    fetchMessages,
    loadMore,
    addMessage,
    updateMessage,
    removeMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    markAsRead,
    setMessages,
  };
}
