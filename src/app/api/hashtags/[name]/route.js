import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/hashtags/[name] - Get posts with this hashtag
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const type = searchParams.get("type") || "all"; // all, reels, posts

    // Find the hashtag
    const hashtag = await prisma.hashtag.findUnique({
      where: { name: name.toLowerCase() },
      select: {
        id: true,
        name: true,
        usageCount: true,
      },
    });

    if (!hashtag) {
      return NextResponse.json({ error: "Hashtag not found" }, { status: 404 });
    }

    // Build filter based on type
    const typeFilter = type === "reels" 
      ? { isReel: true } 
      : type === "posts" 
        ? { isReel: false } 
        : {};

    // Fetch posts with this hashtag
    const posts = await prisma.post.findMany({
      where: {
        hashtags: {
          some: {
            hashtagId: hashtag.id,
          },
        },
        ...typeFilter,
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
        imageUrl: true,
        imageUrls: true,
        videoUrl: true,
        thumbnailUrl: true,
        isReel: true,
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
        sound: {
          select: {
            id: true,
            name: true,
          },
        },
        likes: {
          where: { userId: session.user.id },
          select: { id: true },
        },
        savedBy: {
          where: { userId: session.user.id },
          select: { id: true },
        },
      },
    });

    // Check if there are more results
    let hasMore = false;
    if (posts.length > limit) {
      hasMore = true;
      posts.pop();
    }

    const nextCursor = hasMore ? posts[posts.length - 1]?.id : null;

    // Format posts with like/save status
    const formattedPosts = posts.map((post) => ({
      ...post,
      isLiked: post.likes.length > 0,
      isSaved: post.savedBy.length > 0,
      likes: undefined,
      savedBy: undefined,
    }));

    return NextResponse.json({
      hashtag,
      posts: formattedPosts,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Error fetching hashtag posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
