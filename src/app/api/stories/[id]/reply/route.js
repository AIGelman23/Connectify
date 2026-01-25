// src/app/api/stories/[id]/reply/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/stories/[id]/reply - Reply to a story (sends as DM)
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: storyId } = await params;
    const userId = session.user.id;
    const { content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "Reply content is required" }, { status: 400 });
    }

    // Check if story exists and is not expired
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { 
        expiresAt: true, 
        authorId: true,
        mediaUrl: true,
        mediaType: true,
      },
    });

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    if (new Date(story.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Story has expired" }, { status: 410 });
    }

    // Create story reply record
    const reply = await prisma.storyReply.create({
      data: {
        storyId,
        userId,
        content: content.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            profile: { select: { profilePictureUrl: true } },
          },
        },
      },
    });

    // Find or create conversation with story author
    let conversation = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        participants: {
          every: {
            userId: { in: [userId, story.authorId] },
          },
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          isGroup: false,
          participants: {
            create: [
              { userId },
              { userId: story.authorId },
            ],
          },
        },
      });
    }

    // Create message as story reply
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        content: content.trim(),
        type: "STORY_REPLY",
        metadata: {
          storyId,
          storyMediaUrl: story.mediaUrl,
          storyMediaType: story.mediaType,
        },
      },
    });

    // Update conversation's last message
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { 
        updatedAt: new Date(),
        lastMessageAt: new Date(),
      },
    });

    // Create notification for story author
    if (story.authorId !== userId) {
      await prisma.notification.create({
        data: {
          userId: story.authorId,
          senderId: userId,
          type: "STORY_REPLY",
          message: `replied to your story`,
          referenceId: storyId,
          referenceType: "story",
        },
      });
    }

    return NextResponse.json({ 
      reply,
      message: "Reply sent as message",
      conversationId: conversation.id,
    });
  } catch (error) {
    console.error("Error replying to story:", error);
    return NextResponse.json(
      { error: "Failed to reply to story" },
      { status: 500 }
    );
  }
}

// GET /api/stories/[id]/reply - Get replies (only for story owner)
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: storyId } = await params;
    const userId = session.user.id;

    // Check if user owns the story
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { authorId: true },
    });

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    if (story.authorId !== userId) {
      return NextResponse.json(
        { error: "Not authorized to view replies" },
        { status: 403 }
      );
    }

    const replies = await prisma.storyReply.findMany({
      where: { storyId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            profile: { select: { profilePictureUrl: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ replies });
  } catch (error) {
    console.error("Error fetching replies:", error);
    return NextResponse.json(
      { error: "Failed to fetch replies" },
      { status: 500 }
    );
  }
}
