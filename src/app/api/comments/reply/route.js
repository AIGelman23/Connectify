import authOptions from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { postId, commentId, parentId, content } = await request.json();

    // Validate required fields
    if (!postId || !commentId || !content || content.trim() === "") {
      return NextResponse.json(
        {
          message: "Post ID, Comment ID, and non-empty content are required.",
        },
        { status: 400 }
      );
    }

    // Verify the comment exists and belongs to the post
    const comment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        postId: postId,
      },
    });

    if (!comment) {
      return NextResponse.json(
        { message: "Comment not found or doesn't belong to this post." },
        { status: 404 }
      );
    }

    // If parentId is provided, verify the parent reply exists and belongs to the same comment
    if (parentId) {
      const parentReply = await prisma.reply.findFirst({
        where: {
          id: parentId,
          commentId: commentId,
        },
      });

      if (!parentReply) {
        return NextResponse.json(
          {
            message:
              "Parent reply not found or doesn't belong to this comment.",
          },
          { status: 404 }
        );
      }

      // Check nesting depth to prevent infinite nesting
      let currentReply = parentReply;
      let depth = 1;
      const MAX_DEPTH = 3;

      while (currentReply.parentId && depth < MAX_DEPTH) {
        currentReply = await prisma.reply.findUnique({
          where: { id: currentReply.parentId },
        });
        depth++;
      }

      if (depth >= MAX_DEPTH) {
        return NextResponse.json(
          { message: "Maximum reply depth exceeded." },
          { status: 400 }
        );
      }
    }

    // Create the reply
    const replyData = {
      content: content.trim(),
      author: { connect: { id: session.user.id } },
      comment: { connect: { id: commentId } },
      ...(parentId ? { parent: { connect: { id: parentId } } } : {}),
    };

    const reply = await prisma.reply.create({
      data: replyData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Get all replies for this comment to return updated structure
    const allReplies = await prisma.reply.findMany({
      where: {
        commentId: commentId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Transform replies to match frontend format and create a nested structure
    const formattedReplies = createNestedRepliesStructure(allReplies);

    return NextResponse.json(
      {
        message: "Reply added successfully.",
        reply: formattedReplies.find((r) => r.id === reply.id),
        allReplies: formattedReplies, // Return all replies in a nested structure
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("API Error adding reply:", error);
    return NextResponse.json(
      { message: "Internal server error adding reply.", error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to create nested structure
function createNestedRepliesStructure(replies) {
  const replyMap = new Map();
  const topLevelReplies = [];

  replies.forEach((reply) => {
    const formattedReply = {
      id: reply.id,
      content: reply.content,
      createdAt: reply.createdAt,
      likes: 0, // Add likes field if needed
      parentId: reply.parentId,
      user: {
        id: reply.author.id,
        name: reply.author.name,
        imageUrl:
          reply.author.image ||
          `https://placehold.co/32x32/3B82F6/FFFFFF?text=${reply.author.name.charAt(
            0
          )}`,
      },
      replies: [],
    };

    replyMap.set(reply.id, formattedReply);

    if (reply.parentId && replyMap.has(reply.parentId)) {
      replyMap.get(reply.parentId).replies.push(formattedReply);
    } else {
      topLevelReplies.push(formattedReply);
    }
  });

  return topLevelReplies;
}

// Add GET method to fetch replies
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("commentId");

    if (!commentId) {
      return NextResponse.json(
        { message: "Comment ID is required." },
        { status: 400 }
      );
    }

    // Get all replies for the comment
    const replies = await prisma.reply.findMany({
      where: {
        commentId: commentId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Transform the replies to match frontend format and create nested structure
    const formattedReplies = createNestedRepliesStructure(replies);

    return NextResponse.json({ replies: formattedReplies }, { status: 200 });
  } catch (error) {
    console.error("API Error fetching replies:", error);
    return NextResponse.json(
      {
        message: "Internal server error fetching replies.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
