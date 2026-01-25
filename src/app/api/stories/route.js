// src/app/api/stories/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/stories - Get stories feed (from followed users + own)
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "feed"; // feed, user, highlights
    const targetUserId = searchParams.get("userId");

    const now = new Date();

    if (type === "user" && targetUserId) {
      // Get stories from a specific user
      const stories = await prisma.story.findMany({
        where: {
          authorId: targetUserId,
          expiresAt: { gt: now },
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
              profile: {
                select: { profilePictureUrl: true },
              },
            },
          },
          views: {
            where: { viewerId: userId },
            select: { id: true },
          },
          _count: {
            select: { views: true, reactions: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      return NextResponse.json({ stories: formatStories(stories, userId) });
    }

    if (type === "highlights" && targetUserId) {
      // Get story highlights for a user
      const highlights = await prisma.storyHighlight.findMany({
        where: { userId: targetUserId },
        include: {
          stories: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  profile: { select: { profilePictureUrl: true } },
                },
              },
              _count: { select: { views: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      return NextResponse.json({ highlights });
    }

    // Default: Get feed stories (from followed users + own)
    // First get the list of users the current user follows
    const following = await prisma.follows.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);

    // Include own stories
    const userIds = [userId, ...followingIds];

    // Get users who have active stories
    const usersWithStories = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        stories: {
          some: {
            expiresAt: { gt: now },
          },
        },
      },
      include: {
        profile: {
          select: { profilePictureUrl: true },
        },
        stories: {
          where: {
            expiresAt: { gt: now },
          },
          include: {
            views: {
              where: { viewerId: userId },
              select: { id: true },
            },
            _count: {
              select: { views: true, reactions: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // Format response - group stories by user
    const storyGroups = usersWithStories.map((user) => {
      const hasUnviewed = user.stories.some((s) => s.views.length === 0);
      const latestStoryTime = user.stories.length > 0
        ? Math.max(...user.stories.map((s) => new Date(s.createdAt).getTime()))
        : 0;

      return {
        user: {
          id: user.id,
          name: user.name,
          image: user.profile?.profilePictureUrl || user.image,
          isCurrentUser: user.id === userId,
        },
        stories: user.stories.map((story) => ({
          id: story.id,
          mediaUrl: story.mediaUrl,
          mediaType: story.mediaType,
          thumbnailUrl: story.thumbnailUrl,
          duration: story.duration,
          caption: story.caption,
          createdAt: story.createdAt,
          expiresAt: story.expiresAt,
          viewsCount: story._count.views,
          reactionsCount: story._count.reactions,
          isViewed: story.views.length > 0,
        })),
        hasUnviewed,
        latestStoryTime,
        storyCount: user.stories.length,
      };
    });

    // Sort: current user first, then unviewed stories, then by latest story time
    storyGroups.sort((a, b) => {
      if (a.user.isCurrentUser) return -1;
      if (b.user.isCurrentUser) return 1;
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return b.latestStoryTime - a.latestStoryTime;
    });

    return NextResponse.json({ storyGroups });
  } catch (error) {
    console.error("Error fetching stories:", error);
    return NextResponse.json(
      { error: "Failed to fetch stories" },
      { status: 500 }
    );
  }
}

// POST /api/stories - Create a new story
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const {
      mediaUrl,
      mediaType = "image",
      thumbnailUrl,
      duration = mediaType === "image" ? 5000 : 15000,
      caption,
      location,
      musicId,
      filters,
      textOverlays,
      stickers,
      mentions,
      linkUrl,
    } = body;

    if (!mediaUrl) {
      return NextResponse.json(
        { error: "Media URL is required" },
        { status: 400 }
      );
    }

    // Calculate expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const story = await prisma.story.create({
      data: {
        authorId: userId,
        mediaUrl,
        mediaType,
        thumbnailUrl,
        duration,
        caption,
        location,
        musicId,
        filters,
        textOverlays,
        stickers,
        mentions,
        linkUrl,
        expiresAt,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            profile: { select: { profilePictureUrl: true } },
          },
        },
      },
    });

    // Update sound usage count if music is used
    if (musicId) {
      await prisma.sound.update({
        where: { id: musicId },
        data: { usageCount: { increment: 1 } },
      });
    }

    return NextResponse.json({ story }, { status: 201 });
  } catch (error) {
    console.error("Error creating story:", error);
    return NextResponse.json(
      { error: "Failed to create story" },
      { status: 500 }
    );
  }
}

// Helper function to format stories
function formatStories(stories, currentUserId) {
  return stories.map((story) => ({
    id: story.id,
    mediaUrl: story.mediaUrl,
    mediaType: story.mediaType,
    thumbnailUrl: story.thumbnailUrl,
    duration: story.duration,
    caption: story.caption,
    location: story.location,
    textOverlays: story.textOverlays,
    stickers: story.stickers,
    mentions: story.mentions,
    linkUrl: story.linkUrl,
    createdAt: story.createdAt,
    expiresAt: story.expiresAt,
    viewsCount: story._count?.views || 0,
    reactionsCount: story._count?.reactions || 0,
    isViewed: story.views?.length > 0,
    isOwn: story.authorId === currentUserId,
    author: {
      id: story.author.id,
      name: story.author.name,
      image: story.author.profile?.profilePictureUrl || story.author.image,
    },
  }));
}
