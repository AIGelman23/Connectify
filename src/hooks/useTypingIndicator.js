"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export default function useTypingIndicator({
  socket,
  conversationId,
  debounceMs = 2000,
}) {
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  // Listen for typing events
  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleTyping = ({ conversationId: convId, typingUsers: users }) => {
      if (convId === conversationId) {
        setTypingUsers(users || []);
      }
    };

    const handleStopTyping = ({ conversationId: convId, typingUsers: users }) => {
      if (convId === conversationId) {
        setTypingUsers(users || []);
      }
    };

    socket.on("user:typing", handleTyping);
    socket.on("user:stopTyping", handleStopTyping);

    return () => {
      socket.off("user:typing", handleTyping);
      socket.off("user:stopTyping", handleStopTyping);
    };
  }, [socket, conversationId]);

  // Clean up typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Start typing
  const startTyping = useCallback(() => {
    if (!socket || !conversationId) return;

    // Emit typing start
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing:start", { conversationId });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, debounceMs);
  }, [socket, conversationId, debounceMs]);

  // Stop typing
  const stopTyping = useCallback(() => {
    if (!socket || !conversationId) return;

    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit("typing:stop", { conversationId });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [socket, conversationId]);

  // Handle input change - debounced typing indicator
  const handleInputChange = useCallback(() => {
    startTyping();
  }, [startTyping]);

  return {
    typingUsers,
    startTyping,
    stopTyping,
    handleInputChange,
  };
}
