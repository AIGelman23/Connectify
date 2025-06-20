// src/app/api/posts/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth"; // Import from next-auth directly
import authOptions from "@/lib/auth"; // Import as default export from lib/auth
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Utility function for timestamp formatting
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      console.log("Unauthorized POST request - no valid session found");
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log("DEBUG: Received post payload:", body);

    // Accept both imageUrl and fileUrl for GIFs
    let imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : null;
    const fileUrl = typeof body.fileUrl === "string" ? body.fileUrl : null;
    const videoUrl = typeof body.videoUrl === "string" ? body.videoUrl : null;
    const content = typeof body.content === "string" ? body.content : "";

    // --- DEBUG LOGGING ---
    console.log("DEBUG: imageUrl:", imageUrl);
    console.log("DEBUG: fileUrl:", fileUrl);
    console.log("DEBUG: videoUrl:", videoUrl);
    console.log("DEBUG: content:", content);

    // If fileUrl is present and imageUrl is not, use fileUrl as imageUrl (for Giphy GIFs)
    if (!imageUrl && fileUrl) {
      imageUrl = fileUrl;
      console.log("DEBUG: Using fileUrl as imageUrl:", imageUrl);
    }

    // --- DEBUG: Log what will be stored ---
    console.log(
      "DEBUG: Will store post with imageUrl:",
      imageUrl,
      "videoUrl:",
      videoUrl,
      "content:",
      content
    );

    // --- Tagging friends ---
    // Accept taggedFriends as an array of user IDs
    const taggedFriends = Array.isArray(body.taggedFriends)
      ? body.taggedFriends.filter(Boolean)
      : [];

    // Allow posts with either content, image, or video
    if (!content && !imageUrl && !videoUrl) {
      return NextResponse.json(
        { message: "Post content or media is required." },
        { status: 400 }
      );
    }

    // Defensive: Ensure prisma is defined and initialized
    if (!prisma || typeof prisma.post?.create !== "function") {
      throw new Error(
        "Prisma client is not initialized. Check your prisma import and setup."
      );
    }

    // Create the post first (without taggedFriends)
    const post = await prisma.post.create({
      data: {
        authorId: session.user.id,
        content,
        imageUrl,
        videoUrl,
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
        comments: {
          include: {
            author: true,
            replies: {
              include: { author: true },
            },
          },
        },
        // Remove taggedFriends from here, as they don't exist yet
      },
    });

    // If there are tagged friends, create TaggedFriend records and notifications
    if (taggedFriends.length > 0) {
      // Create transaction for both TaggedFriend records and notifications
      await prisma.$transaction(async (tx) => {
        // First create the TaggedFriend records
        const tagRecords = await Promise.all(
          taggedFriends.map((userId) =>
            tx.taggedFriend.create({
              data: {
                postId: post.id,
                userId,
              },
            })
          )
        );

        // Get author info for notification message
        const author = await tx.user.findUnique({
          where: { id: session.user.id },
          select: { name: true },
        });

        // Then create a notification for each tagged user
        await Promise.all(
          taggedFriends.map((userId) =>
            tx.notification.create({
              data: {
                type: "POST_TAG",
                recipientId: userId,
                senderId: session.user.id,
                targetId: post.id,
                message: `${author?.name || "Someone"} tagged you in a post.`,
                read: false,
              },
            })
          )
        );
      });
    }

    // Fetch the post again to include the taggedFriends relation
    const postWithTags = await prisma.post.findUnique({
      where: { id: post.id },
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
        comments: {
          include: {
            author: true,
            replies: {
              include: { author: true },
            },
          },
        },
        taggedFriends: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                profile: { select: { profilePictureUrl: true } },
              },
            },
          },
        },
      },
    });

    // Format tagged friends for frontend
    const formattedTaggedFriends = (postWithTags.taggedFriends || []).map(
      (tf) => ({
        id: tf.user.id,
        name: tf.user.name,
        imageUrl: tf.user.profile?.profilePictureUrl || tf.user.image || null,
      })
    );

    // Format the post object to match what your frontend expects
    const formattedPost = {
      ...postWithTags,
      author: {
        id: postWithTags.author.id,
        name: postWithTags.author.name,
        imageUrl:
          postWithTags.author.profile?.profilePictureUrl ||
          postWithTags.author.image ||
          `https://placehold.co/40x40/A78BFA/ffffff?text=${
            postWithTags.author.name
              ? postWithTags.author.name[0].toUpperCase()
              : "U"
          }`,
        profilePictureUrl:
          postWithTags.author.profile?.profilePictureUrl || null,
        headline:
          postWithTags.author.profile?.headline || "No headline available",
      },
      imageUrl: postWithTags.imageUrl,
      videoUrl: postWithTags.videoUrl,
      comments: postWithTags.comments.map((comment) => ({
        ...comment,
        user: {
          id: comment.author.id,
          name: comment.author.name,
          imageUrl:
            comment.author.image ||
            `https://placehold.co/32x32/A78BFA/ffffff?text=${
              comment.author.name ? comment.author.name[0].toUpperCase() : "U"
            }`,
        },
        timestamp: formatTimestamp(comment.createdAt),
        replies: (comment.replies || []).map((reply) => ({
          ...reply,
          user: {
            id: reply.author.id,
            name: reply.author.name,
            imageUrl:
              reply.author.image ||
              `https://placehold.co/24x24/A78BFA/ffffff?text=${
                reply.author.name ? reply.author.name[0].toUpperCase() : "U"
              }`,
          },
          timestamp: formatTimestamp(reply.createdAt),
        })),
      })),
      taggedFriends: formattedTaggedFriends,
    };

    return NextResponse.json({ post: formattedPost }, { status: 201 });
  } catch (error) {
    console.error("Error creating post:", error, error?.stack);
    return NextResponse.json(
      { message: "Failed to create post.", error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      console.log("Unauthorized request - no valid session found");
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Log the user for debugging
    console.log("Authenticated user:", session.user.id, session.user.email);

    const userId = session.user.id;

    // --- NEW: Pagination parameters ---
    const { searchParams } = new URL(request.url);
    const take = parseInt(searchParams.get("take") || "10", 10); // Number of posts to fetch
    const skip = parseInt(searchParams.get("skip") || "0", 10); // Number of posts to skip

    // 1. Find all accepted connections for the current user
    const connections = await prisma.connectionRequest.findMany({
      where: {
        OR: [
          { senderId: userId, status: "ACCEPTED" },
          { receiverId: userId, status: "ACCEPTED" },
        ],
      },
      select: {
        senderId: true,
        receiverId: true,
      },
    });

    // 2. Extract unique IDs of connected users
    const connectedUserIds = new Set();
    connections.forEach((conn) => {
      if (conn.senderId !== userId) {
        connectedUserIds.add(conn.senderId);
      }
      if (conn.receiverId !== userId) {
        connectedUserIds.add(conn.receiverId);
      }
    });

    const userIdsToFetchPostsFor = Array.from(connectedUserIds);
    userIdsToFetchPostsFor.push(userId); // Include current user's posts

    // 3. Fetch posts from these users with pagination
    const posts = await prisma.post.findMany({
      where: {
        authorId: { in: userIdsToFetchPostsFor },
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
              },
            },
          },
        },
        comments: {
          where: {
            parentCommentId: null, // Only fetch top-level comments directly
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            replies: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        // --- Add this to include tagged friends in GET ---
        taggedFriends: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                profile: { select: { profilePictureUrl: true } },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: skip, // Apply skip
      take: take + 1, // Fetch one extra to check if more exist
    });

    // Determine if there are more posts to load
    const hasMore = posts.length > take;
    const dataToReturn = hasMore ? posts.slice(0, take) : posts;

    const formattedPosts = dataToReturn.map((post) => {
      // Format tagged friends for frontend
      const formattedTaggedFriends = (post.taggedFriends || []).map((tf) => ({
        id: tf.user.id,
        name: tf.user.name,
        imageUrl: tf.user.profile?.profilePictureUrl || tf.user.image || null,
      }));

      return {
        ...post,
        author: {
          id: post.author.id,
          name: post.author.name,
          imageUrl:
            post.author.image ||
            `https://placehold.co/40x40/A78BFA/ffffff?text=${
              post.author.name ? post.author.name[0].toUpperCase() : "U"
            }`,
          headline: post.author.profile?.headline || "No headline available",
        },
        comments: post.comments.map((comment) => ({
          ...comment,
          user: {
            id: comment.author.id,
            name: comment.author.name,
            imageUrl:
              comment.author.image ||
              `https://placehold.co/32x32/A78BFA/ffffff?text=${
                comment.author.name ? comment.author.name[0].toUpperCase() : "U"
              }`,
          },
          timestamp: formatTimestamp(comment.createdAt),
          replies: (comment.replies || []).map((reply) => ({
            ...reply,
            user: {
              id: reply.author.id,
              name: reply.author.name,
              imageUrl:
                reply.author.image ||
                `https://placehold.co/24x24/A78BFA/ffffff?text=${
                  reply.author.name ? reply.author.name[0].toUpperCase() : "U"
                }`,
            },
            timestamp: formatTimestamp(reply.createdAt),
          })),
        })),
        taggedFriends: formattedTaggedFriends,
      };
    });

    return NextResponse.json(
      { posts: formattedPosts, hasMore: hasMore },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error fetching posts:", error);
    return NextResponse.json(
      {
        message: "Internal server error fetching posts.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      console.log("Unauthorized PATCH request - no valid session found");
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const requestBody = await request.json();
    const { postId, commentId, action, content } = requestBody;

    let commentContent;

    if (action === "comment") {
      commentContent = requestBody.comment;
    } else if (action === "reply_comment") {
      commentContent = requestBody.commentContent;
    }

    const userId = session.user.id;

    if (!action) {
      return NextResponse.json(
        { message: "Action is required." },
        { status: 400 }
      );
    }

    let updatedEntity;

    if (action === "edit") {
      // --- Edit post content ---
      if (!postId || typeof content !== "string" || !content.trim()) {
        return NextResponse.json(
          { message: "Post ID and new content are required for editing." },
          { status: 400 }
        );
      }
      // Only allow author to edit
      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (!post) {
        return NextResponse.json(
          { message: "Post not found." },
          { status: 404 }
        );
      }
      if (post.authorId !== userId) {
        return NextResponse.json(
          { message: "Not authorized to edit this post." },
          { status: 403 }
        );
      }
      await prisma.post.update({
        where: { id: postId },
        data: { content, updatedAt: new Date() },
      });
      return NextResponse.json(
        { message: "Post updated successfully." },
        { status: 200 }
      );
    } else if (action === "like") {
      if (!postId) {
        return NextResponse.json(
          { message: "Post ID is required for liking a post." },
          { status: 400 }
        );
      }
      updatedEntity = await prisma.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
        select: { likesCount: true },
      });
      return NextResponse.json(
        {
          message: "Post liked successfully.",
          likesCount: updatedEntity.likesCount,
        },
        { status: 200 }
      );
    } else if (action === "comment") {
      if (!postId || !commentContent || commentContent.trim() === "") {
        return NextResponse.json(
          {
            message: "Post ID and comment content are required for commenting.",
          },
          { status: 400 }
        );
      }

      // Create the comment
      const newComment = await prisma.comment.create({
        data: {
          content: commentContent,
          authorId: session.user.id,
          postId: postId,
        },
      });

      // Increment commentsCount
      updatedEntity = await prisma.post.update({
        where: { id: postId },
        data: { commentsCount: { increment: 1 } },
        select: { commentsCount: true, authorId: true },
      });

      // --- Notification logic ---
      // Notify the post author if the commenter is not the author
      if (updatedEntity.authorId && updatedEntity.authorId !== userId) {
        await prisma.notification.create({
          data: {
            recipientId: updatedEntity.authorId,
            type: "POST_COMMENT",
            message: `${
              session.user.name || "Someone"
            } commented on your post.`,
            senderId: userId,
            targetId: postId,
            read: false,
          },
        });
      }

      return NextResponse.json(
        {
          message: "Comment added successfully.",
          commentsCount: updatedEntity.commentsCount,
        },
        { status: 200 }
      );
    } else if (action === "like_comment") {
      if (!commentId) {
        return NextResponse.json(
          { message: "Comment ID is required for liking a comment." },
          { status: 400 }
        );
      }
      updatedEntity = await prisma.comment.update({
        where: { id: commentId },
        data: { likesCount: { increment: 1 } },
        select: { likesCount: true },
      });
      return NextResponse.json(
        {
          message: "Comment liked successfully.",
          likesCount: updatedEntity.likesCount,
        },
        { status: 200 }
      );
    } else if (action === "delete_comment") {
      if (!commentId || !postId) {
        return NextResponse.json(
          {
            message:
              "Comment ID and Post ID are required for deleting a comment.",
          },
          { status: 400 }
        );
      }

      const commentToDelete = await prisma.comment.findUnique({
        where: { id: commentId },
        include: { replies: true },
      });

      if (!commentToDelete) {
        return NextResponse.json(
          { message: "Comment not found." },
          { status: 404 }
        );
      }

      if (commentToDelete.authorId !== userId) {
        return NextResponse.json(
          { message: "You are not authorized to delete this comment." },
          { status: 403 }
        );
      }

      let commentsDeletedCount = 1;

      if (
        commentToDelete.parentCommentId === null &&
        commentToDelete.replies &&
        commentToDelete.replies.length > 0
      ) {
        commentsDeletedCount += commentToDelete.replies.length;
      }

      await prisma.comment.delete({
        where: { id: commentId },
      });

      await prisma.post.update({
        where: { id: commentToDelete.postId },
        data: { commentsCount: { decrement: commentsDeletedCount } },
      });

      return NextResponse.json(
        { message: "Comment deleted successfully." },
        { status: 200 }
      );
    } else if (action === "reply_comment") {
      if (
        !commentId ||
        !postId ||
        !commentContent ||
        commentContent.trim() === ""
      ) {
        return NextResponse.json(
          {
            message:
              "Parent comment ID, Post ID, and reply content are required.",
          },
          { status: 400 }
        );
      }

      const parentComment = await prisma.comment.findUnique({
        where: { id: commentId },
        select: { postId: true, authorId: true },
      });

      if (!parentComment || parentComment.postId !== postId) {
        return NextResponse.json(
          {
            message:
              "Parent comment not found or does not belong to this post.",
          },
          { status: 400 }
        );
      }

      const newReply = await prisma.comment.create({
        data: {
          content: commentContent,
          authorId: userId,
          postId: postId,
          parentCommentId: commentId,
        },
      });

      await prisma.post.update({
        where: { id: postId },
        data: { commentsCount: { increment: 1 } },
      });

      // --- Notification logic for replies ---
      // Notify the parent comment author if not self
      if (parentComment.authorId && parentComment.authorId !== userId) {
        await prisma.notification.create({
          data: {
            recipientId: parentComment.authorId,
            type: "POST_COMMENT",
            message: `${
              session.user.name || "Someone"
            } replied to your comment.`,
            senderId: userId,
            targetId: postId,
            read: false,
          },
        });
      }

      return NextResponse.json(
        { message: "Reply added successfully.", reply: newReply },
        { status: 201 }
      );
    } else {
      return NextResponse.json(
        { message: "Invalid action specified." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error(
      "API Error updating entity (like/comment/like_comment/delete_comment/reply_comment):",
      error
    );
    if (error.code === "P2025") {
      return NextResponse.json(
        { message: "Entity not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        message: "Internal server error updating entity.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
