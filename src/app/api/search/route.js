// src/app/api/search/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * Unified Search API
 * 
 * GET /api/search?q=<query>&type=<all|users|posts|groups>&limit=10&offset=0
 *     &dateFrom=<ISO>&dateTo=<ISO>&postType=<post|poll|reel|news>
 *     &hasMedia=<true|false>&groupPrivacy=<Public|Private>&sort=<relevance|recent|popular>
 */

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const query = searchParams.get("q")?.trim() || "";
    const type = searchParams.get("type") || "all";
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const postType = searchParams.get("postType");
    const hasMedia = searchParams.get("hasMedia");
    const groupPrivacy = searchParams.get("groupPrivacy");
    const sort = searchParams.get("sort") || "relevance";

    // Validate query
    if (!query || query.length < 2) {
      return NextResponse.json(
        { message: "Search query must be at least 2 characters." },
        { status: 400 }
      );
    }

    // Get user's connections for privacy filtering
    const userConnections = await prisma.connectionRequest.findMany({
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

    const connectedUserIds = new Set();
    userConnections.forEach((conn) => {
      if (conn.senderId !== userId) connectedUserIds.add(conn.senderId);
      if (conn.receiverId !== userId) connectedUserIds.add(conn.receiverId);
    });
    const friendIds = Array.from(connectedUserIds);

    // Get user's group memberships for group privacy
    const userGroupMemberships = await prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });
    const memberGroupIds = userGroupMemberships.map((m) => m.groupId);

    // Prepare search term for case-insensitive matching
    const searchTermLower = query.toLowerCase();

    // Results object
    const results = {
      users: { results: [], total: 0, hasMore: false },
      posts: { results: [], total: 0, hasMore: false },
      groups: { results: [], total: 0, hasMore: false },
      query,
      totalResults: 0,
    };

    // Search Users
    if (type === "all" || type === "users") {
      const usersResult = await searchUsers({
        query: searchTermLower,
        userId,
        friendIds,
        limit: type === "all" ? 5 : limit,
        offset: type === "all" ? 0 : offset,
        sort,
      });
      results.users = usersResult;
    }

    // Search Posts
    if (type === "all" || type === "posts") {
      const postsResult = await searchPosts({
        query: searchTermLower,
        userId,
        friendIds,
        limit: type === "all" ? 5 : limit,
        offset: type === "all" ? 0 : offset,
        dateFrom,
        dateTo,
        postType,
        hasMedia: hasMedia === "true",
        sort,
      });
      results.posts = postsResult;
    }

    // Search Groups
    if (type === "all" || type === "groups") {
      const groupsResult = await searchGroups({
        query: searchTermLower,
        userId,
        memberGroupIds,
        limit: type === "all" ? 5 : limit,
        offset: type === "all" ? 0 : offset,
        groupPrivacy,
        sort,
      });
      results.groups = groupsResult;
    }

    results.totalResults =
      results.users.total + results.posts.total + results.groups.total;

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { message: "Failed to perform search.", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Search Users
 * Searches by: name, headline, bio, location, skills, job title, company
 */
async function searchUsers({ query, userId, friendIds, limit, offset, sort }) {
  // Build the where clause for user search
  const whereClause = {
    AND: [
      { isBanned: false },
      {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          {
            profile: {
              OR: [
                { headline: { contains: query, mode: "insensitive" } },
                { bio: { contains: query, mode: "insensitive" } },
                { location: { contains: query, mode: "insensitive" } },
              ],
            },
          },
          {
            profile: {
              skills: {
                some: {
                  name: { contains: query, mode: "insensitive" },
                },
              },
            },
          },
          {
            profile: {
              experiences: {
                some: {
                  OR: [
                    { title: { contains: query, mode: "insensitive" } },
                    { company: { contains: query, mode: "insensitive" } },
                  ],
                },
              },
            },
          },
        ],
      },
    ],
  };

  // Get total count
  const total = await prisma.user.count({ where: whereClause });

  // Determine sort order
  let orderBy = [];
  if (sort === "recent") {
    orderBy = [{ createdAt: "desc" }];
  } else {
    // For relevance and popular, we'll sort by connection count (as proxy for popularity)
    orderBy = [{ createdAt: "desc" }];
  }

  // Fetch users
  const users = await prisma.user.findMany({
    where: whereClause,
    include: {
      profile: {
        include: {
          skills: { take: 5 },
          experiences: {
            take: 1,
            orderBy: { startDate: "desc" },
            where: { isCurrent: true },
          },
        },
      },
      _count: {
        select: {
          sentConnectionRequests: {
            where: { status: "ACCEPTED" },
          },
          receivedConnectionRequests: {
            where: { status: "ACCEPTED" },
          },
        },
      },
    },
    orderBy,
    skip: offset,
    take: limit + 1,
  });

  const hasMore = users.length > limit;
  const usersToReturn = hasMore ? users.slice(0, limit) : users;

  // Calculate mutual connections for each user
  const formattedUsers = await Promise.all(
    usersToReturn.map(async (user) => {
      // Get this user's connections
      const userConns = await prisma.connectionRequest.findMany({
        where: {
          OR: [
            { senderId: user.id, status: "ACCEPTED" },
            { receiverId: user.id, status: "ACCEPTED" },
          ],
        },
        select: { senderId: true, receiverId: true },
      });

      const userFriendIds = new Set();
      userConns.forEach((conn) => {
        if (conn.senderId !== user.id) userFriendIds.add(conn.senderId);
        if (conn.receiverId !== user.id) userFriendIds.add(conn.receiverId);
      });

      // Count mutual connections
      const mutualCount = friendIds.filter((id) => userFriendIds.has(id)).length;

      // Check connection status with current user
      const connectionWithCurrentUser = await prisma.connectionRequest.findFirst({
        where: {
          OR: [
            { senderId: userId, receiverId: user.id },
            { senderId: user.id, receiverId: userId },
          ],
        },
      });

      let connectionStatus = "NOT_CONNECTED";
      if (connectionWithCurrentUser) {
        if (connectionWithCurrentUser.status === "ACCEPTED") {
          connectionStatus = "CONNECTED";
        } else if (connectionWithCurrentUser.status === "PENDING") {
          connectionStatus =
            connectionWithCurrentUser.senderId === userId
              ? "PENDING_SENT"
              : "PENDING_RECEIVED";
        }
      }

      const currentExperience = user.profile?.experiences?.[0];

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        imageUrl:
          user.profile?.profilePictureUrl ||
          user.image ||
          `https://placehold.co/100x100/3B82F6/ffffff?text=${
            user.name ? user.name[0].toUpperCase() : "U"
          }`,
        headline: user.profile?.headline || null,
        bio: user.profile?.bio || null,
        location: user.profile?.location || null,
        skills: (user.profile?.skills || []).map((s) => s.name),
        currentPosition: currentExperience
          ? `${currentExperience.title} at ${currentExperience.company}`
          : null,
        connectionCount:
          user._count.sentConnectionRequests +
          user._count.receivedConnectionRequests,
        mutualConnections: mutualCount,
        connectionStatus,
        isCurrentUser: user.id === userId,
      };
    })
  );

  // Sort by relevance (mutual connections + connection count) if relevance sort
  if (sort === "relevance" || sort === "popular") {
    formattedUsers.sort((a, b) => {
      const scoreA = a.mutualConnections * 10 + a.connectionCount;
      const scoreB = b.mutualConnections * 10 + b.connectionCount;
      return scoreB - scoreA;
    });
  }

  return {
    results: formattedUsers,
    total,
    hasMore,
  };
}

/**
 * Search Posts
 * Searches by: content, title, comments, tagged users
 * Respects visibility settings
 */
async function searchPosts({
  query,
  userId,
  friendIds,
  limit,
  offset,
  dateFrom,
  dateTo,
  postType,
  hasMedia,
  sort,
}) {
  // Build base where clause for post content search
  const contentSearchCondition = {
    OR: [
      { content: { contains: query, mode: "insensitive" } },
      { title: { contains: query, mode: "insensitive" } },
      {
        comments: {
          some: {
            content: { contains: query, mode: "insensitive" },
          },
        },
      },
      {
        taggedFriends: {
          some: {
            user: {
              name: { contains: query, mode: "insensitive" },
            },
          },
        },
      },
      {
        author: {
          name: { contains: query, mode: "insensitive" },
        },
      },
    ],
  };

  // Build visibility filter
  const visibilityFilter = {
    OR: [
      { authorId: userId }, // User can see their own posts
      { visibility: "PUBLIC" },
      {
        AND: [
          { visibility: "FRIENDS" },
          { authorId: { in: friendIds } },
        ],
      },
      {
        AND: [
          { visibility: "SPECIFIC_FRIENDS" },
          { allowedViewers: { some: { userId } } },
        ],
      },
    ],
  };

  // Build filters
  const filters = [];

  if (dateFrom) {
    filters.push({ createdAt: { gte: new Date(dateFrom) } });
  }
  if (dateTo) {
    filters.push({ createdAt: { lte: new Date(dateTo) } });
  }
  if (postType) {
    if (postType === "poll") {
      filters.push({ pollOptions: { some: {} } });
    } else if (postType === "reel") {
      filters.push({ isReel: true });
    } else {
      filters.push({ type: postType });
    }
  }
  if (hasMedia) {
    filters.push({
      OR: [
        { imageUrl: { not: null } },
        { videoUrl: { not: null } },
        { imageUrls: { isEmpty: false } },
      ],
    });
  }

  // Combine all conditions
  const whereClause = {
    AND: [contentSearchCondition, visibilityFilter, ...filters],
  };

  // Get total count
  const total = await prisma.post.count({ where: whereClause });

  // Determine sort order
  let orderBy = [];
  if (sort === "recent") {
    orderBy = [{ createdAt: "desc" }];
  } else if (sort === "popular") {
    orderBy = [{ likesCount: "desc" }, { commentsCount: "desc" }];
  } else {
    // Relevance - sort by engagement + recency
    orderBy = [{ likesCount: "desc" }, { createdAt: "desc" }];
  }

  // Fetch posts
  const posts = await prisma.post.findMany({
    where: whereClause,
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
      taggedFriends: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      pollOptions: {
        include: {
          _count: { select: { votes: true } },
        },
      },
      group: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
    },
    orderBy,
    skip: offset,
    take: limit + 1,
  });

  const hasMore = posts.length > limit;
  const postsToReturn = hasMore ? posts.slice(0, limit) : posts;

  // Check if current user liked each post
  const postIds = postsToReturn.map((p) => p.id);
  const userLikes = await prisma.postLike.findMany({
    where: {
      userId,
      postId: { in: postIds },
    },
    select: { postId: true, type: true },
  });
  const userLikesMap = new Map(userLikes.map((l) => [l.postId, l.type]));

  // Check if current user saved each post
  const userSaves = await prisma.savedPost.findMany({
    where: {
      userId,
      postId: { in: postIds },
    },
    select: { postId: true },
  });
  const userSavesSet = new Set(userSaves.map((s) => s.postId));

  const formattedPosts = postsToReturn.map((post) => {
    // Create content snippet with context around the match
    let snippet = post.content || "";
    if (snippet.length > 200) {
      const matchIndex = snippet.toLowerCase().indexOf(query.toLowerCase());
      if (matchIndex > 50) {
        snippet = "..." + snippet.substring(matchIndex - 50);
      }
      if (snippet.length > 200) {
        snippet = snippet.substring(0, 200) + "...";
      }
    }

    return {
      id: post.id,
      content: post.content,
      snippet,
      title: post.title,
      imageUrl: post.imageUrl,
      imageUrls: post.imageUrls || [],
      videoUrl: post.videoUrl,
      thumbnailUrl: post.thumbnailUrl,
      type: post.type,
      isReel: post.isReel,
      visibility: post.visibility,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: {
        id: post.author.id,
        name: post.author.name,
        imageUrl:
          post.author.profile?.profilePictureUrl ||
          post.author.image ||
          `https://placehold.co/40x40/3B82F6/ffffff?text=${
            post.author.name ? post.author.name[0].toUpperCase() : "U"
          }`,
        headline: post.author.profile?.headline || null,
      },
      taggedFriends: post.taggedFriends.map((tf) => ({
        id: tf.user.id,
        name: tf.user.name,
      })),
      group: post.group,
      likesCount: post.likesCount,
      commentsCount: post._count.comments,
      sharesCount: post.sharesCount || 0,
      isPoll: post.pollOptions.length > 0,
      pollOptions: post.pollOptions.map((opt) => ({
        id: opt.id,
        text: opt.text,
        votes: opt._count.votes,
      })),
      currentUserReaction: userLikesMap.get(post.id) || null,
      isSaved: userSavesSet.has(post.id),
      isOwnPost: post.authorId === userId,
    };
  });

  return {
    results: formattedPosts,
    total,
    hasMore,
  };
}

/**
 * Search Groups
 * Searches by: name, description
 * Shows public groups and private groups user is a member of
 */
async function searchGroups({
  query,
  userId,
  memberGroupIds,
  limit,
  offset,
  groupPrivacy,
  sort,
}) {
  // Build content search condition
  const contentSearchCondition = {
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ],
  };

  // Build privacy filter - can see public groups OR private groups they're a member of
  const privacyFilter = {
    OR: [
      { privacy: "Public" },
      { id: { in: memberGroupIds } },
    ],
  };

  // Additional privacy filter from query params
  const filters = [];
  if (groupPrivacy) {
    filters.push({ privacy: groupPrivacy });
  }

  // Combine conditions
  const whereClause = {
    AND: [contentSearchCondition, privacyFilter, ...filters],
  };

  // Get total count
  const total = await prisma.group.count({ where: whereClause });

  // Determine sort order
  let orderBy = [];
  if (sort === "recent") {
    orderBy = [{ createdAt: "desc" }];
  } else {
    // Popular/relevance - sort by member count
    orderBy = [{ createdAt: "desc" }];
  }

  // Fetch groups
  const groups = await prisma.group.findMany({
    where: whereClause,
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      _count: {
        select: { members: true, posts: true, discussions: true },
      },
    },
    orderBy,
    skip: offset,
    take: limit + 1,
  });

  const hasMore = groups.length > limit;
  const groupsToReturn = hasMore ? groups.slice(0, limit) : groups;

  // Get membership status for each group
  const groupIds = groupsToReturn.map((g) => g.id);
  const userMemberships = await prisma.groupMember.findMany({
    where: {
      userId,
      groupId: { in: groupIds },
    },
    select: { groupId: true, role: true },
  });
  const membershipMap = new Map(userMemberships.map((m) => [m.groupId, m.role]));

  // Check pending join requests
  const pendingRequests = await prisma.groupJoinRequest.findMany({
    where: {
      userId,
      groupId: { in: groupIds },
      status: "PENDING",
    },
    select: { groupId: true },
  });
  const pendingRequestSet = new Set(pendingRequests.map((r) => r.groupId));

  const formattedGroups = groupsToReturn.map((group) => {
    const membershipRole = membershipMap.get(group.id);
    let membershipStatus = "NOT_MEMBER";
    if (membershipRole) {
      membershipStatus = membershipRole; // ADMIN, MODERATOR, or MEMBER
    } else if (pendingRequestSet.has(group.id)) {
      membershipStatus = "PENDING";
    }

    // Create description snippet
    let descriptionSnippet = group.description || "";
    if (descriptionSnippet.length > 150) {
      descriptionSnippet = descriptionSnippet.substring(0, 150) + "...";
    }

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      descriptionSnippet,
      coverImage: group.coverImage,
      privacy: group.privacy,
      createdAt: group.createdAt,
      creator: {
        id: group.creator.id,
        name: group.creator.name,
        imageUrl: group.creator.image,
      },
      memberCount: group._count.members,
      postCount: group._count.posts,
      discussionCount: group._count.discussions,
      membershipStatus,
      isCreator: group.creatorId === userId,
    };
  });

  // Sort by member count for popular/relevance
  if (sort === "popular" || sort === "relevance") {
    formattedGroups.sort((a, b) => b.memberCount - a.memberCount);
  }

  return {
    results: formattedGroups,
    total,
    hasMore,
  };
}
