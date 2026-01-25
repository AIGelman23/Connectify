// src/app/api/stories/highlights/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/stories/highlights - Get user's highlights
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || session.user.id;

    const highlights = await prisma.storyHighlight.findMany({
      where: { userId },
      include: {
        stories: {
          select: {
            id: true,
            mediaUrl: true,
            mediaType: true,
            thumbnailUrl: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
          take: 1, // Just get first story for cover
        },
        _count: {
          select: { stories: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const formattedHighlights = highlights.map((h) => ({
      id: h.id,
      title: h.title,
      coverUrl: h.coverUrl || h.stories[0]?.thumbnailUrl || h.stories[0]?.mediaUrl,
      storyCount: h._count.stories,
      createdAt: h.createdAt,
      updatedAt: h.updatedAt,
    }));

    return NextResponse.json({ highlights: formattedHighlights });
  } catch (error) {
    console.error("Error fetching highlights:", error);
    return NextResponse.json(
      { error: "Failed to fetch highlights" },
      { status: 500 }
    );
  }
}

// POST /api/stories/highlights - Create a new highlight
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { title, coverUrl, storyIds } = await request.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Create highlight
    const highlight = await prisma.storyHighlight.create({
      data: {
        userId,
        title: title.trim(),
        coverUrl,
      },
    });

    // Add stories to highlight if provided
    if (storyIds && storyIds.length > 0) {
      await prisma.story.updateMany({
        where: {
          id: { in: storyIds },
          authorId: userId, // Ensure user owns the stories
        },
        data: {
          isHighlight: true,
          highlightId: highlight.id,
        },
      });
    }

    return NextResponse.json({ highlight }, { status: 201 });
  } catch (error) {
    console.error("Error creating highlight:", error);
    return NextResponse.json(
      { error: "Failed to create highlight" },
      { status: 500 }
    );
  }
}
