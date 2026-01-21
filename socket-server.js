// socket-server.js (ESM version)

import express from "express";
import http from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Track online users: { odId: Set<socketIds> }
const onlineUsers = new Map();
// Track user rooms: { socketId: Set<conversationIds> }
const userRooms = new Map();
// Track typing users: { conversationId: Map<userId, {name, timeout}> }
const typingUsers = new Map();

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  const userId = socket.handshake.query.userId;
  const token = socket.handshake.auth.token;

  if (!userId) {
    console.log("No userId provided, disconnecting socket");
    socket.disconnect();
    return;
  }

  // Track this socket for the user
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socket.id);
  userRooms.set(socket.id, new Set());

  // Join user's personal room for direct notifications
  socket.join(userId);
  console.log(`User ${userId} joined room ${userId}`);

  // Update presence in database
  updatePresence(userId, true, socket.id);

  // Broadcast online status to relevant users
  broadcastPresence(userId, true);

  // ===== Room Management =====

  socket.on("joinRoom", (conversationId) => {
    socket.join(conversationId);
    userRooms.get(socket.id)?.add(conversationId);
    console.log(`User ${userId} joined conversation room: ${conversationId}`);
  });

  socket.on("leaveRoom", (conversationId) => {
    socket.leave(conversationId);
    userRooms.get(socket.id)?.delete(conversationId);
    console.log(`User ${userId} left conversation room: ${conversationId}`);
  });

  // ===== Messaging =====

  socket.on("sendMessage", async (message) => {
    console.log("Message received:", message);

    try {
      // Save message to database
      const savedMessage = await prisma.message.create({
        data: {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          content: message.content,
          type: message.type || "text",
          mediaUrls: message.mediaUrls || [],
          fileName: message.fileName,
          fileSize: message.fileSize,
          mimeType: message.mimeType,
          duration: message.duration,
          replyToId: message.replyToId,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          replyTo: {
            select: {
              id: true,
              content: true,
              sender: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      // Update conversation last message
      await prisma.conversation.update({
        where: { id: message.conversationId },
        data: {
          lastMessageId: savedMessage.id,
          lastMessageContent: message.content?.substring(0, 100) || `[${message.type || "text"}]`,
          lastMessageAt: savedMessage.createdAt,
        },
      });

      // Emit to all clients in the conversation room
      io.to(message.conversationId).emit("newMessage", {
        ...savedMessage,
        reactions: {},
      });

      // Stop typing indicator for sender
      clearTyping(message.conversationId, userId);

      console.log("Message saved and emitted:", savedMessage.id);
    } catch (error) {
      console.error("Failed to save message:", error);
      // Still emit to provide real-time feel, but mark as not persisted
      io.to(message.conversationId).emit("newMessage", {
        ...message,
        persisted: false,
        reactions: {},
      });
    }
  });

  // ===== Typing Indicators =====

  socket.on("typing:start", async ({ conversationId }) => {
    if (!conversationId) return;

    // Get user name
    let userName = "Someone";
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      userName = user?.name || "Someone";
    } catch (e) {
      console.error("Error fetching user name for typing:", e);
    }

    // Track typing
    if (!typingUsers.has(conversationId)) {
      typingUsers.set(conversationId, new Map());
    }

    const convTyping = typingUsers.get(conversationId);

    // Clear existing timeout
    if (convTyping.has(userId)) {
      clearTimeout(convTyping.get(userId).timeout);
    }

    // Set new timeout (auto-stop after 5 seconds)
    const timeout = setTimeout(() => {
      clearTyping(conversationId, userId);
    }, 5000);

    convTyping.set(userId, { name: userName, timeout });

    // Broadcast to others in conversation
    socket.to(conversationId).emit("user:typing", {
      conversationId,
      userId,
      userName,
      typingUsers: Array.from(convTyping.entries()).map(([id, data]) => ({
        userId: id,
        userName: data.name,
      })),
    });
  });

  socket.on("typing:stop", ({ conversationId }) => {
    if (!conversationId) return;
    clearTyping(conversationId, userId);
  });

  // ===== Read Receipts =====

  socket.on("message:read", async ({ messageId, conversationId }) => {
    if (!messageId || !conversationId) return;

    try {
      // Create read receipt
      const readReceipt = await prisma.messageReadReceipt.upsert({
        where: {
          messageId_userId: {
            messageId,
            userId,
          },
        },
        update: {
          readAt: new Date(),
        },
        create: {
          messageId,
          userId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      // Update message status
      await prisma.message.update({
        where: { id: messageId },
        data: { status: "seen" },
      });

      // Update participant's last read
      await prisma.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
        data: {
          lastReadAt: new Date(),
          lastReadMessageId: messageId,
        },
      });

      // Broadcast to conversation
      io.to(conversationId).emit("message:seen", {
        messageId,
        conversationId,
        readBy: {
          userId: readReceipt.user.id,
          userName: readReceipt.user.name,
          userImage: readReceipt.user.image,
          readAt: readReceipt.readAt,
        },
      });
    } catch (error) {
      console.error("Error creating read receipt:", error);
    }
  });

  // ===== Reactions =====

  socket.on("message:react", async ({ messageId, conversationId, emoji }) => {
    if (!messageId || !conversationId || !emoji) return;

    const allowedEmojis = ["👍", "❤️", "😂", "😮", "😢", "😠"];
    if (!allowedEmojis.includes(emoji)) return;

    try {
      // Check if reaction exists
      const existingReaction = await prisma.messageReaction.findUnique({
        where: {
          messageId_userId_emoji: {
            messageId,
            userId,
            emoji,
          },
        },
      });

      let reaction;
      let action;

      if (existingReaction) {
        // Remove reaction (toggle)
        await prisma.messageReaction.delete({
          where: {
            messageId_userId_emoji: {
              messageId,
              userId,
              emoji,
            },
          },
        });
        action = "removed";
      } else {
        // Add reaction
        reaction = await prisma.messageReaction.create({
          data: {
            messageId,
            userId,
            emoji,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        });
        action = "added";
      }

      // Get user info for broadcast
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, image: true },
      });

      // Broadcast reaction update
      io.to(conversationId).emit("message:reaction", {
        messageId,
        conversationId,
        emoji,
        action,
        user,
      });
    } catch (error) {
      console.error("Error handling reaction:", error);
    }
  });

  // ===== Presence =====

  socket.on("presence:update", async ({ isOnline }) => {
    await updatePresence(userId, isOnline, socket.id);
    broadcastPresence(userId, isOnline);
  });

  // ===== Disconnect =====

  socket.on("disconnect", async () => {
    console.log("User disconnected:", socket.id);

    // Remove socket from user's sockets
    const userSockets = onlineUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);

      // If no more sockets, user is offline
      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
        await updatePresence(userId, false, null);
        broadcastPresence(userId, false);
      }
    }

    // Clean up typing indicators
    for (const [convId, convTyping] of typingUsers.entries()) {
      if (convTyping.has(userId)) {
        clearTyping(convId, userId);
      }
    }

    // Clean up room tracking
    userRooms.delete(socket.id);
  });

  // ===== User Left Event =====

  socket.on("userLeft", (data) => {
    console.log("User left event received:", data);
    // Broadcast to conversation that user left
    io.to(data.conversationId).emit("userLeft", {
      conversationId: data.conversationId,
      userId: data.userId,
      userName: data.userName,
    });
  });
});

// ===== Helper Functions =====

function clearTyping(conversationId, clearUserId) {
  const convTyping = typingUsers.get(conversationId);
  if (convTyping && convTyping.has(clearUserId)) {
    clearTimeout(convTyping.get(clearUserId).timeout);
    convTyping.delete(clearUserId);

    // Broadcast updated typing list
    io.to(conversationId).emit("user:stopTyping", {
      conversationId,
      userId: clearUserId,
      typingUsers: Array.from(convTyping.entries()).map(([id, data]) => ({
        userId: id,
        userName: data.name,
      })),
    });

    // Clean up empty maps
    if (convTyping.size === 0) {
      typingUsers.delete(conversationId);
    }
  }
}

async function updatePresence(userId, isOnline, socketId) {
  try {
    await prisma.userPresence.upsert({
      where: { userId },
      update: {
        isOnline,
        lastSeenAt: new Date(),
        socketId: isOnline ? socketId : null,
      },
      create: {
        userId,
        isOnline,
        socketId: isOnline ? socketId : null,
      },
    });
  } catch (error) {
    console.error("Error updating presence:", error);
  }
}

async function broadcastPresence(userId, isOnline) {
  try {
    // Get user's conversations to find who should receive presence updates
    const participants = await prisma.conversationParticipant.findMany({
      where: {
        conversation: {
          participants: {
            some: {
              userId,
              leftAt: null,
            },
          },
        },
        userId: { not: userId },
        leftAt: null,
      },
      select: {
        userId: true,
      },
    });

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, image: true },
    });

    // Broadcast to each user's personal room
    const uniqueUserIds = [...new Set(participants.map((p) => p.userId))];
    uniqueUserIds.forEach((uid) => {
      io.to(uid).emit("presence:changed", {
        userId,
        isOnline,
        lastSeenAt: new Date(),
        user,
      });
    });
  } catch (error) {
    console.error("Error broadcasting presence:", error);
  }
}

const PORT = process.env.SOCKET_PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await prisma.$disconnect();
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
