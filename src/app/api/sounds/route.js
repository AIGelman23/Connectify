import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/sounds - Get sounds (trending or search)
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const type = searchParams.get("type") || "trending"; // trending, search, recent
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const cursor = searchParams.get("cursor");

    let sounds;
    let whereClause = {};

    // Apply search filter
    if (type === "search" && query) {
      whereClause = {
        name: {
          contains: query,
          mode: "insensitive",
        },
      };
    }

    // Determine order
    const orderBy =
      type === "recent"
        ? { createdAt: "desc" }
        : { usageCount: "desc" }; // trending = most used

    sounds = await prisma.sound.findMany({
      where: whereClause,
      orderBy,
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      select: {
        id: true,
        name: true,
        audioUrl: true,
        duration: true,
        usageCount: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
          },
        },
      },
    });

    // Check if there are more results
    let hasMore = false;
    if (sounds.length > limit) {
      hasMore = true;
      sounds.pop();
    }

    const nextCursor = hasMore ? sounds[sounds.length - 1]?.id : null;

    // Format sounds
    const formattedSounds = sounds.map((sound) => ({
      ...sound,
      reelsCount: sound._count.posts,
      _count: undefined,
    }));

    return NextResponse.json({
      sounds: formattedSounds,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Error fetching sounds:", error);
    return NextResponse.json(
      { error: "Failed to fetch sounds" },
      { status: 500 }
    );
  }
}

// POST /api/sounds - Create a new sound (from user upload)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, audioUrl, duration } = body;

    if (!name || !audioUrl) {
      return NextResponse.json(
        { error: "Name and audioUrl are required" },
        { status: 400 }
      );
    }

    const sound = await prisma.sound.create({
      data: {
        name,
        audioUrl,
        duration: duration || 0,
      },
    });

    return NextResponse.json({ sound }, { status: 201 });
  } catch (error) {
    console.error("Error creating sound:", error);
    return NextResponse.json(
      { error: "Failed to create sound" },
      { status: 500 }
    );
  }
}
