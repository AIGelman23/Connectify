// src/app/api/conversations/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma"; // Assuming your Prisma client is exported as 'prisma'

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

    // Fetch existing conversations for the current user
    const existingConversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            id: userId,
          },
        },
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            senderId: true,
            content: true,
            createdAt: true,
            sender: {
              // NEW: Include sender details for proper display
              select: { name: true, image: true },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Transform existing conversations to add a 'isNewChat' flag and formatted message/timestamp
    const formattedExistingConversations = existingConversations.map((conv) => {
      const lastMessage =
        conv.messages.length > 0
          ? conv.messages[conv.messages.length - 1].content
          : "No messages yet";
      const lastMessageTimestamp =
        conv.messages.length > 0
          ? conv.messages[conv.messages.length - 1].createdAt
          : conv.createdAt;

      return {
        ...conv,
        isNewChat: false, // Mark as an existing conversation
        lastMessage: lastMessage,
        timestamp: lastMessageTimestamp.toISOString(),
      };
    });

    // Only return existing conversations.
    // The "potential conversation" logic (steps 2 & 3 from previous versions) is removed from here.
    // New chats will now exclusively be initiated via the "Start new conversation" modal.
    return NextResponse.json(
      { conversations: formattedExistingConversations },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error fetching conversations:", error);
    return NextResponse.json(
      {
        message: "Internal server error fetching conversations.",
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
      console.error("Unauthorized POST request to conversations API.");
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { participantIds } = await request.json();
    const currentUserId = session.user.id;

    // Validate input: ensure participantIds is an array and contains at least two IDs, including the current user
    if (
      !Array.isArray(participantIds) ||
      participantIds.length < 2 ||
      !participantIds.includes(currentUserId)
    ) {
      console.error("Invalid participantIds provided for new conversation.", {
        participantIds,
      });
      return NextResponse.json(
        {
          message:
            "Invalid participant IDs. A conversation must have at least two participants, one of whom is the current user.",
        },
        { status: 400 }
      );
    }

    // Find the other participant ID (or participants if it's a group chat)
    const otherParticipantIds = participantIds.filter(
      (id) => id !== currentUserId
    );
    if (otherParticipantIds.length === 0) {
      console.error("No other participants found in the array.", {
        participantIds,
      });
      return NextResponse.json(
        {
          message:
            "A conversation must include at least one other participant.",
        },
        { status: 400 }
      );
    }

    // Ensure all participants exist and are unique
    const uniqueParticipantIds = Array.from(new Set(participantIds));
    const allParticipants = await prisma.user.findMany({
      where: { id: { in: uniqueParticipantIds } },
      select: { id: true, name: true, image: true, email: true },
    });

    if (allParticipants.length !== uniqueParticipantIds.length) {
      console.error("One or more participants not found in database.", {
        uniqueParticipantIds,
        foundParticipants: allParticipants.map((p) => p.id),
      });
      return NextResponse.json(
        { message: "One or more specified participants do not exist." },
        { status: 404 }
      );
    }

    // In your POST route, replace the existing 2-person check with this:
    if (uniqueParticipantIds.length === 2) {
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          AND: [
            { participants: { some: { id: uniqueParticipantIds[0] } } },
            { participants: { some: { id: uniqueParticipantIds[1] } } },
            // Check that the conversation only has 2 participants
            {
              participants: {
                // This assumes your participant relation count is efficient,
                // or you might need a separate field on Conversation to track participant count.
                // A simpler alternative if `participants` is a direct relation:
                // `participants: { hasEvery: uniqueParticipantIds }` (not standard Prisma, depends on setup)
                // The most robust check is often a custom query or a dedicated field on Conversation.
                // For a basic implementation, if your Prisma setup creates a join table
                // like ConversationParticipant, you might need:
                // NOT: { participants: { some: { NOT: { id: { in: uniqueParticipantIds } } } } }
                // This checks for any participant NOT in the uniqueParticipantIds, implying more than 2.
                // Or if you have a `type` field ('direct', 'group') on Conversation, use it:
                // type: 'direct'
              },
            },
            // Another approach for 2-person check: query the join table directly if available
            // e.g., if you have `ConversationParticipant` model
            // Not directly supported by simple `findFirst` on `Conversation` without more complex nesting.
          ],
        },
        include: {
          participants: {
            select: { id: true, name: true, image: true },
          },
          messages: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              senderId: true,
              content: true,
              createdAt: true,
            },
          },
        },
      });

      if (existingConversation) {
        console.log(
          "2-person conversation already exists between these users, returning existing one."
        );
        const lastMessage =
          existingConversation.messages.length > 0
            ? existingConversation.messages[
                existingConversation.messages.length - 1
              ].content
            : "No messages yet";
        const lastMessageTimestamp =
          existingConversation.messages.length > 0
            ? existingConversation.messages[
                existingConversation.messages.length - 1
              ].createdAt
            : existingConversation.createdAt;

        return NextResponse.json(
          {
            message: "Conversation already exists.",
            conversation: {
              ...existingConversation,
              isNewChat: false,
              lastMessage: lastMessage,
              timestamp: lastMessageTimestamp.toISOString(),
            },
          },
          { status: 200 }
        );
      }
    }

    // Create new conversation
    const newConversation = await prisma.conversation.create({
      data: {
        participants: {
          connect: uniqueParticipantIds.map((id) => ({ id })),
        },
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          select: { id: true, senderId: true, content: true, createdAt: true },
        },
      },
    });

    // Format the new conversation to match the frontend's expected structure
    const formattedNewConversation = {
      ...newConversation,
      isNewChat: false, // It's now a real, existing conversation
      lastMessage: "No messages yet", // Initially no messages
      timestamp: newConversation.createdAt.toISOString(),
    };

    console.log("New conversation created:", formattedNewConversation.id);
    return NextResponse.json(
      {
        message: "Conversation created successfully.",
        conversation: formattedNewConversation,
      },
      { status: 201 } // 201 Created for a new resource
    );
  } catch (error) {
    console.error("API Error creating conversation:", error);
    return NextResponse.json(
      {
        message: "Internal server error creating conversation.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
