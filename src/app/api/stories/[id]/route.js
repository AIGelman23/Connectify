// src/app/api/stories/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/stories/[id] - Get a specific story with details
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    const story = await prisma.story.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            profile: { select: { profilePictureUrl: true } },
          },
        },
        music: {
          select: {
            id: true,
            name: true,
            audioUrl: true,
          },
        },
        views: story?.authorId === userId ? {
          include: {
            viewer: {
              select: {
                id: true,
                name: true,
                image: true,
                profile: { select: { profilePictureUrl: true } },
              },
            },
          },
          orderBy: { viewedAt: "desc" },
        } : false,
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: { views: true, reactions: true, replies: true },
        },
      },
    });

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    // Check if story is expired
    if (new Date(story.expiresAt) < new Date() && !story.isHighlight) {
      return NextResponse.json({ error: "Story has expired" }, { status: 410 });
    }

    // Record view if not own story and not already viewed
    if (story.authorId !== userId) {
      await prisma.storyView.upsert({
        where: {
          storyId_viewerId: {
            storyId: id,
            viewerId: userId,
          },
        },
        create: {
          storyId: id,
          viewerId: userId,
        },
        update: {}, // No update needed, just ensure it exists
      });

      // Increment view count
      await prisma.story.update({
        where: { id },
        data: { viewsCount: { increment: 1 } },
      });
    }

    // Get viewers list only for story owner
    let viewers = [];
    if (story.authorId === userId) {
      const storyViews = await prisma.storyView.findMany({
        where: { storyId: id },
        include: {
          viewer: {
            select: {
              id: true,
              name: true,
              image: true,
              profile: { select: { profilePictureUrl: true } },
            },
          },
        },
        orderBy: { viewedAt: "desc" },
        take: 50,
      });
      viewers = storyViews.map((v) => ({
        id: v.viewer.id,
        name: v.viewer.name,
        image: v.viewer.profile?.profilePictureUrl || v.viewer.image,
        viewedAt: v.viewedAt,
      }));
    }

    return NextResponse.json({
      story: {
        ...story,
        author: {
          id: story.author.id,
          name: story.author.name,
          image: story.author.profile?.profilePictureUrl || story.author.image,
        },
        isOwn: story.authorId === userId,
        viewers: story.authorId === userId ? viewers : undefined,
      },
    });
  } catch (error) {
    console.error("Error fetching story:", error);
    return NextResponse.json(
      { error: "Failed to fetch story" },
      { status: 500 }
    );
  }
}

// DELETE /api/stories/[id] - Delete own story
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    const story = await prisma.story.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    if (story.authorId !== userId) {
      return NextResponse.json(
        { error: "Not authorized to delete this story" },
        { status: 403 }
      );
    }

    await prisma.story.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Story deleted successfully" });
  } catch (error) {
    console.error("Error deleting story:", error);
    return NextResponse.json(
      { error: "Failed to delete story" },
      { status: 500 }
    );
  }
}

// PATCH /api/stories/[id] - Update story (add to highlight, etc.)
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;
    const body = await request.json();

    const story = await prisma.story.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    if (story.authorId !== userId) {
      return NextResponse.json(
        { error: "Not authorized to update this story" },
        { status: 403 }
      );
    }

    const { isHighlight, highlightId } = body;

    const updatedStory = await prisma.story.update({
      where: { id },
      data: {
        isHighlight: isHighlight ?? undefined,
        highlightId: highlightId ?? undefined,
      },
    });

    return NextResponse.json({ story: updatedStory });
  } catch (error) {
    console.error("Error updating story:", error);
    return NextResponse.json(
      { error: "Failed to update story" },
      { status: 500 }
    );
  }
}
