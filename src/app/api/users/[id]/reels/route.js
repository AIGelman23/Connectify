import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId } = params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "12", 10);

    // Fetch user's reels (posts where isReel is true)
    const reels = await prisma.post.findMany({
      where: {
        authorId: userId,
        isReel: true,
      },
      take: limit + 1, // Fetch one extra to check if there are more
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: [
        { isPinned: "desc" }, // Pinned reels first
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        content: true,
        videoUrl: true,
        thumbnailUrl: true,
        videoDuration: true,
        videoWidth: true,
        videoHeight: true,
        viewsCount: true,
        likesCount: true,
        commentsCount: true,
        isPinned: true,
        createdAt: true,
        sound: {
          select: {
            id: true,
            name: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Check if there are more results
    let hasMore = false;
    if (reels.length > limit) {
      hasMore = true;
      reels.pop(); // Remove the extra item
    }

    // Get the next cursor
    const nextCursor = hasMore ? reels[reels.length - 1]?.id : null;

    // Get total count for the user
    const totalCount = await prisma.post.count({
      where: {
        authorId: userId,
        isReel: true,
      },
    });

    return NextResponse.json({
      reels,
      nextCursor,
      hasMore,
      totalCount,
    });
  } catch (error) {
    console.error("Error fetching user reels:", error);
    return NextResponse.json(
      { error: "Failed to fetch reels" },
      { status: 500 }
    );
  }
}
