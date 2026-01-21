// src/app/api/messages/[messageId]/read/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/messages/[messageId]/read - Mark message as read
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

    // Get message
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

    // Verify participant
    const isParticipant = message.conversation.participants.some(
      (p) => p.userId === userId
    );

    if (!isParticipant) {
      return NextResponse.json(
        { message: "You are not a participant of this conversation" },
        { status: 403 }
      );
    }

    // Don't create read receipt for own messages
    if (message.senderId === userId) {
      return NextResponse.json(
        { message: "Cannot mark own message as read" },
        { status: 400 }
      );
    }

    // Create or update read receipt
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

    // Update participant's last read
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId: message.conversationId,
          userId,
        },
      },
      data: {
        lastReadAt: new Date(),
        lastReadMessageId: messageId,
      },
    });

    // Update message status to "seen" if sender's message
    await prisma.message.update({
      where: { id: messageId },
      data: { status: "seen" },
    });

    return NextResponse.json({
      readReceipt: {
        messageId,
        userId: readReceipt.user.id,
        userName: readReceipt.user.name,
        userImage: readReceipt.user.image,
        readAt: readReceipt.readAt,
      },
      conversationId: message.conversationId,
    });
  } catch (error) {
    console.error("API Error marking message as read:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}
