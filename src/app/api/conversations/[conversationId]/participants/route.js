// src/app/api/conversations/[conversationId]/participants/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/conversations/[conversationId]/participants - Add participants
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
    const { userIds } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { message: "userIds array is required" },
        { status: 400 }
      );
    }

    // Verify requester is an admin participant
    const requesterParticipant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!requesterParticipant || requesterParticipant.leftAt) {
      return NextResponse.json(
        { message: "You are not a participant of this conversation" },
        { status: 403 }
      );
    }

    // Get conversation to check if it's a group
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation.isGroup && requesterParticipant.role !== "admin") {
      return NextResponse.json(
        { message: "Only admins can add participants to group chats" },
        { status: 403 }
      );
    }

    // Add participants
    const addedParticipants = await Promise.all(
      userIds.map(async (id) => {
        // Check if already a participant
        const existing = await prisma.conversationParticipant.findUnique({
          where: {
            conversationId_userId: {
              conversationId,
              userId: id,
            },
          },
        });

        if (existing) {
          // If they left, rejoin them
          if (existing.leftAt) {
            return prisma.conversationParticipant.update({
              where: {
                conversationId_userId: {
                  conversationId,
                  userId: id,
                },
              },
              data: {
                leftAt: null,
                joinedAt: new Date(),
              },
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
            });
          }
          return null; // Already active participant
        }

        // Create new participant
        return prisma.conversationParticipant.create({
          data: {
            conversationId,
            userId: id,
            role: "member",
          },
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
        });
      })
    );

    const added = addedParticipants.filter(Boolean);

    // If this was a 1-on-1 chat, convert to group
    if (!conversation.isGroup && added.length > 0) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { isGroup: true },
      });
    }

    // Create system message
    if (added.length > 0) {
      const addedNames = added.map((p) => p.user.name).join(", ");
      await prisma.message.create({
        data: {
          conversationId,
          senderId: userId,
          content: `added ${addedNames} to the group`,
          type: "system",
        },
      });
    }

    return NextResponse.json({
      message: "Participants added successfully",
      added: added.map((p) => ({
        id: p.user.id,
        name: p.user.name,
        email: p.user.email,
        image: p.user.image,
        role: p.role,
      })),
    });
  } catch (error) {
    console.error("API Error adding participants:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/[conversationId]/participants - Remove a participant
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
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) {
      return NextResponse.json(
        { message: "userId query parameter is required" },
        { status: 400 }
      );
    }

    // Verify requester is a participant
    const requesterParticipant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!requesterParticipant || requesterParticipant.leftAt) {
      return NextResponse.json(
        { message: "You are not a participant of this conversation" },
        { status: 403 }
      );
    }

    // Check permissions
    const isSelfRemoval = targetUserId === userId;
    const isAdmin = requesterParticipant.role === "admin";

    if (!isSelfRemoval && !isAdmin) {
      return NextResponse.json(
        { message: "Only admins can remove other participants" },
        { status: 403 }
      );
    }

    // Get target user info for system message
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { name: true },
    });

    // Mark participant as left
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: targetUserId,
        },
      },
      data: {
        leftAt: new Date(),
      },
    });

    // Create system message
    const systemContent = isSelfRemoval
      ? `left the group`
      : `removed ${targetUser?.name || "a user"} from the group`;

    await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: systemContent,
        type: "system",
      },
    });

    return NextResponse.json({
      message: "Participant removed successfully",
      removedUserId: targetUserId,
    });
  } catch (error) {
    console.error("API Error removing participant:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}
