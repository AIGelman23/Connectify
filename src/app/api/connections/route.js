// src/app/api/connections/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    // Authenticate the user
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get("q") || "";

    console.log(
      `Fetching connections for user ${userId} with search: "${searchQuery}"`
    );

    // Get all connection requests related to current user
    const userConnections = await prisma.connectionRequest.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        // Include both accepted and pending connections to handle filtering properly
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
            profile: {
              select: {
                headline: true,
                profilePictureUrl: true,
              },
            },
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
            profile: {
              select: {
                headline: true,
                profilePictureUrl: true,
              },
            },
          },
        },
      },
    });

    // If this is a search query, format and return just connections matching the search
    if (url.searchParams.has("q")) {
      // Extract the actual connected users from the connections data
      const connectedUsers = userConnections
        .filter((conn) => conn.status === "ACCEPTED")
        .map((conn) => {
          const otherUser =
            conn.senderId === userId ? conn.receiver : conn.sender;
          return {
            id: otherUser.id,
            name: otherUser.name,
            email: otherUser.email,
            imageUrl:
              otherUser.profile?.profilePictureUrl ||
              otherUser.image ||
              `https://placehold.co/100x100/A78BFA/ffffff?text=${
                otherUser.name ? otherUser.name[0].toUpperCase() : "U"
              }`,
            headline: otherUser.profile?.headline || "No headline available",
          };
        });

      // Filter connections by search query
      const filteredConnections = searchQuery
        ? connectedUsers.filter(
            (user) =>
              user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              user.email?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : connectedUsers;

      return NextResponse.json(
        { connections: filteredConnections },
        { status: 200 }
      );
    }

    // Extract the IDs of all users connected to current user (including pending)
    const connectedUserIds = userConnections.map((conn) => {
      return conn.senderId === userId ? conn.receiverId : conn.senderId;
    });

    // Add current user ID to the exclusion list
    connectedUserIds.push(userId);

    // Fetch users for search or suggestions - excluding already connected users
    let usersToDisplay = [];
    if (searchQuery) {
      // Search users by name or email containing the search query
      const searchUsers = await prisma.user.findMany({
        where: {
          AND: [
            { id: { not: { in: connectedUserIds } } }, // Exclude connected users
            {
              OR: [
                { name: { contains: searchQuery, mode: "insensitive" } },
                { email: { contains: searchQuery, mode: "insensitive" } },
              ],
            },
          ],
        },
        include: {
          profile: {
            select: {
              headline: true,
              profilePictureUrl: true,
            },
          },
        },
        take: 20,
      });
      usersToDisplay = searchUsers;
    } else {
      // Get suggestions - users not connected to the current user
      const allUsers = await prisma.user.findMany({
        where: {
          id: { not: { in: connectedUserIds } }, // Exclude connected users and current user
        },
        include: {
          profile: {
            select: {
              headline: true,
              profilePictureUrl: true,
            },
          },
        },
        take: 10,
      });
      usersToDisplay = allUsers;
    }

    // Format all users with connection status
    const formattedUsers = usersToDisplay.map((user) => {
      // Find connection with this user if it exists
      const connection = userConnections.find(
        (conn) =>
          (conn.senderId === userId && conn.receiverId === user.id) ||
          (conn.receiverId === userId && conn.senderId === user.id)
      );

      let connectionStatus = "NOT_CONNECTED";
      let requestId = null;

      if (connection) {
        if (connection.status === "ACCEPTED") {
          connectionStatus = "CONNECTED";
          requestId = connection.id;
        } else if (connection.status === "PENDING") {
          if (connection.senderId === userId) {
            connectionStatus = "SENT_PENDING";
          } else {
            connectionStatus = "RECEIVED_PENDING";
          }
          requestId = connection.id;
        }
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        imageUrl:
          user.profile?.profilePictureUrl ||
          user.image ||
          `https://placehold.co/100x100/A78BFA/ffffff?text=${
            user.name ? user.name[0].toUpperCase() : "U"
          }`,
        headline: user.profile?.headline || "No headline available",
        connectionStatus,
        requestId,
      };
    });

    // Also extract direct connections, sent requests, and received requests
    const acceptedConnections = userConnections
      .filter((conn) => conn.status === "ACCEPTED")
      .map((conn) => {
        const otherUser =
          conn.senderId === userId ? conn.receiver : conn.sender;
        return {
          id: otherUser.id,
          name: otherUser.name,
          email: otherUser.email,
          imageUrl:
            otherUser.profile?.profilePictureUrl ||
            otherUser.image ||
            `https://placehold.co/100x100/A78BFA/ffffff?text=${
              otherUser.name ? otherUser.name[0].toUpperCase() : "U"
            }`,
          headline: otherUser.profile?.headline || "No headline available",
          connectionStatus: "CONNECTED",
          requestId: conn.id,
        };
      });

    const receivedRequests = userConnections
      .filter((conn) => conn.status === "PENDING" && conn.receiverId === userId)
      .map((conn) => ({
        id: conn.sender.id,
        name: conn.sender.name,
        email: conn.sender.email,
        imageUrl:
          conn.sender.profile?.profilePictureUrl ||
          conn.sender.image ||
          `https://placehold.co/100x100/A78BFA/ffffff?text=${
            conn.sender.name ? conn.sender.name[0].toUpperCase() : "U"
          }`,
        headline: conn.sender.profile?.headline || "No headline available",
        connectionStatus: "RECEIVED_PENDING",
        requestId: conn.id,
      }));

    const sentRequests = userConnections
      .filter((conn) => conn.status === "PENDING" && conn.senderId === userId)
      .map((conn) => ({
        id: conn.receiver.id,
        name: conn.receiver.name,
        email: conn.receiver.email,
        imageUrl:
          conn.receiver.profile?.profilePictureUrl ||
          conn.receiver.image ||
          `https://placehold.co/100x100/A78BFA/ffffff?text=${
            conn.receiver.name ? conn.receiver.name[0].toUpperCase() : "U"
          }`,
        headline: conn.receiver.profile?.headline || "No headline available",
        connectionStatus: "SENT_PENDING",
        requestId: conn.id,
      }));

    return NextResponse.json(
      {
        users: formattedUsers,
        connections: {
          accepted: acceptedConnections,
          received: receivedRequests,
          sent: sentRequests,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error fetching connections:", error);

    // Fallback to mock data in case of error
    return NextResponse.json(
      {
        message: "Using fallback mock data (database connection error)",
        users: [
          // Mock data as fallback
          {
            id: "mock1",
            name: "John Developer",
            email: "john@example.com",
            imageUrl: "https://randomuser.me/api/portraits/men/41.jpg",
            headline: "Senior Developer",
            connectionStatus: "NOT_CONNECTED",
          },
          // ... other mock users
        ],
      },
      { status: 200 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      console.error("Unauthorized POST request to connections API.");
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { receiverId } = await request.json();
    const senderId = session.user.id;

    if (!receiverId) {
      return NextResponse.json(
        { message: "Receiver ID is required." },
        { status: 400 }
      );
    }

    if (senderId === receiverId) {
      return NextResponse.json(
        { message: "You cannot send a connection request to yourself." },
        { status: 400 }
      );
    }

    // Use a transaction to ensure both operations succeed or fail together
    const result = await prisma.$transaction(async (prisma) => {
      // Check if a connection request already exists between these users
      const existingConnection = await prisma.connectionRequest.findFirst({
        where: {
          OR: [
            { senderId, receiverId },
            { senderId: receiverId, receiverId: senderId },
          ],
        },
      });

      if (existingConnection) {
        if (existingConnection.status === "PENDING") {
          throw new Error(
            "A connection request already exists between these users."
          );
        } else if (existingConnection.status === "ACCEPTED") {
          throw new Error("You are already connected with this user.");
        } else if (existingConnection.status === "REJECTED") {
          // Update the rejected request to pending if the original receiver is now sending a request
          if (existingConnection.receiverId === senderId) {
            const updatedRequest = await prisma.connectionRequest.update({
              where: { id: existingConnection.id },
              data: { status: "PENDING", senderId, receiverId },
            });
            return { request: updatedRequest, isNew: false };
          } else {
            throw new Error(
              "Your previous connection request was rejected. Please wait for the user to send you a request."
            );
          }
        }
      }

      // Create a new connection request
      const connectionRequest = await prisma.connectionRequest.create({
        data: {
          senderId,
          receiverId,
          status: "PENDING",
        },
      });

      // Create a notification for the receiver
      const sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: { name: true },
      });

      const notification = await prisma.notification.create({
        data: {
          type: "CONNECTION_REQUEST",
          message: `${
            sender?.name || "Someone"
          } sent you a connection request.`,
          senderId,
          recipientId: receiverId,
          targetId: connectionRequest.id, // Store the connection request ID
          read: false,
        },
      });

      console.log("Created notification for connection request:", notification);

      return { request: connectionRequest, notification, isNew: true };
    });

    return NextResponse.json(
      {
        message: "Connection request sent successfully.",
        connectionRequest: result.request,
      },
      { status: result.isNew ? 201 : 200 }
    );
  } catch (error) {
    console.error("API Error creating connection request:", error);
    return NextResponse.json(
      {
        message: error.message || "Failed to send connection request.",
      },
      { status: 400 }
    );
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { requestId, action } = await request.json();
    const userId = session.user.id;

    if (!requestId || !["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { message: "Invalid request data." },
        { status: 400 }
      );
    }

    // Start a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Find the connection request and include sender/receiver for notifications
      const existingRequest = await tx.connectionRequest.findUnique({
        where: { id: requestId },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!existingRequest) {
        throw new Error("Connection request not found.");
      }

      if (existingRequest.receiverId !== userId) {
        throw new Error("You are not authorized to modify this request.");
      }

      if (existingRequest.status !== "PENDING") {
        throw new Error(
          `Request is already ${existingRequest.status.toLowerCase()}.`
        );
      }

      let updatedRequest;
      if (action === "accept") {
        updatedRequest = await tx.connectionRequest.update({
          where: { id: requestId },
          data: { status: "ACCEPTED" },
        });

        // Create a notification for the sender
        const notification = await tx.notification.create({
          data: {
            recipientId: existingRequest.senderId,
            senderId: userId,
            type: "CONNECTION_ACCEPTED",
            message: `${
              existingRequest.receiver.name || "Someone"
            } accepted your connection request!`,
            read: false,
            targetId: existingRequest.id,
          },
        });

        return { updatedRequest, notification };
      } else {
        updatedRequest = await tx.connectionRequest.update({
          where: { id: requestId },
          data: { status: "REJECTED" },
        });

        return { updatedRequest };
      }
    });

    return NextResponse.json(
      {
        message: `Connection request ${
          action === "accept" ? "accepted" : "rejected"
        }.`,
        status: action === "accept" ? "ACCEPTED" : "REJECTED",
        request: result.updatedRequest,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error managing connection request:", error);
    return NextResponse.json(
      {
        message: error.message || "Internal server error managing request.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
