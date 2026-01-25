// src/app/api/reels/[id]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { id } = params;

    const reel = await prisma.post.findUnique({
      where: {
        id,
        isReel: true,
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
    });

    if (!reel) {
      return NextResponse.json(
        { message: "Reel not found" },
        { status: 404 }
      );
    }

    const formattedReel = {
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
      authorId: reel.authorId,
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
    };

    return NextResponse.json({ reel: formattedReel }, { status: 200 });
  } catch (error) {
    console.error("API Error fetching single reel:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
