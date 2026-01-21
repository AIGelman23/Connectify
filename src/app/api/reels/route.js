// src/app/api/reels/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

    // Fetch reels (posts with isReel=true and videoUrl)
    const reels = await prisma.post.findMany({
      where: {
        isReel: true,
        videoUrl: { not: null },
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
      { reels: formattedReels, hasMore },
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
    } = body;

    if (!videoUrl) {
      return NextResponse.json(
        { message: "Video URL is required for creating a reel." },
        { status: 400 }
      );
    }

    // Create the reel
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
        soundId: soundId || null,
        duetParentId: duetParentId || null,
        duetLayout: duetLayout || null,
        type: "reel",
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
    };

    return NextResponse.json({ reel: formattedReel }, { status: 201 });
  } catch (error) {
    console.error("Error creating reel:", error);
    return NextResponse.json(
      { message: "Failed to create reel.", error: error.message },
      { status: 500 }
    );
  }
}
