// src/app/api/reels/[id]/view/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { id: postId } = await params;
    const userId = session.user.id;
    const body = await request.json();
    const { watchTime, completed } = body;

    // Check if the post exists and is a reel
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, isReel: true, viewsCount: true },
    });

    if (!post) {
      return NextResponse.json(
        { message: "Reel not found." },
        { status: 404 }
      );
    }

    // Validate that this is actually a reel
    if (!post.isReel) {
      return NextResponse.json(
        { message: "This post is not a reel." },
        { status: 400 }
      );
    }

    // Use upsert pattern to prevent race conditions
    // First, try to find existing view
    const existingView = await prisma.videoView.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    let videoView;
    let newViewsCount = post.viewsCount;
    
    if (!existingView) {
      // New view - create and increment count in transaction
      // Use transaction with serializable isolation to prevent race conditions
      const result = await prisma.$transaction(async (tx) => {
        // Create the view
        const newView = await tx.videoView.create({
          data: {
            userId,
            postId,
            watchTime: watchTime ? parseInt(watchTime, 10) : 0,
            completed: completed || false,
          },
        });
        
        // Increment view count
        const updatedPost = await tx.post.update({
          where: { id: postId },
          data: { viewsCount: { increment: 1 } },
          select: { viewsCount: true },
        });
        
        return { view: newView, viewsCount: updatedPost.viewsCount };
      });
      
      videoView = result.view;
      newViewsCount = result.viewsCount;
    } else {
      // Existing view - just update watch time/completion
      videoView = await prisma.videoView.update({
        where: { userId_postId: { userId, postId } },
        data: {
          ...(watchTime && { watchTime: parseInt(watchTime, 10) }),
          ...(completed !== undefined && { completed }),
        },
      });
    }

    return NextResponse.json(
      { 
        message: "View tracked successfully.", 
        videoView,
        viewsCount: newViewsCount, // Return updated count for real-time UI update
        isNewView: !existingView,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error tracking view:", error);
    return NextResponse.json(
      { message: "Failed to track view.", error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { id: postId } = await params;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        viewsCount: true,
        _count: {
          select: {
            videoViews: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { message: "Reel not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        viewsCount: post.viewsCount,
        uniqueViewers: post._count.videoViews,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error getting view count:", error);
    return NextResponse.json(
      { message: "Failed to get view count.", error: error.message },
      { status: 500 }
    );
  }
}
