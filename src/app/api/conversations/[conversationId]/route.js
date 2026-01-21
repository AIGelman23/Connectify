// src/app/api/conversations/[conversationId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/conversations/[conversationId] - Get conversation details
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

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { message: "Conversation not found" },
        { status: 404 }
      );
    }

    // Transform participants
    const transformedParticipants = conversation.participants.map((p) => ({
      id: p.user.id,
      name: p.user.name,
      email: p.user.email,
      image: p.user.image,
      role: p.role,
      nickname: p.nickname,
      joinedAt: p.joinedAt,
    }));

    return NextResponse.json({
      conversation: {
        ...conversation,
        participants: transformedParticipants,
      },
    });
  } catch (error) {
    console.error("API Error fetching conversation:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/conversations/[conversationId] - Update conversation settings
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
    const { conversationId } = await params;
    const body = await request.json();
    const { name, imageUrl, nickname, isMuted, mutedUntil } = body;

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

    // Update conversation settings (name/image - admin only for groups)
    if (name !== undefined || imageUrl !== undefined) {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (conversation.isGroup && participant.role !== "admin") {
        return NextResponse.json(
          { message: "Only admins can update group settings" },
          { status: 403 }
        );
      }

      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          ...(name !== undefined && { name }),
          ...(imageUrl !== undefined && { imageUrl }),
        },
      });
    }

    // Update participant settings (nickname, mute)
    if (nickname !== undefined || isMuted !== undefined || mutedUntil !== undefined) {
      await prisma.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
        data: {
          ...(nickname !== undefined && { nickname }),
          ...(isMuted !== undefined && { isMuted }),
          ...(mutedUntil !== undefined && { mutedUntil }),
        },
      });
    }

    // Fetch updated conversation
    const updatedConversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    const transformedParticipants = updatedConversation.participants.map((p) => ({
      id: p.user.id,
      name: p.user.name,
      email: p.user.email,
      image: p.user.image,
      role: p.role,
      nickname: p.nickname,
    }));

    return NextResponse.json({
      conversation: {
        ...updatedConversation,
        participants: transformedParticipants,
      },
    });
  } catch (error) {
    console.error("API Error updating conversation:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/[conversationId] - Leave conversation
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
    const { conversationId } = await params;

    // Mark participant as left
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        leftAt: new Date(),
      },
    });

    return NextResponse.json(
      { message: "Left conversation successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error leaving conversation:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}
