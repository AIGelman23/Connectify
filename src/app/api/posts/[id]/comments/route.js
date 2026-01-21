// src/app/api/posts/[id]/comments/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Helper to recursively build nested replies
async function getNestedReplies(commentId, currentUserId = null) {
  const allReplies = await prisma.reply.findMany({
    where: { commentId },
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
      likes: currentUserId
        ? {
            where: { userId: currentUserId },
            select: { id: true },
          }
        : false,
      _count: {
        select: { likes: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Build a map of replies by id
  const replyMap = new Map();
  allReplies.forEach((reply) => {
    const likedByCurrentUser = currentUserId
      ? (reply.likes || []).length > 0
      : false;

    replyMap.set(reply.id, {
      id: reply.id,
      content: reply.content,
      createdAt: reply.createdAt,
      likesCount: reply._count?.likes || 0,
      likedByCurrentUser,
      parentId: reply.parentId,
      user: {
        id: reply.author.id,
        name: reply.author.name,
        imageUrl:
          reply.author.profile?.profilePictureUrl ||
          reply.author.image ||
          `https://placehold.co/32x32/A78BFA/ffffff?text=${
            reply.author.name ? reply.author.name[0].toUpperCase() : "U"
          }`,
      },
      replies: [],
    });
  });

  // Build the nested structure
  const topLevelReplies = [];
  replyMap.forEach((reply) => {
    if (reply.parentId && replyMap.has(reply.parentId)) {
      replyMap.get(reply.parentId).replies.push(reply);
    } else if (!reply.parentId) {
      topLevelReplies.push(reply);
    }
  });

  return topLevelReplies;
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
    const userId = session.user.id;

    // Verify the post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      return NextResponse.json(
        { message: "Post not found." },
        { status: 404 }
      );
    }

    // Fetch comments for this post
    const comments = await prisma.comment.findMany({
      where: { postId },
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
        likes: {
          where: { userId },
          select: { id: true },
        },
        _count: {
          select: {
            likes: true,
            replies: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Format comments and fetch nested replies
    const formattedComments = await Promise.all(
      comments.map(async (comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        likesCount: comment._count?.likes || 0,
        likedByCurrentUser: comment.likes.length > 0,
        user: {
          id: comment.author.id,
          name: comment.author.name,
          imageUrl:
            comment.author.profile?.profilePictureUrl ||
            comment.author.image ||
            `https://placehold.co/32x32/A78BFA/ffffff?text=${
              comment.author.name ? comment.author.name[0].toUpperCase() : "U"
            }`,
        },
        replies: await getNestedReplies(comment.id, userId),
      }))
    );

    return NextResponse.json(
      { comments: formattedComments },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { message: "Failed to fetch comments.", error: error.message },
      { status: 500 }
    );
  }
}
