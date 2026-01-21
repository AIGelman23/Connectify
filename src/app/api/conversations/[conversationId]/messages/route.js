// src/app/api/conversations/[conversationId]/messages/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/conversations/[conversationId]/messages - Get paginated messages
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
    const { conversationId } = await params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "50");

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

    // Build query
    const whereClause = {
      conversationId,
      OR: [
        { isDeleted: false },
        { isDeleted: true, deletedForAll: false, senderId: userId },
      ],
    };

    // Get messages with cursor-based pagination
    const messages = await prisma.message.findMany({
      where: whereClause,
      take: limit + 1, // Get one extra to check if there are more
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: "desc" },
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
            senderId: true,
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
      },
    });

    // Check if there are more messages
    const hasMore = messages.length > limit;
    const messagesToReturn = hasMore ? messages.slice(0, -1) : messages;
    const nextCursor = hasMore ? messagesToReturn[messagesToReturn.length - 1]?.id : null;

    // Group reactions by emoji
    const transformedMessages = messagesToReturn.map((msg) => {
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
        seenBy: msg.readReceipts.map((r) => ({
          userId: r.user.id,
          userName: r.user.name,
          userImage: r.user.image,
          readAt: r.readAt,
        })),
      };
    });

    // Update last read
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        lastReadAt: new Date(),
        lastReadMessageId: messagesToReturn[0]?.id,
      },
    });

    return NextResponse.json({
      messages: transformedMessages.reverse(), // Return in chronological order
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("API Error fetching messages:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/conversations/[conversationId]/messages - Send a new message
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { conversationId } = await params;
    const body = await request.json();
    const {
      content,
      type = "text",
      mediaUrls = [],
      fileName,
      fileSize,
      mimeType,
      duration,
      replyToId,
    } = body;

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

    // Create message
    const message = await prisma.message.create({
      data: {
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
            senderId: true,
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
