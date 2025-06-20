// src/resolvers.js
import prisma from "./lib/prisma.js";

export const resolvers = {
  Query: {
    users: () => {
      return prisma.user.findMany({
        include: { profile: true }, // Include profile when fetching users
      });
    },
    user: (parent, { id }) => {
      return prisma.user.findUnique({
        where: { id },
        include: { profile: true },
      });
    },
    connectionRequestsSent: ({ userId }) => {
      return prisma.connectionRequest.findMany({
        where: { senderId: userId },
        include: { receiver: true, sender: true },
      });
    },
    connectionRequestsReceived: ({ userId }) => {
      return prisma.connectionRequest.findMany({
        where: { receiverId: userId },
        include: { receiver: true, sender: true },
      });
    },
    myConnections: async (parent, { currentUserId }, context) => {
      console.log("[BACKEND RESOLVER] myConnections resolver called.");
      console.log("[BACKEND RESOLVER] currentUserId from args:", currentUserId);

      if (!currentUserId) {
        console.warn(
          "[BACKEND RESOLVER] No user ID provided for myConnections. Returning empty array."
        );
        return [];
      }

      try {
        const acceptedRequests = await prisma.connectionRequest.findMany({
          where: {
            status: "ACCEPTED",
            OR: [{ senderId: currentUserId }, { receiverId: currentUserId }],
          },
          include: {
            sender: {
              include: { profile: true },
            },
            receiver: {
              include: { profile: true },
            },
          },
        });

        const connectedUsers = new Map();

        acceptedRequests.forEach((request) => {
          // Always add both sender and receiver if not self
          if (request.senderId !== currentUserId) {
            connectedUsers.set(request.sender.id, {
              ...request.sender,
              imageUrl:
                request.sender.profile?.profilePictureUrl ||
                request.sender.image ||
                null,
              profile: request.sender.profile || null,
            });
          }
          if (request.receiverId !== currentUserId) {
            connectedUsers.set(request.receiver.id, {
              ...request.receiver,
              imageUrl:
                request.receiver.profile?.profilePictureUrl ||
                request.receiver.image ||
                null,
              profile: request.receiver.profile || null,
            });
          }
        });

        const finalConnections = Array.from(connectedUsers.values());

        console.log(
          "[BACKEND RESOLVER] Final connections being returned (length):",
          finalConnections.length
        );
        return finalConnections;
      } catch (error) {
        console.error(
          "[BACKEND RESOLVER] Error fetching myConnections:",
          error
        );
        return [];
      }
    },
  },

  // ... your existing Mutation resolvers ...

  // ... your existing User field-level resolvers (profile, connections, mutualFriends) ...
  // Note: The User.connections resolver is correctly derived, so we're reusing that logic.
  User: {
    profile: (parent) => {
      return prisma.profile.findUnique({
        where: { userId: parent.id },
      });
    },
    connections: async (parent) => {
      // This existing logic is correct for field-level resolution
      const userId = parent.id;
      const acceptedRequests = await prisma.connectionRequest.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
        include: { sender: true, receiver: true },
      });

      const connectedUsers = new Map();

      acceptedRequests.forEach((request) => {
        if (request.senderId === userId) {
          connectedUsers.set(request.receiver.id, request.receiver);
        } else {
          connectedUsers.set(request.sender.id, request.sender);
        }
      });

      return Array.from(connectedUsers.values());
    },
    mutualFriends: async (parent, { targetUserId }) => {
      const userAId = parent.id; // The user for whom we are finding mutual friends
      const userBId = targetUserId; // The target user to find mutual friends with

      // 1. Get connections of User A
      const userAConnections = await prisma.connectionRequest.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ senderId: userAId }, { receiverId: userAId }],
        },
        select: {
          senderId: true,
          receiverId: true,
        },
      });

      const userAConnectedIds = new Set();
      userAConnections.forEach((conn) => {
        if (conn.senderId !== userAId) userAConnectedIds.add(conn.senderId);
        if (conn.receiverId !== userAId) userAConnectedIds.add(conn.receiverId);
      });

      // 2. Get connections of User B
      const userBConnections = await prisma.connectionRequest.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ senderId: userBId }, { receiverId: userBId }],
        },
        select: {
          senderId: true,
          receiverId: true,
        },
      });

      const userBConnectedIds = new Set();
      userBConnections.forEach((conn) => {
        if (conn.senderId !== userBId) userBConnectedIds.add(conn.senderId);
        if (conn.receiverId !== userBId) userBConnectedIds.add(conn.receiverId);
      });

      // 3. Find intersection (mutual friend IDs)
      const mutualFriendIds = Array.from(userAConnectedIds).filter((id) =>
        userBConnectedIds.has(id)
      );

      // 4. Fetch the actual user objects for the mutual friends
      const mutualFriends = await prisma.user.findMany({
        where: {
          id: {
            in: mutualFriendIds,
          },
        },
      });

      return mutualFriends;
    },
    mutualFriendsCount: async (parent, { targetUserId }) => {
      // Reuse the mutualFriends resolver and return its length
      const mutualFriends = await resolvers.User.mutualFriends(parent, {
        targetUserId,
      });
      return mutualFriends.length;
    },
  },

  // ... rest of your resolvers for other types (ConnectionRequest, Post, Comment, Notification)

  Mutation: {
    sendConnectionRequest: async (parent, { senderId, receiverId }) => {
      // Basic validation: ensure sender and receiver exist and are not the same
      if (senderId === receiverId) {
        throw new Error("Cannot send a connection request to yourself.");
      }
      const request = await prisma.connectionRequest.create({
        data: {
          senderId,
          receiverId,
          status: "PENDING",
        },
      });
      // --- Add notification for receiver ---
      await prisma.notification.create({
        data: {
          recipientId: receiverId,
          type: "CONNECTION_REQUEST",
          message: `You have a new connection request.`,
          senderId: senderId,
          targetId: request.id,
          read: false,
        },
      });
      return request;
    },
    acceptConnectionRequest: async (parent, { requestId }) => {
      const request = await prisma.connectionRequest.update({
        where: { id: requestId, status: "PENDING" }, // Only accept pending requests
        data: { status: "ACCEPTED" },
      });

      if (!request) {
        throw new Error("Connection request not found or already processed.");
      }

      // Optional: Create a notification for the sender
      await prisma.notification.create({
        data: {
          recipientId: request.senderId,
          type: "CONNECTION_ACCEPTED",
          message: `Your connection request to ${
            request.receiver.name || request.receiverId
          } was accepted!`,
          senderId: request.receiverId,
          targetId: request.id,
        },
      });

      return request;
    },
    rejectConnectionRequest: async (parent, { requestId }) => {
      const request = await prisma.connectionRequest.update({
        where: { id: requestId, status: "PENDING" }, // Only reject pending requests
        data: { status: "REJECTED" },
      });

      if (!request) {
        throw new Error("Connection request not found or already processed.");
      }

      // Optional: Create a notification for the sender
      await prisma.notification.create({
        data: {
          recipientId: request.senderId,
          type: "CONNECTION_ACCEPTED", // Consider a REJECTED type if distinct UI needed
          message: `Your connection request to ${
            request.receiver.name || request.receiverId
          } was rejected.`,
          senderId: request.receiverId,
          targetId: request.id,
        },
      });

      return request;
    },
    createPost: ({ authorId, content }) => {
      return prisma.post.create({
        data: {
          authorId,
          content,
        },
      });
    },
    createUser: (parent, { name, email, hashedPassword }, context) => {
      // Remember to handle password hashing securely in a real application!
      // For now, directly using hashedPassword as provided.
      return context.prisma.user.create({
        data: {
          name,
          email, // Corrected typo: should be 'email', not 'mail'
          hashedPassword,
        },
      });
    },
  },

  // Field-level Resolvers for `User` type
  User: {
    profile: (parent) => {
      // When a User object is returned, this resolver is called to get its profile
      return prisma.profile.findUnique({
        where: { userId: parent.id },
      });
    },
    connections: async (parent) => {
      const userId = parent.id;
      const acceptedRequests = await prisma.connectionRequest.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
        include: { sender: true, receiver: true }, // Include both sides to determine the connected user
      });

      const connectedUsers = new Map(); // Use Map to store unique users

      acceptedRequests.forEach((request) => {
        if (request.senderId === userId) {
          connectedUsers.set(request.receiver.id, request.receiver);
        } else {
          connectedUsers.set(request.sender.id, request.sender);
        }
      });

      return Array.from(connectedUsers.values());
    },
    mutualFriends: async (parent, { targetUserId }) => {
      const userAId = parent.id; // The user for whom we are finding mutual friends
      const userBId = targetUserId; // The target user to find mutual friends with

      // 1. Get connections of User A
      const userAConnections = await prisma.connectionRequest.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ senderId: userAId }, { receiverId: userAId }],
        },
        select: {
          senderId: true,
          receiverId: true,
        },
      });

      const userAConnectedIds = new Set();
      userAConnections.forEach((conn) => {
        if (conn.senderId !== userAId) userAConnectedIds.add(conn.senderId);
        if (conn.receiverId !== userAId) userAConnectedIds.add(conn.receiverId);
      });

      // 2. Get connections of User B
      const userBConnections = await prisma.connectionRequest.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ senderId: userBId }, { receiverId: userBId }],
        },
        select: {
          senderId: true,
          receiverId: true,
        },
      });

      const userBConnectedIds = new Set();
      userBConnections.forEach((conn) => {
        if (conn.senderId !== userBId) userBConnectedIds.add(conn.senderId);
        if (conn.receiverId !== userBId) userBConnectedIds.add(conn.receiverId);
      });

      // 3. Find intersection (mutual friend IDs)
      const mutualFriendIds = Array.from(userAConnectedIds).filter((id) =>
        userBConnectedIds.has(id)
      );

      // 4. Fetch the actual user objects for the mutual friends
      const mutualFriends = await prisma.user.findMany({
        where: {
          id: {
            in: mutualFriendIds,
          },
        },
      });

      return mutualFriends;
    },
    mutualFriendsCount: async (parent, { targetUserId }) => {
      // Reuse the mutualFriends resolver and return its length
      const mutualFriends = await resolvers.User.mutualFriends(parent, {
        targetUserId,
      });
      return mutualFriends.length;
    },
  },

  // Resolve fields for other types if they have relations not directly mapped by Prisma's default behavior
  ConnectionRequest: {
    sender: (parent) =>
      prisma.user.findUnique({ where: { id: parent.senderId } }),
    receiver: (parent) =>
      prisma.user.findUnique({ where: { id: parent.receiverId } }),
  },
  Post: {
    author: (parent) =>
      prisma.user.findUnique({ where: { id: parent.authorId } }),
    comments: (parent) =>
      prisma.comment.findMany({ where: { postId: parent.id } }),
  },
  Comment: {
    author: (parent) =>
      prisma.user.findUnique({ where: { id: parent.authorId } }),
    post: (parent) => prisma.post.findUnique({ where: { id: parent.postId } }),
    parentComment: (parent) => {
      if (!parent.parentCommentId) return null;
      return prisma.comment.findUnique({
        where: { id: parent.parentCommentId },
      });
    },
    replies: (parent) =>
      prisma.comment.findMany({ where: { parentCommentId: parent.id } }),
  },
  Notification: {
    recipient: (parent) =>
      prisma.user.findUnique({ where: { id: parent.recipientId } }),
    sender: (parent) => {
      if (!parent.senderId) return null;
      return prisma.user.findUnique({ where: { id: parent.senderId } });
    },
  },
};
