// src/app/api/reels/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";
import { extractHashtags } from "@/lib/hashtags";
import { SUBSCRIPTION_PLANS } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * Calculate engagement score for ranking
 * Higher scores = better ranking
 */
function calculateEngagementScore(reel, userInteractions = {}) {
  const hoursSincePosted = (Date.now() - new Date(reel.createdAt).getTime()) / (1000 * 60 * 60);
  const decayFactor = Math.exp(-hoursSincePosted / 72); // 72-hour half-life
  
  // Base engagement metrics
  const likes = reel._count?.likes || reel.likesCount || 0;
  const comments = reel._count?.comments || reel.commentsCount || 0;
  const views = reel.viewsCount || 0;
  const shares = reel.sharesCount || 0;
  
  // Calculate engagement rate (avoid division by zero)
  const engagementRate = views > 0 
    ? ((likes * 2 + comments * 3 + shares * 4) / views) 
    : (likes * 2 + comments * 3 + shares * 4) / 10;
  
  // Completion rate bonus (from VideoView data)
  const completionBonus = reel.avgCompletion ? reel.avgCompletion * 50 : 0;
  
  // Viral velocity (engagement per hour)
  const velocity = hoursSincePosted > 0 
    ? (likes + comments * 2 + shares * 3) / hoursSincePosted 
    : 0;
  
  // User affinity score (if user has interacted with this creator before)
  const affinityBonus = userInteractions[reel.authorId] ? 20 : 0;
  
  // Calculate final score
  const score = (
    (engagementRate * 100) +
    (velocity * 10) +
    completionBonus +
    affinityBonus
  ) * decayFactor;
  
  return score;
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      console.log(
        "GET /api/reels: Unauthorized. Session:",
        JSON.stringify(session, null, 2)
      );
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const take = parseInt(searchParams.get("take") || "10", 10);
    const skip = parseInt(searchParams.get("skip") || "0", 10);
    const startFromId = searchParams.get("startFrom");
    const feed = searchParams.get("feed") || "foryou"; // "foryou" or "following"

    let reels;

    if (feed === "following") {
      // Get reels from followed users only
      const following = await prisma.follows.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      const followingIds = following.map((f) => f.followingId);

      reels = await prisma.post.findMany({
        where: {
          isReel: true,
          videoUrl: { not: null },
          authorId: { in: followingIds },
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
              profile: {
                select: {
                  headline: true,
                  profilePictureUrl: true,
                },
              },
            },
          },
          likes: {
            where: { userId },
            select: { id: true, type: true },
          },
          savedBy: {
            where: { userId },
            select: { id: true },
          },
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
          sound: {
            select: {
              id: true,
              name: true,
              audioUrl: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: take + 1,
      });
    } else {
      // "For You" algorithm - engagement-based ranking
      
      // First, get user's interaction history for affinity scoring
      const userLikes = await prisma.postLike.findMany({
        where: { userId },
        select: { post: { select: { authorId: true } } },
        take: 100,
      });
      const userInteractions = {};
      userLikes.forEach((like) => {
        if (like.post?.authorId) {
          userInteractions[like.post.authorId] = (userInteractions[like.post.authorId] || 0) + 1;
        }
      });

      // Get reels with additional metrics for scoring
      const candidateReels = await prisma.post.findMany({
        where: {
          isReel: true,
          videoUrl: { not: null },
          // Don't show user's own reels in For You
          authorId: { not: userId },
          // Only public visibility
          visibility: "PUBLIC",
          // Recent reels (last 30 days) for freshness
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
              profile: {
                select: {
                  headline: true,
                  profilePictureUrl: true,
                },
              },
            },
          },
          likes: {
            where: { userId },
            select: { id: true, type: true },
          },
          savedBy: {
            where: { userId },
            select: { id: true },
          },
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
          sound: {
            select: {
              id: true,
              name: true,
              audioUrl: true,
            },
          },
          videoViews: {
            where: { completed: true },
            select: { id: true },
          },
        },
        take: 200, // Get more candidates for scoring
      });

      // Calculate engagement scores and sort
      const scoredReels = candidateReels.map((reel) => ({
        ...reel,
        engagementScore: calculateEngagementScore(reel, userInteractions),
      }));

      // Sort by engagement score (descending)
      scoredReels.sort((a, b) => b.engagementScore - a.engagementScore);

      // Add some randomization for variety (shuffle top reels slightly)
      const topReels = scoredReels.slice(0, Math.min(50, scoredReels.length));
      for (let i = topReels.length - 1; i > 0; i--) {
        // Only swap with nearby items (±3 positions) for slight randomization
        const j = Math.max(0, Math.min(topReels.length - 1, i - Math.floor(Math.random() * 4)));
        [topReels[i], topReels[j]] = [topReels[j], topReels[i]];
      }

      // Apply pagination
      reels = topReels.slice(skip, skip + take + 1);
    }

    const hasMore = reels.length > take;
    const reelsToReturn = hasMore ? reels.slice(0, take) : reels;

    // If startFromId is provided, reorder to put that reel first
    let orderedReels = reelsToReturn;
    if (startFromId) {
      const startIndex = reelsToReturn.findIndex((r) => r.id === startFromId);
      if (startIndex > 0) {
        const [startReel] = reelsToReturn.splice(startIndex, 1);
        orderedReels = [startReel, ...reelsToReturn];
      }
    }

    const formattedReels = orderedReels.map((reel) => ({
      id: reel.id,
      content: reel.content,
      videoUrl: reel.videoUrl,
      thumbnailUrl: reel.thumbnailUrl,
      videoDuration: reel.videoDuration,
      videoWidth: reel.videoWidth,
      videoHeight: reel.videoHeight,
      viewsCount: reel.viewsCount,
      likesCount: reel._count.likes,
      commentsCount: reel._count.comments,
      sharesCount: reel.sharesCount,
      createdAt: reel.createdAt,
      isLiked: reel.likes.length > 0,
      isSaved: reel.savedBy.length > 0,
      author: {
        id: reel.author.id,
        name: reel.author.name,
        imageUrl:
          reel.author.profile?.profilePictureUrl ||
          reel.author.image ||
          `https://placehold.co/40x40/A78BFA/ffffff?text=${
            reel.author.name ? reel.author.name[0].toUpperCase() : "U"
          }`,
        headline: reel.author.profile?.headline || "",
      },
      sound: reel.sound,
    }));

    return NextResponse.json(
      { reels: formattedReels, hasMore, feed },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error fetching reels:", error);
    return NextResponse.json(
      {
        message: "Internal server error fetching reels.",
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
      console.log(
        "POST /api/reels: Unauthorized. Session:",
        JSON.stringify(session, null, 2)
      );
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isBanned: true },
    });

    if (currentUser?.isBanned) {
      return NextResponse.json(
        { message: "You are banned from performing this action." },
        { status: 403 }
      );
    }

    // Check daily reel limit based on subscription plan
    const userWithSubscription = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        subscription: {
          select: {
            plan: true,
            status: true,
          },
        },
      },
    });

    // Determine user's plan (default to 'free' if no active subscription)
    const userPlan =
      userWithSubscription?.subscription?.status === "active"
        ? userWithSubscription.subscription.plan.toLowerCase()
        : "free";

    // Get daily limit from subscription plans config
    const dailyLimit = SUBSCRIPTION_PLANS[userPlan]?.limits?.reelsPerDay ?? 5;

    // Only check limit if not unlimited (-1)
    if (dailyLimit !== -1) {
      // Count reels created by user today (since midnight UTC)
      const startOfToday = new Date();
      startOfToday.setUTCHours(0, 0, 0, 0);

      const todayReelCount = await prisma.post.count({
        where: {
          authorId: session.user.id,
          isReel: true,
          createdAt: { gte: startOfToday },
        },
      });

      if (todayReelCount >= dailyLimit) {
        return NextResponse.json(
          {
            message: `You've reached your daily limit of ${dailyLimit} reels. Upgrade your plan for more!`,
            code: "DAILY_LIMIT_REACHED",
            limit: dailyLimit,
            used: todayReelCount,
            upgradeUrl: "/settings/subscription",
          },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const {
      content,
      videoUrl,
      thumbnailUrl,
      videoDuration,
      videoWidth,
      videoHeight,
      soundId,
      duetParentId,
      duetLayout,
      createOriginalSound, // New: flag to create original sound from this video
      originalSoundName, // New: custom name for original sound
    } = body;

    if (!videoUrl) {
      return NextResponse.json(
        { message: "Video URL is required for creating a reel." },
        { status: 400 }
      );
    }

    // Extract hashtags from content
    const hashtagNames = extractHashtags(content);

    // Create or get hashtags
    const hashtagRecords = await Promise.all(
      hashtagNames.map(async (name) => {
        return prisma.hashtag.upsert({
          where: { name },
          create: { name },
          update: { usageCount: { increment: 1 } },
        });
      })
    );

    // Handle original sound creation
    let finalSoundId = soundId || null;
    let createdSound = null;
    
    // If no sound selected and user wants to create original sound
    if (!soundId && createOriginalSound) {
      // Get the user's name for the default sound name
      const author = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true },
      });
      
      const soundName = originalSoundName || `Original sound - ${author?.name || 'User'}`;
      
      createdSound = await prisma.sound.create({
        data: {
          name: soundName,
          audioUrl: videoUrl, // Use video URL as audio source
          duration: videoDuration ? parseInt(videoDuration, 10) : 0,
          usageCount: 1, // This reel is using it
        },
      });
      
      finalSoundId = createdSound.id;
    }

    // Create the reel with hashtags
    const reel = await prisma.post.create({
      data: {
        authorId: session.user.id,
        content: content || "",
        videoUrl,
        thumbnailUrl,
        videoDuration: videoDuration ? parseInt(videoDuration, 10) : null,
        videoWidth: videoWidth ? parseInt(videoWidth, 10) : null,
        videoHeight: videoHeight ? parseInt(videoHeight, 10) : null,
        isReel: true,
        soundId: finalSoundId,
        duetParentId: duetParentId || null,
        duetLayout: duetLayout || null,
        type: "reel",
        hashtags: {
          create: hashtagRecords.map((hashtag) => ({
            hashtagId: hashtag.id,
          })),
        },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            profile: {
              select: {
                headline: true,
                profilePictureUrl: true,
              },
            },
          },
        },
        hashtags: {
          include: {
            hashtag: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        sound: {
          select: {
            id: true,
            name: true,
            audioUrl: true,
          },
        },
      },
    });

    // If this is a duet, increment usage count on parent
    if (duetParentId) {
      await prisma.post.update({
        where: { id: duetParentId },
        data: { sharesCount: { increment: 1 } },
      });
    }

    // If using a sound, increment usage count
    if (soundId) {
      await prisma.sound.update({
        where: { id: soundId },
        data: { usageCount: { increment: 1 } },
      });
    }

    const formattedReel = {
      id: reel.id,
      content: reel.content,
      videoUrl: reel.videoUrl,
      thumbnailUrl: reel.thumbnailUrl,
      videoDuration: reel.videoDuration,
      videoWidth: reel.videoWidth,
      videoHeight: reel.videoHeight,
      viewsCount: 0,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      createdAt: reel.createdAt,
      isLiked: false,
      isSaved: false,
      author: {
        id: reel.author.id,
        name: reel.author.name,
        imageUrl:
          reel.author.profile?.profilePictureUrl ||
          reel.author.image ||
          `https://placehold.co/40x40/A78BFA/ffffff?text=${
            reel.author.name ? reel.author.name[0].toUpperCase() : "U"
          }`,
        headline: reel.author.profile?.headline || "",
      },
      sound: reel.sound || createdSound,
      hashtags: reel.hashtags.map((h) => h.hashtag),
    };

    // Calculate remaining reels for the response
    let reelsRemaining = null;
    if (dailyLimit !== -1) {
      // Count again after creating the reel
      const startOfToday = new Date();
      startOfToday.setUTCHours(0, 0, 0, 0);
      const newTodayCount = await prisma.post.count({
        where: {
          authorId: session.user.id,
          isReel: true,
          createdAt: { gte: startOfToday },
        },
      });
      reelsRemaining = Math.max(0, dailyLimit - newTodayCount);
    }

    return NextResponse.json(
      {
        reel: formattedReel,
        limits: {
          daily: dailyLimit,
          remaining: reelsRemaining,
          unlimited: dailyLimit === -1,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating reel:", error);
    return NextResponse.json(
      { message: "Failed to create reel.", error: error.message },
      { status: 500 }
    );
  }
}
