// src/app/api/messages/[messageId]/reactions/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// Allowed reaction emojis
const ALLOWED_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😠"];

// POST /api/messages/[messageId]/reactions - Add a reaction
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
    const { messageId } = await params;
    const body = await request.json();
    const { emoji } = body;

    if (!emoji || !ALLOWED_REACTIONS.includes(emoji)) {
      return NextResponse.json(
        { message: "Invalid emoji. Allowed: " + ALLOWED_REACTIONS.join(" ") },
        { status: 400 }
      );
    }

    // Get message and verify participant
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            participants: {
              where: { leftAt: null },
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

    const isParticipant = message.conversation.participants.some(
      (p) => p.userId === userId
    );

    if (!isParticipant) {
      return NextResponse.json(
        { message: "You are not a participant of this conversation" },
        { status: 403 }
      );
    }

    // Check if user already reacted with this emoji
    const existingReaction = await prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
    });

    if (existingReaction) {
      return NextResponse.json(
        { message: "You already reacted with this emoji" },
        { status: 409 }
      );
    }

    // Create reaction
    const reaction = await prisma.messageReaction.create({
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

    return NextResponse.json(
      {
        reaction: {
          id: reaction.id,
          emoji: reaction.emoji,
          user: reaction.user,
          createdAt: reaction.createdAt,
        },
        messageId,
        conversationId: message.conversationId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("API Error adding reaction:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/messages/[messageId]/reactions - Remove a reaction
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
    const emoji = searchParams.get("emoji");

    if (!emoji) {
      return NextResponse.json(
        { message: "emoji query parameter is required" },
        { status: 400 }
      );
    }

    // Get message for conversationId
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true },
    });

    if (!message) {
      return NextResponse.json(
        { message: "Message not found" },
        { status: 404 }
      );
    }

    // Delete reaction
    await prisma.messageReaction.delete({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
    });

    return NextResponse.json({
      message: "Reaction removed successfully",
      messageId,
      emoji,
      conversationId: message.conversationId,
    });
  } catch (error) {
    // If reaction doesn't exist
    if (error.code === "P2025") {
      return NextResponse.json(
        { message: "Reaction not found" },
        { status: 404 }
      );
    }

    console.error("API Error removing reaction:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}

// GET /api/messages/[messageId]/reactions - Get all reactions for a message
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { messageId } = await params;

    const reactions = await prisma.messageReaction.findMany({
      where: { messageId },
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

    // Group by emoji
    const grouped = {};
    reactions.forEach((r) => {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = [];
      }
      grouped[r.emoji].push({
        userId: r.user.id,
        userName: r.user.name,
        userImage: r.user.image,
        createdAt: r.createdAt,
      });
    });

    return NextResponse.json({ reactions: grouped, total: reactions.length });
  } catch (error) {
    console.error("API Error fetching reactions:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}
