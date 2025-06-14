// src/app/api/connections/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    let usersToDisplay = [];

    // Build the where clause conditionally
    const whereClause = {
      id: {
        not: userId, // Exclude the current user
      },
    };

    // Add search conditions only if query exists (removed mode: "insensitive")
    if (query) {
      whereClause.OR = [
        { name: { contains: query } }, // Removed mode: "insensitive"
        { email: { contains: query } }, // Removed mode: "insensitive"
      ];
    }

    // Fetch all users except the current one based on query or suggestions
    const allUsers = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        profile: {
          select: {
            headline: true,
          },
        },
      },
      take: query ? 50 : 100, // Increased limit for suggestions/search results
    });

    // Fetch all connection requests related to the current user
    const userConnectionRequests = await prisma.connectionRequest.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        status: {
          in: ["PENDING", "ACCEPTED"], // Only interested in pending or accepted requests
        },
      },
      select: {
        // Select the request ID
        id: true,
        senderId: true,
        receiverId: true,
        status: true,
      },
    });

    // Process each user to determine their connection status relative to the current user
    usersToDisplay = allUsers.map((user) => {
      let connectionStatus = "NOT_CONNECTED";
      let requestId = null;

      // Check if current user SENT a request to 'user'
      const sentToUser = userConnectionRequests.find(
        (req) => req.senderId === userId && req.receiverId === user.id
      );
      if (sentToUser) {
        if (sentToUser.status === "PENDING") {
          connectionStatus = "SENT_PENDING";
          requestId = sentToUser.id;
        }
        if (sentToUser.status === "ACCEPTED") {
          connectionStatus = "CONNECTED";
          requestId = sentToUser.id; // Store ID of the accepted connection
        }
      }

      // Check if 'user' SENT a request to current user
      const receivedFromUser = userConnectionRequests.find(
        (req) => req.senderId === user.id && req.receiverId === userId
      );
      if (receivedFromUser) {
        if (
          receivedFromUser.status === "PENDING" &&
          connectionStatus === "NOT_CONNECTED"
        ) {
          connectionStatus = "RECEIVED_PENDING";
          requestId = receivedFromUser.id;
        }
        if (receivedFromUser.status === "ACCEPTED") {
          connectionStatus = "CONNECTED"; // CONNECTED always takes precedence
          requestId = receivedFromUser.id; // Store ID of the accepted connection
        }
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        imageUrl:
          user.image ||
          `https://placehold.co/100x100/A78BFA/ffffff?text=${
            user.name ? user.name[0].toUpperCase() : "U"
          }`,
        headline: user.profile?.headline || "No headline available",
        connectionStatus: connectionStatus,
        requestId: requestId, // Include the request ID if applicable
      };
    });
    // Extract accepted connections and suggestions from all users
    const acceptedFriends = usersToDisplay.filter(
      (user) => user.connectionStatus === "CONNECTED"
    );
    const suggestions = usersToDisplay.filter(
      (user) => user.connectionStatus === "NOT_CONNECTED"
    );

    return NextResponse.json(
      {
        users: usersToDisplay, // Optional: full list, if needed
        connections: acceptedFriends, // Actual connections
        suggestions, // Users not connected yet
        message:
          usersToDisplay.length > 0
            ? "Users found successfully"
            : "No users available",
        searchQuery: query,
        hasResults: usersToDisplay.length > 0,
        totalCount: usersToDisplay.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error fetching users for network:", error);
    return NextResponse.json(
      {
        message: "Internal server error fetching network data.",
        error: error.message,
      },
      { status: 500 }
    );
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

    if (!receiverId || senderId === receiverId) {
      console.error(
        "Invalid POST request data: receiverId missing or self-connection.",
        { senderId, receiverId }
      );
      return NextResponse.json(
        { message: "Invalid request data." },
        { status: 400 }
      );
    }

    // Check if a request already exists between these users (in any direction)
    const existingRequest = await prisma.connectionRequest.findFirst({
      where: {
        OR: [
          { senderId: senderId, receiverId: receiverId },
          { senderId: receiverId, receiverId: senderId }, // Check if the receiver has already sent a request to the sender
        ],
      },
    });

    if (existingRequest) {
      if (existingRequest.status === "PENDING") {
        if (existingRequest.receiverId === senderId) {
          // If the other user already sent a pending request to us, accept it
          // This path is now less likely to be hit by direct frontend "Connect" button,
          // as "Accept Request" button will call PUT.
          const acceptedRequest = await prisma.connectionRequest.update({
            where: { id: existingRequest.id },
            data: { status: "ACCEPTED" },
          });
          console.log(
            `Connection request accepted: ${existingRequest.id} by ${senderId}`
          );
          return NextResponse.json(
            {
              message: "Connection request accepted.",
              status: "ACCEPTED",
              request: acceptedRequest,
            },
            { status: 200 }
          );
        } else {
          // If we already sent a pending request to them
          console.log(
            `Connection request already sent from ${senderId} to ${receiverId}.`
          );
          return NextResponse.json(
            {
              message: "Connection request already sent.",
              status: "SENT_PENDING",
            },
            { status: 409 }
          );
        }
      } else if (existingRequest.status === "ACCEPTED") {
        console.log(
          `Users ${senderId} and ${receiverId} are already connected.`
        );
        return NextResponse.json(
          { message: "Already connected.", status: "CONNECTED" },
          { status: 409 }
        );
      } else if (existingRequest.status === "REJECTED") {
        // If it was rejected, allow sending a new request (or re-sending) by deleting old one
        await prisma.connectionRequest.delete({
          where: { id: existingRequest.id },
        });
        console.log(
          `Previous rejected request ${existingRequest.id} deleted. Allowing new request.`
        );
        // Fall through to create new request
      }
    }

    // Create a new pending connection request
    const newRequest = await prisma.connectionRequest.create({
      data: {
        senderId: senderId,
        receiverId: receiverId,
        status: "PENDING",
      },
    });
    console.log(
      `New connection request sent from ${senderId} to ${receiverId}: ${newRequest.id}`
    );

    // --- Create notification for receiver ---
    await prisma.notification.create({
      data: {
        recipientId: receiverId,
        type: "CONNECTION_REQUEST",
        message: "You have a new connection request.",
        senderId: senderId,
        targetId: newRequest.id,
        read: false,
      },
    });

    return NextResponse.json(
      {
        message: "Connection request sent.",
        status: "SENT_PENDING",
        request: newRequest,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("API Error sending connection request:", error);
    return NextResponse.json(
      {
        message: "Internal server error sending request.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      console.error("Unauthorized PUT request to connections API.");
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { requestId, action } = await request.json(); // 'action' can be 'accept' or 'reject'
    const userId = session.user.id;

    if (!requestId || !["accept", "reject"].includes(action)) {
      console.error(
        "Invalid PUT request data: requestId or action missing/invalid.",
        { requestId, action }
      );
      return NextResponse.json(
        { message: "Invalid request data." },
        { status: 400 }
      );
    }

    // Start a transaction to ensure atomicity for accept actions (update + create notification)
    const result = await prisma.$transaction(async (tx) => {
      // Find the connection request to ensure it exists and the current user is the receiver
      // MODIFIED: Include sender and receiver for notification creation
      const existingRequest = await tx.connectionRequest.findUnique({
        where: { id: requestId },
        include: {
          sender: true, // Corrected from 'initiator'
          receiver: true, // Include receiver to get their name for notification message
        },
      });

      if (!existingRequest) {
        console.error(`Connection request not found: ${requestId}`);
        throw new Error("Connection request not found."); // Throw to roll back transaction
      }

      if (existingRequest.receiverId !== userId) {
        console.error(
          `User ${userId} attempted to modify request ${requestId} but is not the receiver.`
        );
        throw new Error("You are not authorized to modify this request."); // Throw to roll back transaction
      }

      if (existingRequest.status !== "PENDING") {
        console.warn(
          `Attempt to ${action} non-pending request ${requestId}. Current status: ${existingRequest.status}`
        );
        throw new Error(
          `Request is already ${existingRequest.status.toLowerCase()}.`
        ); // Throw to roll back transaction
      }

      let updatedRequest;
      if (action === "accept") {
        updatedRequest = await tx.connectionRequest.update({
          where: { id: requestId },
          data: { status: "ACCEPTED" },
        });
        console.log(`Connection request ${requestId} accepted by ${userId}.`);

        // Create a notification for the initiator (the one who sent the request)
        const notification = await tx.notification.create({
          data: {
            recipientId: existingRequest.senderId, // The original sender of the request
            senderId: userId, // The user who accepted the request
            type: "CONNECTION_ACCEPTED",
            // MODIFIED: Use existingRequest.sender.name instead of existingRequest.receiver.name for the message
            message: `${
              existingRequest.receiver.name || "Someone"
            } accepted your connection request!`,
            read: false, // Initially unread
            targetId: existingRequest.id, // Reference to the connection request itself
          },
        });
        console.log(
          `Notification created for ${existingRequest.senderId}: ${notification.message}`
        );

        return { updatedRequest, notification }; // Return both for the transaction
      } else if (action === "reject") {
        updatedRequest = await tx.connectionRequest.update({
          where: { id: requestId },
          data: { status: "REJECTED" },
        });
        console.log(`Connection request ${requestId} rejected by ${userId}.`);
        return { updatedRequest }; // Only return updatedRequest for reject
      }
      return null; // Should not be reached
    });

    // Determine the response based on the action
    if (action === "accept") {
      return NextResponse.json(
        {
          message: "Connection request accepted.",
          status: "ACCEPTED",
          request: result.updatedRequest, // Access updatedRequest from the transaction result
        },
        { status: 200 }
      );
    } else {
      // action === "reject"
      return NextResponse.json(
        {
          message: "Connection request rejected.",
          status: "REJECTED",
          request: result.updatedRequest, // Access updatedRequest from the transaction result
        },
        { status: 200 }
      );
    }
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
