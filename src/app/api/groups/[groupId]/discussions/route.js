import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// Get discussions for a group
export async function GET(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { groupId } = await context.params;
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") || "new";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // Check if user is a member
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!membership) {
      return NextResponse.json(
        { message: "You must be a member to view discussions." },
        { status: 403 }
      );
    }

    // Build orderBy based on sort
    let orderBy = { createdAt: "desc" }; // default: new
    if (sort === "top") {
      orderBy = { upvotes: "desc" };
    } else if (sort === "hot") {
      orderBy = { upvotes: "desc" }; // simplified hot = top for now
    }

    // Build where clause with optional search
    const whereClause = {
      groupId,
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { body: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const discussions = await prisma.groupDiscussion.findMany({
      where: whereClause,
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
        votes: {
          where: { userId },
          select: { voteType: true },
        },
        pollOptions: {
          include: {
            _count: {
              select: { votes: true },
            },
          },
        },
        pollVotes: {
          where: { userId },
          select: { optionId: true },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      discussions: discussions.map((d) => ({
        id: d.id,
        title: d.title,
        body: d.body,
        upvotes: d.upvotes,
        downvotes: d.downvotes,
        commentsCount: d.commentsCount,
        createdAt: d.createdAt,
        author: d.author,
        userVote: d.votes[0]?.voteType || null,
        // Media fields
        imageUrl: d.imageUrl,
        imageUrls: d.imageUrls || [],
        videoUrl: d.videoUrl,
        // Poll fields
        pollOptions: (d.pollOptions || []).map((opt) => ({
          id: opt.id,
          text: opt.text,
          count: opt._count?.votes || 0,
        })),
        userPollVote: d.pollVotes?.[0]?.optionId || null,
        expiresAt: d.expiresAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching discussions:", error);
    return NextResponse.json(
      { message: "Failed to fetch discussions.", error: error.message },
      { status: 500 }
    );
  }
}

// Create a new discussion
export async function POST(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { groupId } = await context.params;
    const userId = session.user.id;

    // Check if user is a member
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!membership) {
      return NextResponse.json(
        { message: "You must be a member to post discussions." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      body: discussionBody,
      imageUrl,
      imageUrls,
      videoUrl,
      pollOptions,
      pollDuration
    } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { message: "Title is required." },
        { status: 400 }
      );
    }

    // Calculate poll expiration if poll options provided
    const validPollOptions = Array.isArray(pollOptions)
      ? pollOptions.filter((o) => typeof o === "string" && o.trim().length > 0)
      : [];
    const expiresAt = validPollOptions.length > 0 && pollDuration
      ? new Date(Date.now() + pollDuration * 24 * 60 * 60 * 1000)
      : null;

    const discussion = await prisma.groupDiscussion.create({
      data: {
        groupId,
        authorId: userId,
        title: title.trim(),
        body: discussionBody?.trim() || null,
        imageUrl: imageUrl || null,
        imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
        videoUrl: videoUrl || null,
        expiresAt,
        pollOptions: validPollOptions.length > 0
          ? {
              create: validPollOptions.map((text) => ({ text })),
            }
          : undefined,
      },
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
        pollOptions: true,
      },
    });

    return NextResponse.json({
      discussion: {
        id: discussion.id,
        title: discussion.title,
        body: discussion.body,
        upvotes: discussion.upvotes,
        downvotes: discussion.downvotes,
        commentsCount: discussion.commentsCount,
        createdAt: discussion.createdAt,
        author: discussion.author,
        userVote: null,
        imageUrl: discussion.imageUrl,
        imageUrls: discussion.imageUrls || [],
        videoUrl: discussion.videoUrl,
        pollOptions: (discussion.pollOptions || []).map((opt) => ({
          id: opt.id,
          text: opt.text,
          count: 0,
        })),
        userPollVote: null,
        expiresAt: discussion.expiresAt,
      },
    });
  } catch (error) {
    console.error("Error creating discussion:", error);
    return NextResponse.json(
      { message: "Failed to create discussion.", error: error.message },
      { status: 500 }
    );
  }
}
