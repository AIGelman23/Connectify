// src/app/api/posts/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth"; // Import from next-auth directly
import authOptions from "@/lib/auth"; // Import as default export from lib/auth
import prisma from "@/lib/prisma"; // Import Prisma client from lib/prisma

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

// Helper to recursively nest replies for a comment or reply
async function getNestedRepliesForReply(parentId) {
  // DEBUG: Log parentId to trace recursion
  // console.log("Fetching nested replies for parentId:", parentId);
  const replies = await prisma.reply.findMany({
    where: { parentId },
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
  });

  // DEBUG: Log found replies
  // console.log("Replies found for parentId", parentId, replies.map(r => r.id));

  return Promise.all(
    replies.map(async (reply) => ({
      id: reply.id,
      content: reply.content,
      createdAt: reply.createdAt,
      likes: 0,
      parentId: reply.parentId,
      user: {
        id: reply.author.id,
        name: reply.author.name,
        imageUrl:
          reply.author.image ||
          `https://placehold.co/32x32/3B82F6/FFFFFF?text=${
            reply.author.name ? reply.author.name[0].toUpperCase() : "U"
          }`,
      },
      replies: await getNestedRepliesForReply(reply.id), // Recursively fetch nested replies
    }))
  );
}

async function getNestedReplies(commentId, currentUserId = null) {
  // Fetch all replies for this comment, not just top-level
  const allReplies = await prisma.reply.findMany({
    where: { commentId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      likes: {
        take: 3,
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Build a map of replies by id
  const replyMap = new Map();
  allReplies.forEach((reply) => {
    const likerNames = (reply.likes || [])
      .map((like) => like.user.name)
      .filter(Boolean);
    const likedByCurrentUser = currentUserId
      ? (reply.likes || []).some((like) => like.userId === currentUserId)
      : false;

    replyMap.set(reply.id, {
      id: reply.id,
      content: reply.content,
      createdAt: reply.createdAt,
      likesCount: reply.likesCount || 0,
      likedByCurrentUser,
      likerNames,
      parentId: reply.parentId,
      user: {
        id: reply.author.id,
        name: reply.author.name,
        imageUrl:
          reply.author.image ||
          `https://placehold.co/32x32/3B82F6/FFFFFF?text=${
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
    console.log("DEBUG: Received post payload:", body);

    // Accept both imageUrl and fileUrl for GIFs
    let imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : null;
    const imageUrls = Array.isArray(body.imageUrls) ? body.imageUrls : [];
    const fileUrl = typeof body.fileUrl === "string" ? body.fileUrl : null;
    const videoUrl = typeof body.videoUrl === "string" ? body.videoUrl : null;
    const content = typeof body.content === "string" ? body.content : "";
    const originalPostId =
      typeof body.originalPostId === "string" ? body.originalPostId : null;
    const pollOptions = Array.isArray(body.pollOptions)
      ? body.pollOptions.filter(
          (o) => typeof o === "string" && o.trim().length > 0
        )
      : [];
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

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
    if (
      !content &&
      !imageUrl &&
      imageUrls.length === 0 &&
      !videoUrl &&
      !originalPostId &&
      pollOptions.length === 0
    ) {
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
        imageUrls,
        videoUrl,
        expiresAt,
        originalPostId,
        pollOptions:
          pollOptions.length > 0
            ? {
                create: pollOptions.map((text) => ({ text })),
              }
            : undefined,
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
          where: {
            parentCommentId: null, // Only top-level comments
          },
          include: {
            author: true,
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
          where: {
            parentCommentId: null, // Only top-level comments
          },
          include: {
            author: true,
            // Note: replies are fetched via getNestedReplies() using the Reply model
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
        pollOptions: true,
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
      imageUrls: postWithTags.imageUrls || [],
      videoUrl: postWithTags.videoUrl,
      comments: await Promise.all(
        postWithTags.comments.map(async (comment) => ({
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
          replies: await getNestedReplies(comment.id), // <-- always use this!
        }))
      ),
      taggedFriends: formattedTaggedFriends,
      pollOptions: (postWithTags.pollOptions || []).map((opt) => ({
        id: opt.id,
        text: opt.text,
        count: 0,
      })),
      expiresAt: postWithTags.expiresAt,
      originalPost: null,
      userVote: null,
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
    const targetUserId = searchParams.get("userId");
    const type = searchParams.get("type");

    let where = {};
    let orderBy = [{ isPinned: "desc" }, { createdAt: "desc" }];

    if (targetUserId) {
      // If userId is provided, fetch posts only for that user
      where.authorId = targetUserId;
    } else {
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
      where.authorId = { in: userIdsToFetchPostsFor };
    }

    if (type === "poll") {
      where.pollOptions = { some: {} };
    } else if (type === "photos") {
      where.imageUrl = { not: null };
    } else if (type === "videos") {
      where.videoUrl = { not: null };
    } else if (type === "saved") {
      where.savedBy = { some: { userId: targetUserId || userId } };
    } else if (type === "trending") {
      orderBy = [{ likesCount: "desc" }, { commentsCount: "desc" }];
    }

    // 3. Fetch posts from these users with pagination
    const posts = await prisma.post.findMany({
      where,
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
            likes: {
              take: 3,
              include: {
                user: {
                  select: { id: true, name: true },
                },
              },
              orderBy: { createdAt: "desc" },
            },
            // Note: replies are fetched via getNestedReplies() using the Reply model
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
        // Fetch latest 3 reactions for summary
        likes: {
          take: 3,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true } },
          },
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
        savedBy: {
          where: { userId },
          select: { id: true },
        },
        originalPost: {
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
        },
      },
      orderBy: orderBy,
      skip: skip, // Apply skip
      take: take + 1, // Fetch one extra to check if more exist
    });

    // Determine if there are more posts to load
    const hasMore = posts.length > take;
    const dataToReturn = hasMore ? posts.slice(0, take) : posts;

    // Fetch current user's reactions for these posts separately
    const postIds = dataToReturn.map((p) => p.id);
    let myReactionsMap = new Map();
    if (userId && postIds.length > 0) {
      const myReactions = await prisma.postLike.findMany({
        where: {
          userId: userId,
          postId: { in: postIds },
        },
        select: { postId: true, type: true },
      });
      myReactions.forEach((r) => myReactionsMap.set(r.postId, r.type));
    }

    const formattedPosts = await Promise.all(
      dataToReturn.map(async (post) => {
        // Format tagged friends for frontend
        const formattedTaggedFriends = (post.taggedFriends || []).map((tf) => ({
          id: tf.user.id,
          name: tf.user.name,
          imageUrl: tf.user.profile?.profilePictureUrl || tf.user.image || null,
        }));

        const comments = await Promise.all(
          post.comments.map(async (comment) => {
            const replies = await getNestedReplies(comment.id, userId);
            const likerNames = (comment.likes || [])
              .map((like) => like.user.name)
              .filter(Boolean);
            const likedByCurrentUser = (comment.likes || []).some(
              (like) => like.userId === userId
            );
            return {
              ...comment,
              likesCount: comment.likesCount || 0,
              likedByCurrentUser,
              likerNames,
              user: {
                id: comment.author.id,
                name: comment.author.name,
                imageUrl:
                  comment.author.image ||
                  `https://placehold.co/32x32/A78BFA/ffffff?text=${
                    comment.author.name
                      ? comment.author.name[0].toUpperCase()
                      : "U"
                  }`,
              },
              timestamp: formatTimestamp(comment.createdAt),
              replies,
            };
          })
        );

        // DEBUG: Log the full comments structure for this post
        // console.log("Post", post.id, "comments with nested replies:", JSON.stringify(comments, null, 2));

        return {
          ...post,
          currentUserReaction: myReactionsMap.get(post.id) || null,
          latestReactions: (post.likes || []).map((l) => ({
            id: l.id,
            type: l.type,
            user: l.user,
          })),
          author: {
            id: post.author?.id,
            name: post.author?.name,
            imageUrl:
              post.author?.image ||
              `https://placehold.co/40x40/A78BFA/ffffff?text=${
                post.author?.name ? post.author.name[0].toUpperCase() : "U"
              }`,
            headline: post.author?.profile?.headline || "No headline available",
          },
          comments,
          taggedFriends: formattedTaggedFriends,
          pollOptions: (post.pollOptions || []).map((opt) => ({
            id: opt.id,
            text: opt.text,
            count: opt._count?.votes || 0,
          })),
          expiresAt: post.expiresAt,
          userVote: post.pollVotes?.[0]?.optionId || null,
          originalPost: post.originalPost
            ? {
                ...post.originalPost,
                author: {
                  id: post.originalPost.author?.id,
                  name: post.originalPost.author?.name,
                  imageUrl:
                    post.originalPost.author?.profile?.profilePictureUrl ||
                    post.originalPost.author?.image ||
                    null,
                },
              }
            : null,
          isSaved: post.savedBy && post.savedBy.length > 0,
        };
      })
    );

    // DEBUG: Log the final posts structure
    // console.log("Formatted posts with nested replies:", JSON.stringify(formattedPosts, null, 2));

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

    const requestBody = await request.json();
    const { postId, commentId, action, content, parentId, optionId } =
      requestBody;

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
    } else if (action === "react") {
      const reactionType = requestBody.reactionType || "LIKE";
      if (!postId) {
        return NextResponse.json(
          { message: "Post ID is required for reacting to a post." },
          { status: 400 }
        );
      }

      // Check if user already reacted to this post
      const existingReaction = await prisma.postLike.findUnique({
        where: {
          userId_postId: { userId, postId },
        },
      });

      if (existingReaction) {
        // If reaction type is different, update it
        if (existingReaction.type !== reactionType) {
          await prisma.postLike.update({
            where: { id: existingReaction.id },
            data: { type: reactionType },
          });
        }

        const post = await prisma.post.findUnique({
          where: { id: postId },
          select: { likesCount: true },
        });
        return NextResponse.json(
          { message: "Reaction updated.", likesCount: post.likesCount },
          { status: 200 }
        );
      }

      // Create reaction record and increment count
      await prisma.$transaction([
        prisma.postLike.create({
          data: { userId, postId, type: reactionType },
        }),
        prisma.post.update({
          where: { id: postId },
          data: { likesCount: { increment: 1 } },
        }),
      ]);

      const updated = await prisma.post.findUnique({
        where: { id: postId },
        select: { likesCount: true },
      });

      return NextResponse.json(
        {
          message: "Post reacted successfully.",
          likesCount: updated.likesCount,
        },
        { status: 200 }
      );
    } else if (action === "unreact") {
      if (!postId) {
        return NextResponse.json(
          { message: "Post ID is required for removing reaction." },
          { status: 400 }
        );
      }

      // Check if user has reacted
      const existingReaction = await prisma.postLike.findUnique({
        where: {
          userId_postId: { userId, postId },
        },
      });

      if (!existingReaction) {
        const post = await prisma.post.findUnique({
          where: { id: postId },
          select: { likesCount: true },
        });
        return NextResponse.json(
          { message: "Not reacted.", likesCount: post?.likesCount || 0 },
          { status: 200 }
        );
      }

      // Delete reaction record and decrement count
      await prisma.$transaction([
        prisma.postLike.delete({
          where: { userId_postId: { userId, postId } },
        }),
        prisma.post.update({
          where: { id: postId },
          data: { likesCount: { decrement: 1 } },
        }),
      ]);

      const updated = await prisma.post.findUnique({
        where: { id: postId },
        select: { likesCount: true },
      });

      return NextResponse.json(
        {
          message: "Reaction removed successfully.",
          likesCount: Math.max(0, updated.likesCount),
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

      // Try to find as Comment first
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
      });

      if (comment) {
        // Check if user already liked this comment
        const existingLike = await prisma.commentLike.findUnique({
          where: {
            userId_commentId: { userId, commentId },
          },
        });

        if (existingLike) {
          return NextResponse.json(
            { message: "Already liked.", likesCount: comment.likesCount },
            { status: 200 }
          );
        }

        // Create like record and increment count
        await prisma.$transaction([
          prisma.commentLike.create({
            data: { userId, commentId },
          }),
          prisma.comment.update({
            where: { id: commentId },
            data: { likesCount: { increment: 1 } },
          }),
        ]);

        const updated = await prisma.comment.findUnique({
          where: { id: commentId },
          select: { likesCount: true },
        });

        return NextResponse.json(
          {
            message: "Comment liked successfully.",
            likesCount: updated.likesCount,
          },
          { status: 200 }
        );
      }

      // If not a Comment, try as a Reply
      const reply = await prisma.reply.findUnique({
        where: { id: commentId },
      });

      if (!reply) {
        return NextResponse.json(
          { message: "Comment or reply not found." },
          { status: 404 }
        );
      }

      // Check if user already liked this reply
      const existingReplyLike = await prisma.replyLike.findUnique({
        where: {
          userId_replyId: { userId, replyId: commentId },
        },
      });

      if (existingReplyLike) {
        return NextResponse.json(
          { message: "Already liked.", likesCount: reply.likesCount },
          { status: 200 }
        );
      }

      // Create like record and increment count
      await prisma.$transaction([
        prisma.replyLike.create({
          data: { userId, replyId: commentId },
        }),
        prisma.reply.update({
          where: { id: commentId },
          data: { likesCount: { increment: 1 } },
        }),
      ]);

      const updatedReply = await prisma.reply.findUnique({
        where: { id: commentId },
        select: { likesCount: true },
      });

      return NextResponse.json(
        {
          message: "Reply liked successfully.",
          likesCount: updatedReply.likesCount,
        },
        { status: 200 }
      );
    } else if (action === "unlike_comment") {
      if (!commentId) {
        return NextResponse.json(
          { message: "Comment ID is required for unliking." },
          { status: 400 }
        );
      }

      // Try to find as Comment first
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
      });

      if (comment) {
        // Delete the like record if it exists
        const existingLike = await prisma.commentLike.findUnique({
          where: {
            userId_commentId: { userId, commentId },
          },
        });

        if (!existingLike) {
          return NextResponse.json(
            { message: "Not liked.", likesCount: comment.likesCount },
            { status: 200 }
          );
        }

        await prisma.$transaction([
          prisma.commentLike.delete({
            where: { userId_commentId: { userId, commentId } },
          }),
          prisma.comment.update({
            where: { id: commentId },
            data: { likesCount: { decrement: 1 } },
          }),
        ]);

        const updated = await prisma.comment.findUnique({
          where: { id: commentId },
          select: { likesCount: true },
        });

        return NextResponse.json(
          {
            message: "Comment unliked successfully.",
            likesCount: Math.max(0, updated.likesCount),
          },
          { status: 200 }
        );
      }

      // If not a Comment, try as a Reply
      const reply = await prisma.reply.findUnique({
        where: { id: commentId },
      });

      if (!reply) {
        return NextResponse.json(
          { message: "Comment or reply not found." },
          { status: 404 }
        );
      }

      // Delete the like record if it exists
      const existingReplyLike = await prisma.replyLike.findUnique({
        where: {
          userId_replyId: { userId, replyId: commentId },
        },
      });

      if (!existingReplyLike) {
        return NextResponse.json(
          { message: "Not liked.", likesCount: reply.likesCount },
          { status: 200 }
        );
      }

      await prisma.$transaction([
        prisma.replyLike.delete({
          where: { userId_replyId: { userId, replyId: commentId } },
        }),
        prisma.reply.update({
          where: { id: commentId },
          data: { likesCount: { decrement: 1 } },
        }),
      ]);

      const updatedReply = await prisma.reply.findUnique({
        where: { id: commentId },
        select: { likesCount: true },
      });

      return NextResponse.json(
        {
          message: "Reply unliked successfully.",
          likesCount: Math.max(0, updatedReply.likesCount),
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

      // First try to find as a Comment
      const commentToDelete = await prisma.comment.findUnique({
        where: { id: commentId },
        include: { replyThreads: true },
      });

      if (commentToDelete) {
        // It's a Comment - check authorization
        if (commentToDelete.authorId !== userId) {
          return NextResponse.json(
            { message: "You are not authorized to delete this comment." },
            { status: 403 }
          );
        }

        // Count replies to decrement
        let commentsDeletedCount = 1;
        if (
          commentToDelete.replyThreads &&
          commentToDelete.replyThreads.length > 0
        ) {
          // Count all nested replies recursively
          const countNestedReplies = async (replies) => {
            let count = replies.length;
            for (const reply of replies) {
              const nestedReplies = await prisma.reply.findMany({
                where: { parentId: reply.id },
              });
              count += await countNestedReplies(nestedReplies);
            }
            return count;
          };
          commentsDeletedCount += await countNestedReplies(
            commentToDelete.replyThreads
          );
        }

        await prisma.comment.delete({
          where: { id: commentId },
        });

        // Get current count and ensure we don't go negative
        const currentPost = await prisma.post.findUnique({
          where: { id: commentToDelete.postId },
          select: { commentsCount: true },
        });
        const newCount = Math.max(
          0,
          (currentPost?.commentsCount || 0) - commentsDeletedCount
        );

        await prisma.post.update({
          where: { id: commentToDelete.postId },
          data: { commentsCount: newCount },
        });

        return NextResponse.json(
          { message: "Comment deleted successfully." },
          { status: 200 }
        );
      }

      // If not a Comment, try to find as a Reply
      const replyToDelete = await prisma.reply.findUnique({
        where: { id: commentId },
        include: { replies: true },
      });

      if (!replyToDelete) {
        return NextResponse.json(
          { message: "Comment or reply not found." },
          { status: 404 }
        );
      }

      if (replyToDelete.authorId !== userId) {
        return NextResponse.json(
          { message: "You are not authorized to delete this reply." },
          { status: 403 }
        );
      }

      // Count nested replies
      let repliesDeletedCount = 1;
      const countNestedReplies = async (replies) => {
        let count = replies.length;
        for (const reply of replies) {
          const nestedReplies = await prisma.reply.findMany({
            where: { parentId: reply.id },
          });
          count += await countNestedReplies(nestedReplies);
        }
        return count;
      };
      if (replyToDelete.replies && replyToDelete.replies.length > 0) {
        repliesDeletedCount += await countNestedReplies(replyToDelete.replies);
      }

      await prisma.reply.delete({
        where: { id: commentId },
      });

      // Get current count and ensure we don't go negative
      const currentPost = await prisma.post.findUnique({
        where: { id: postId },
        select: { commentsCount: true },
      });
      const newCount = Math.max(
        0,
        (currentPost?.commentsCount || 0) - repliesDeletedCount
      );

      await prisma.post.update({
        where: { id: postId },
        data: { commentsCount: newCount },
      });

      return NextResponse.json(
        { message: "Reply deleted successfully." },
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

      // If parentId is provided, this is a nested reply (reply to a reply)
      let notifyUserId = parentComment.authorId;

      if (parentId) {
        // Verify the parent reply exists and belongs to this comment
        const parentReply = await prisma.reply.findFirst({
          where: {
            id: parentId,
            commentId: commentId,
          },
          select: { authorId: true },
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

        // Notify the parent reply author instead of the comment author
        notifyUserId = parentReply.authorId;
      }

      // Create reply using the Reply model (not Comment) for consistency
      const newReply = await prisma.reply.create({
        data: {
          content: commentContent,
          authorId: userId,
          commentId: commentId,
          ...(parentId ? { parentId: parentId } : {}), // Add parentId for nested replies
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      await prisma.post.update({
        where: { id: postId },
        data: { commentsCount: { increment: 1 } },
      });

      // --- Notification logic for replies ---
      // Notify the parent comment/reply author if not self
      if (notifyUserId && notifyUserId !== userId) {
        await prisma.notification.create({
          data: {
            recipientId: notifyUserId,
            type: "POST_COMMENT",
            message: `${session.user.name || "Someone"} replied to your ${
              parentId ? "reply" : "comment"
            }.`,
            senderId: userId,
            targetId: postId,
            read: false,
          },
        });
      }

      // Format the reply to match frontend expectations
      const formattedReply = {
        id: newReply.id,
        content: newReply.content,
        createdAt: newReply.createdAt,
        likes: 0,
        parentId: newReply.parentId,
        user: {
          id: newReply.author.id,
          name: newReply.author.name,
          imageUrl:
            newReply.author.image ||
            `https://placehold.co/32x32/3B82F6/FFFFFF?text=${
              newReply.author.name ? newReply.author.name[0].toUpperCase() : "U"
            }`,
        },
        replies: [],
      };

      return NextResponse.json(
        { message: "Reply added successfully.", reply: formattedReply },
        { status: 201 }
      );
    } else if (action === "delete_post") {
      // --- Delete post ---
      if (!postId) {
        return NextResponse.json(
          { message: "Post ID is required for deleting a post." },
          { status: 400 }
        );
      }
      // Only allow author to delete
      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (!post) {
        return NextResponse.json(
          { message: "Post not found." },
          { status: 404 }
        );
      }
      if (post.authorId !== userId) {
        return NextResponse.json(
          { message: "Not authorized to delete this post." },
          { status: 403 }
        );
      }
      await prisma.post.delete({ where: { id: postId } });
      return NextResponse.json(
        { message: "Post deleted successfully." },
        { status: 200 }
      );
    } else if (action === "pin" || action === "unpin") {
      if (!postId) {
        return NextResponse.json(
          { message: "Post ID is required." },
          { status: 400 }
        );
      }
      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (!post) {
        return NextResponse.json(
          { message: "Post not found." },
          { status: 404 }
        );
      }
      if (post.authorId !== userId) {
        return NextResponse.json(
          { message: "Not authorized." },
          { status: 403 }
        );
      }

      await prisma.post.update({
        where: { id: postId },
        data: { isPinned: action === "pin" },
      });

      return NextResponse.json(
        { message: `Post ${action}ned successfully.` },
        { status: 200 }
      );
    } else if (action === "vote") {
      if (!postId || !optionId) {
        return NextResponse.json(
          { message: "Post ID and Option ID are required." },
          { status: 400 }
        );
      }

      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { expiresAt: true },
      });
      if (post && post.expiresAt && new Date() > new Date(post.expiresAt)) {
        return NextResponse.json(
          { message: "Poll has expired." },
          { status: 400 }
        );
      }

      const existingVote = await prisma.pollVote.findFirst({
        where: { postId, userId },
      });

      if (existingVote) {
        if (existingVote.optionId !== optionId) {
          await prisma.pollVote.update({
            where: { id: existingVote.id },
            data: { optionId },
          });
        }
      } else {
        await prisma.pollVote.create({
          data: { postId, userId, optionId },
        });
      }

      return NextResponse.json({ message: "Vote recorded." }, { status: 200 });
    } else if (action === "retract_vote") {
      if (!postId) {
        return NextResponse.json(
          { message: "Post ID is required." },
          { status: 400 }
        );
      }

      const existingVote = await prisma.pollVote.findFirst({
        where: { postId, userId },
      });

      if (existingVote) {
        await prisma.pollVote.delete({ where: { id: existingVote.id } });
      }
      return NextResponse.json({ message: "Vote retracted." }, { status: 200 });
    } else if (action === "save") {
      if (!postId) {
        return NextResponse.json(
          { message: "Post ID is required." },
          { status: 400 }
        );
      }
      // Check if already saved
      const existingSave = await prisma.savedPost.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (!existingSave) {
        await prisma.savedPost.create({
          data: { userId, postId },
        });
      }
      return NextResponse.json({ message: "Post saved." }, { status: 200 });
    } else if (action === "unsave") {
      if (!postId) {
        return NextResponse.json(
          { message: "Post ID is required." },
          { status: 400 }
        );
      }
      const existingSave = await prisma.savedPost.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (existingSave) {
        await prisma.savedPost.delete({ where: { id: existingSave.id } });
      }
      return NextResponse.json({ message: "Post unsaved." }, { status: 200 });
    } else if (action === "share") {
      if (!postId) {
        return NextResponse.json(
          { message: "Post ID is required." },
          { status: 400 }
        );
      }

      await prisma.post.update({
        where: { id: postId },
        data: { sharesCount: { increment: 1 } },
      });

      return NextResponse.json(
        { message: "Share count updated." },
        { status: 200 }
      );
    } else if (action === "report") {
      const { targetId, targetType, reason } = requestBody;
      if (!targetId || !targetType) {
        return NextResponse.json(
          { message: "Target ID and type are required." },
          { status: 400 }
        );
      }

      await prisma.report.create({
        data: {
          reporterId: userId,
          targetId,
          targetType,
          reason,
        },
      });
      return NextResponse.json(
        { message: "Report submitted." },
        { status: 200 }
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
