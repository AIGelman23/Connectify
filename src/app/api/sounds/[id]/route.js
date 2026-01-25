import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/sounds/[id] - Get sound details with reels using it
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Get sound details
    const sound = await prisma.sound.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        audioUrl: true,
        duration: true,
        usageCount: true,
        createdAt: true,
      },
    });

    if (!sound) {
      return NextResponse.json({ error: "Sound not found" }, { status: 404 });
    }

    // Get reels using this sound
    const reels = await prisma.post.findMany({
      where: {
        soundId: id,
        isReel: true,
        visibility: "PUBLIC",
      },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        videoUrl: true,
        thumbnailUrl: true,
        videoDuration: true,
        viewsCount: true,
        likesCount: true,
        commentsCount: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        likes: {
          where: { userId: session.user.id },
          select: { id: true },
        },
      },
    });

    // Check if there are more results
    let hasMore = false;
    if (reels.length > limit) {
      hasMore = true;
      reels.pop();
    }

    const nextCursor = hasMore ? reels[reels.length - 1]?.id : null;

    // Format reels
    const formattedReels = reels.map((reel) => ({
      ...reel,
      isLiked: reel.likes.length > 0,
      likes: undefined,
    }));

    return NextResponse.json({
      sound,
      reels: formattedReels,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Error fetching sound:", error);
    return NextResponse.json(
      { error: "Failed to fetch sound" },
      { status: 500 }
    );
  }
}
