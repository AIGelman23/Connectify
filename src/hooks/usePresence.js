"use client";

import { useState, useCallback, useEffect, useRef } from "react";

export default function usePresence({
  socket,
  userId,
  heartbeatInterval = 30000, // 30 seconds
}) {
  const [presenceMap, setPresenceMap] = useState({});
  const [isOnline, setIsOnline] = useState(true);
  const heartbeatRef = useRef(null);

  // Listen for presence changes
  useEffect(() => {
    if (!socket) return;

    const handlePresenceChange = ({ userId: changedUserId, isOnline, lastSeenAt, user }) => {
      setPresenceMap((prev) => ({
        ...prev,
        [changedUserId]: {
          isOnline,
          lastSeenAt,
          user,
        },
      }));
    };

    socket.on("presence:changed", handlePresenceChange);

    return () => {
      socket.off("presence:changed", handlePresenceChange);
    };
  }, [socket]);

  // Update own presence
  const updatePresence = useCallback(async (online) => {
    setIsOnline(online);

    // Update via API
    try {
      await fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isOnline: online,
          socketId: socket?.id,
        }),
      });
    } catch (err) {
      console.error("Error updating presence:", err);
    }

    // Also update via socket
    if (socket?.connected) {
      socket.emit("presence:update", { isOnline: online });
    }
  }, [socket]);

  // Heartbeat to maintain online status
  useEffect(() => {
    if (!userId) return;

    // Initial online status
    updatePresence(true);

    // Set up heartbeat
    heartbeatRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetch("/api/presence", {
          method: "PATCH",
        }).catch((err) => console.error("Heartbeat error:", err));
      }
    }, heartbeatInterval);

    // Handle visibility change
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === "visible";
      updatePresence(isVisible);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Handle window focus/blur
    const handleFocus = () => updatePresence(true);
    const handleBlur = () => updatePresence(false);

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    // Cleanup
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);

      // Set offline on unmount
      updatePresence(false);
    };
  }, [userId, updatePresence, heartbeatInterval]);

  // Fetch presence for specific users
  const fetchPresence = useCallback(async (userIds) => {
    if (!userIds || userIds.length === 0) return;

    try {
      const res = await fetch(`/api/presence?userIds=${userIds.join(",")}`);
      if (!res.ok) throw new Error("Failed to fetch presence");

      const data = await res.json();
      setPresenceMap((prev) => ({
        ...prev,
        ...data.presence,
      }));
    } catch (err) {
      console.error("Error fetching presence:", err);
    }
  }, []);

  // Get presence for a specific user
  const getPresence = useCallback(
    (targetUserId) => {
      return presenceMap[targetUserId] || { isOnline: false, lastSeenAt: null };
    },
    [presenceMap]
  );

  return {
    presenceMap,
    isOnline,
    updatePresence,
    fetchPresence,
    getPresence,
  };
}
