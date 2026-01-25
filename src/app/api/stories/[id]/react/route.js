// src/app/api/stories/[id]/react/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/stories/[id]/react - React to a story
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: storyId } = await params;
    const userId = session.user.id;
    const { emoji } = await request.json();

    if (!emoji) {
      return NextResponse.json({ error: "Emoji is required" }, { status: 400 });
    }

    // Check if story exists and is not expired
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { expiresAt: true, authorId: true },
    });

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    if (new Date(story.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Story has expired" }, { status: 410 });
    }

    // Upsert reaction (update if exists, create if not)
    const reaction = await prisma.storyReaction.upsert({
      where: {
        storyId_userId: {
          storyId,
          userId,
        },
      },
      create: {
        storyId,
        userId,
        emoji,
      },
      update: {
        emoji,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create notification for story author (if not self)
    if (story.authorId !== userId) {
      await prisma.notification.create({
        data: {
          userId: story.authorId,
          senderId: userId,
          type: "STORY_REACTION",
          message: `reacted ${emoji} to your story`,
          referenceId: storyId,
          referenceType: "story",
        },
      });
    }

    return NextResponse.json({ reaction });
  } catch (error) {
    console.error("Error reacting to story:", error);
    return NextResponse.json(
      { error: "Failed to react to story" },
      { status: 500 }
    );
  }
}

// DELETE /api/stories/[id]/react - Remove reaction
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: storyId } = await params;
    const userId = session.user.id;

    await prisma.storyReaction.deleteMany({
      where: {
        storyId,
        userId,
      },
    });

    return NextResponse.json({ message: "Reaction removed" });
  } catch (error) {
    console.error("Error removing reaction:", error);
    return NextResponse.json(
      { error: "Failed to remove reaction" },
      { status: 500 }
    );
  }
}
