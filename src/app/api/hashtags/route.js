import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/hashtags - Search hashtags or get trending
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const type = searchParams.get("type") || "trending"; // trending, search
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    let hashtags;

    if (type === "search" && query) {
      // Search hashtags by name
      hashtags = await prisma.hashtag.findMany({
        where: {
          name: {
            contains: query.toLowerCase(),
            mode: "insensitive",
          },
        },
        orderBy: { usageCount: "desc" },
        take: limit,
        select: {
          id: true,
          name: true,
          usageCount: true,
        },
      });
    } else {
      // Get trending hashtags - simply get the most used ones
      // First try to get hashtags that were recently used
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      try {
        // Try to find hashtags used in recent posts
        hashtags = await prisma.hashtag.findMany({
          where: {
            posts: {
              some: {
                post: {
                  createdAt: { gte: sevenDaysAgo },
                },
              },
            },
          },
          orderBy: { usageCount: "desc" },
          take: limit,
          select: {
            id: true,
            name: true,
            usageCount: true,
          },
        });
      } catch (e) {
        // If the nested query fails, fall back to simple query
        console.warn("Nested query failed, using fallback:", e.message);
        hashtags = [];
      }

      // If not enough trending, fill with overall popular
      if (hashtags.length < limit) {
        const additionalHashtags = await prisma.hashtag.findMany({
          where: {
            id: { notIn: hashtags.map((h) => h.id) },
          },
          orderBy: { usageCount: "desc" },
          take: limit - hashtags.length,
          select: {
            id: true,
            name: true,
            usageCount: true,
          },
        });
        hashtags = [...hashtags, ...additionalHashtags];
      }
    }

    return NextResponse.json({ hashtags });
  } catch (error) {
    console.error("Error fetching hashtags:", error.message, error.stack);
    return NextResponse.json(
      { error: "Failed to fetch hashtags", details: error.message },
      { status: 500 }
    );
  }
}
