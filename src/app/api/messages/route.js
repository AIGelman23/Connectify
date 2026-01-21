// src/app/api/messages/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/messages - Get messages (with optional conversationId filter)
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
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { message: "conversationId query parameter is required" },
        { status: 400 }
      );
    }

    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { message: "You are not a participant of this conversation" },
        { status: 403 }
      );
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        OR: [
          { isDeleted: false },
          { isDeleted: true, deletedForAll: false, senderId: userId },
        ],
      },
      orderBy: { createdAt: "asc" },
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
      },
    });

    // Transform messages with grouped reactions
    const transformedMessages = messages.map((msg) => {
      const reactionGroups = {};
      msg.reactions.forEach((r) => {
        if (!reactionGroups[r.emoji]) {
          reactionGroups[r.emoji] = [];
        }
        reactionGroups[r.emoji].push({
          userId: r.user.id,
          userName: r.user.name,
          userImage: r.user.image,
        });
      });

      return {
        ...msg,
        reactions: reactionGroups,
      };
    });

    return NextResponse.json({ messages: transformedMessages });
  } catch (error) {
    console.error("API Error fetching messages:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/messages - Send a message (legacy support)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    const {
      conversationId,
      content,
      type = "text",
      mediaUrls = [],
      fileName,
      fileSize,
      mimeType,
      duration,
      replyToId,
      id, // Optional client-generated ID for deduplication
    } = body;

    if (!conversationId) {
      return NextResponse.json(
        { message: "conversationId is required" },
        { status: 400 }
      );
    }

    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant || participant.leftAt) {
      return NextResponse.json(
        { message: "You are not a participant of this conversation" },
        { status: 403 }
      );
    }

    // Check for duplicate (if client ID provided)
    if (id) {
      const existing = await prisma.message.findUnique({
        where: { id },
      });
      if (existing) {
        return NextResponse.json({
          message: existing,
          isDuplicate: true,
        });
      }
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        ...(id && { id }), // Use client ID if provided
        conversationId,
        senderId: userId,
        content: content || "",
        type,
        mediaUrls,
        fileName,
        fileSize,
        mimeType,
        duration,
        replyToId,
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
      where: { id: conversationId },
      data: {
        lastMessageId: message.id,
        lastMessageContent: content?.substring(0, 100) || `[${type}]`,
        lastMessageAt: message.createdAt,
      },
    });

    // Update sender's last read
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        lastReadAt: new Date(),
        lastReadMessageId: message.id,
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("API Error sending message:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}
