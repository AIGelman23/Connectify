// src/app/api/conversations/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/conversations - List all conversations for the current user
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

    // Get all conversations where user is a participant
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: userId,
            leftAt: null, // Only active participants
          },
        },
      },
      include: {
        participants: {
          where: {
            leftAt: null,
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
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: {
        lastMessageAt: "desc",
      },
    });

    // Get unread counts for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const participant = conv.participants.find((p) => p.userId === userId);
        const lastReadAt = participant?.lastReadAt || new Date(0);

        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            createdAt: { gt: lastReadAt },
            senderId: { not: userId },
            isDeleted: false,
          },
        });

        // Transform participants to include user data directly
        const transformedParticipants = conv.participants.map((p) => ({
          id: p.user.id,
          name: p.user.name,
          email: p.user.email,
          image: p.user.image,
          role: p.role,
          nickname: p.nickname,
        }));

        return {
          id: conv.id,
          name: conv.name,
          imageUrl: conv.imageUrl,
          isGroup: conv.isGroup,
          participants: transformedParticipants,
          lastMessage: conv.lastMessageContent,
          timestamp: conv.lastMessageAt || conv.updatedAt,
          unreadCount,
          messages: conv.messages,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
        };
      })
    );

    return NextResponse.json(
      { conversations: conversationsWithUnread },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error fetching conversations:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create a new conversation
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
    const { participantIds, name, imageUrl } = body;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json(
        { message: "participantIds array is required" },
        { status: 400 }
      );
    }

    // Ensure current user is included
    const allParticipantIds = [...new Set([userId, ...participantIds])];
    const isGroup = allParticipantIds.length > 2;

    // For 1-on-1 chats, check if conversation already exists
    if (!isGroup && allParticipantIds.length === 2) {
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: allParticipantIds.map((id) => ({
            participants: {
              some: {
                userId: id,
                leftAt: null,
              },
            },
          })),
        },
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
          messages: {
            take: 20,
            orderBy: { createdAt: "desc" },
            include: {
              sender: {
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

      if (existingConversation) {
        const transformedParticipants = existingConversation.participants.map((p) => ({
          id: p.user.id,
          name: p.user.name,
          email: p.user.email,
          image: p.user.image,
          role: p.role,
          nickname: p.nickname,
        }));

        return NextResponse.json({
          conversation: {
            ...existingConversation,
            participants: transformedParticipants,
            messages: existingConversation.messages.reverse(),
          },
          isExisting: true,
        });
      }
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        name: isGroup ? name : null,
        imageUrl: isGroup ? imageUrl : null,
        isGroup,
        participants: {
          create: allParticipantIds.map((id, index) => ({
            userId: id,
            role: id === userId ? "admin" : "member",
          })),
        },
      },
      include: {
        participants: {
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

    // Transform participants
    const transformedParticipants = conversation.participants.map((p) => ({
      id: p.user.id,
      name: p.user.name,
      email: p.user.email,
      image: p.user.image,
      role: p.role,
      nickname: p.nickname,
    }));

    return NextResponse.json(
      {
        conversation: {
          ...conversation,
          participants: transformedParticipants,
          messages: [],
        },
        isExisting: false,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("API Error creating conversation:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations - Delete multiple conversations
export async function DELETE(request) {
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
    const { conversationId } = body;

    const idsToDelete = Array.isArray(conversationId) ? conversationId : [conversationId];

    // For each conversation, mark the user as left rather than deleting
    await Promise.all(
      idsToDelete.map(async (id) => {
        await prisma.conversationParticipant.updateMany({
          where: {
            conversationId: id,
            userId: userId,
          },
          data: {
            leftAt: new Date(),
          },
        });
      })
    );

    return NextResponse.json(
      { message: "Conversations removed successfully", deleted: idsToDelete },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error deleting conversations:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}
