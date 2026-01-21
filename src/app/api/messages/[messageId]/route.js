// src/app/api/messages/[messageId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/messages/[messageId] - Get a specific message
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { messageId } = await params;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        conversation: {
          include: {
            participants: {
              where: { leftAt: null },
            },
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        readReceipts: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
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

    if (!message) {
      return NextResponse.json(
        { message: "Message not found" },
        { status: 404 }
      );
    }

    // Verify user is a participant
    const isParticipant = message.conversation.participants.some(
      (p) => p.userId === userId
    );

    if (!isParticipant) {
      return NextResponse.json(
        { message: "You are not a participant of this conversation" },
        { status: 403 }
      );
    }

    // Group reactions
    const reactionGroups = {};
    message.reactions.forEach((r) => {
      if (!reactionGroups[r.emoji]) {
        reactionGroups[r.emoji] = [];
      }
      reactionGroups[r.emoji].push({
        userId: r.user.id,
        userName: r.user.name,
        userImage: r.user.image,
      });
    });

    return NextResponse.json({
      message: {
        ...message,
        reactions: reactionGroups,
        seenBy: message.readReceipts.map((r) => ({
          userId: r.user.id,
          userName: r.user.name,
          userImage: r.user.image,
          readAt: r.readAt,
        })),
      },
    });
  } catch (error) {
    console.error("API Error fetching message:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/messages/[messageId] - Edit a message
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { messageId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim() === "") {
      return NextResponse.json(
        { message: "Content is required" },
        { status: 400 }
      );
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json(
        { message: "Message not found" },
        { status: 404 }
      );
    }

    // Verify sender
    if (message.senderId !== userId) {
      return NextResponse.json(
        { message: "You can only edit your own messages" },
        { status: 403 }
      );
    }

    // Check 15-minute edit window
    const fifteenMinutes = 15 * 60 * 1000;
    if (Date.now() - new Date(message.createdAt).getTime() > fifteenMinutes) {
      return NextResponse.json(
        { message: "Edit window has expired (15 minutes)" },
        { status: 400 }
      );
    }

    // Can only edit text messages
    if (message.type !== "text") {
      return NextResponse.json(
        { message: "Only text messages can be edited" },
        { status: 400 }
      );
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        editedAt: new Date(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({ message: updatedMessage });
  } catch (error) {
    console.error("API Error editing message:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/messages/[messageId] - Delete a message
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { messageId } = await params;
    const { searchParams } = new URL(request.url);
    const forEveryone = searchParams.get("forEveryone") === "true";

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json(
        { message: "Message not found" },
        { status: 404 }
      );
    }

    // Verify sender for "delete for everyone"
    if (forEveryone && message.senderId !== userId) {
      return NextResponse.json(
        { message: "You can only delete your own messages for everyone" },
        { status: 403 }
      );
    }

    // Check 1-hour window for "delete for everyone"
    if (forEveryone) {
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - new Date(message.createdAt).getTime() > oneHour) {
        return NextResponse.json(
          { message: "Delete for everyone window has expired (1 hour)" },
          { status: 400 }
        );
      }
    }

    // Update message
    await prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedForAll: forEveryone,
        content: forEveryone ? "This message was deleted" : message.content,
      },
    });

    return NextResponse.json({
      message: "Message deleted successfully",
      deletedForAll: forEveryone,
    });
  } catch (error) {
    console.error("API Error deleting message:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}
